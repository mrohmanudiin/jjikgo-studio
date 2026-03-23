const { db } = require('../config/db');
const { transactions, queues, themes } = require('../db/schema');
const { eq, and, desc, gte, lte, or } = require('drizzle-orm');
const { emitQueueUpdate } = require('../socket');

/**
 * GET /api/transactions
 * Access: ADMIN (optionally filtered by branch_id, date_from, date_to)
 *         CASHIER (auto branch-scoped)
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const conditions = [];

    // Branch filter
    if (req.branchFilter) {
      conditions.push(eq(transactions.branchId, req.branchFilter));
    }

    // Date from filter
    if (date_from) {
      const from = new Date(date_from);
      from.setHours(0, 0, 0, 0);
      conditions.push(gte(transactions.createdAt, from));
    }

    // Date to filter
    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(transactions.createdAt, to));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.query.transactions.findMany({
      where,
      with: {
        queue: { with: { theme: true } },
        theme: true,
        branch: { columns: { id: true, name: true } },
        user: { columns: { id: true, username: true, fullName: true } },
      },
      orderBy: [desc(transactions.createdAt)],
    });

    // Return each transaction (not flattened by queue) for admin view
    const formatted = result.map(tx => ({
      id: tx.id,
      invoice_number: tx.invoiceNumber,
      customer_name: tx.customerName,
      people_count: tx.peopleCount,
      theme: tx.theme?.name || '—',
      theme_id: tx.themeId,
      package: tx.packageName,
      addons: tx.addons || [],
      cafe_snacks: tx.cafeSnacks || [],
      promo: tx.promo,
      note: tx.note,
      total: tx.totalPrice,
      payment_method: tx.paymentMethod,
      status: tx.status,
      branch_id: tx.branchId,
      branch: tx.branch,
      user: tx.user,
      shift_id: tx.shiftId,
      created_at: tx.createdAt,
      queues: tx.queue?.map(q => ({
        id: q.id,
        queue_number: q.queueNumber,
        theme: q.theme?.name,
        status: q.status,
      })) || [],
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * POST /api/transactions
 * Access: CASHIER (auto-scoped to their branch)
 */
exports.createTransaction = async (req, res) => {
  try {
    const { sessions: sessionsList, branch_id, shift_id, user_id } = req.body;

    // ── Validate sessions ─────────────────────────────────────────
    if (!sessionsList || sessionsList.length === 0) {
      return res.status(400).json({ error: 'No sessions provided' });
    }

    // ── Validate branch ───────────────────────────────────────────
    const effectiveBranchId = parseInt(branch_id || req.user?.branchId);
    if (!effectiveBranchId) {
      return res.status(400).json({ error: 'Branch ID is required. Make sure you are logged in with a valid account.' });
    }

    // ── Resolve shift ─────────────────────────────────────────────
    let effectiveShiftId = null;
    if (shift_id) {
      // Caller provided a shift_id — verify it's real and open
      const { shifts } = require('../db/schema');
      const shift = await db.query.shifts.findFirst({
        where: and(eq(shifts.id, parseInt(shift_id)), eq(shifts.status, 'open')),
      });
      if (!shift) {
        return res.status(400).json({ error: 'The provided shift is not open or does not exist. Please start a new shift.' });
      }
      effectiveShiftId = shift.id;
    } else {
      // Auto-lookup: find the open shift for this branch
      const { shifts } = require('../db/schema');
      const openShift = await db.query.shifts.findFirst({
        where: and(eq(shifts.branchId, effectiveBranchId), eq(shifts.status, 'open')),
      });
      if (openShift) {
        effectiveShiftId = openShift.id;
      }
      // If still null, allow transaction without a shift (shift_id is nullable)
    }

    const createdSessions = [];
    const mainSession = sessionsList[0];
    const invoiceNumber = `JJ-${Date.now()}`;

    // Get current queue number for each theme today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [transaction] = await db.insert(transactions).values({
      invoiceNumber,
      branchId: effectiveBranchId,
      shiftId: effectiveShiftId,
      userId: user_id ? parseInt(user_id) : (req.user?.id || null),
      customerName: mainSession.customer_name || 'Walk-in',
      customerEmail: mainSession.customer_email || '',
      peopleCount: parseInt(mainSession.people_count) || 1,
      themeId: mainSession.theme_id === 'cafe' ? null : (parseInt(mainSession.theme_id) || null),
      packageName: mainSession.package || '',
      addons: mainSession.addons || [],
      cafeSnacks: mainSession.cafe_snacks || [],
      promo: mainSession.promo || null,
      note: mainSession.note || null,
      paymentMethod: mainSession.payment_method || 'Cash',
      totalPrice: parseFloat(mainSession.total) || 0,
      status: 'waiting',
    }).returning();

    for (const s of sessionsList) {
      if (s.theme_id === 'cafe') {
        // Cafe-only sessions don't create a queue
        createdSessions.push({
          ...s,
          id: `cafe-${transaction.id}`,
          session_id: `cafe-${transaction.id}`,
          order_id: invoiceNumber,
        });
        continue;
      }

      const tId = parseInt(s.theme_id);
      if (!tId) continue;

      // Auto-compute queue number: count today's queues for this theme + 1
      const { sql } = require('drizzle-orm');
      const existingCount = await db.select({ count: sql`count(*)` })
        .from(queues)
        .where(and(
          eq(queues.themeId, tId),
          gte(queues.createdAt, today)
        ));

      const qNum = (parseInt(existingCount[0]?.count) || 0) + 1;

      const [q] = await db.insert(queues).values({
        transactionId: transaction.id,
        themeId: tId,
        queueNumber: qNum,
        status: 'waiting',
      }).returning();

      createdSessions.push({
        ...s,
        id: String(q.id),
        session_id: String(q.id),
        queue_number: qNum,
        order_id: invoiceNumber,
      });
    }

    // Emit real-time update to the branch room
    const io = req.app.get('io');
    emitQueueUpdate(io, effectiveBranchId, 'new_transaction', {
      invoiceNumber,
      transaction,
      sessions: createdSessions,
    });

    res.status(201).json({ success: true, transaction, all_sessions: createdSessions });
  } catch (error) {
    console.error('createTransaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction', detail: error.message });
  }
};

/**
 * PUT /api/transactions/:id/status
 * Access: CASHIER, STAFF (branch-scoped)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updatedQueue] = await db.update(queues)
      .set({ status })
      .where(eq(queues.id, parseInt(id)))
      .returning();

    if (!updatedQueue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, updatedQueue.transactionId));

    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedQueue.transactionId),
      columns: { branchId: true },
    });

    const io = req.app.get('io');
    emitQueueUpdate(io, tx?.branchId, 'status_updated', updatedQueue);

    res.json(updatedQueue);
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/transactions/:id
 * Access: ADMIN
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const txId = parseInt(id);

    // Delete queues first
    await db.delete(queues).where(eq(queues.transactionId, txId));

    const [deleted] = await db.delete(transactions)
      .where(eq(transactions.id, txId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const io = req.app.get('io');
    emitQueueUpdate(io, deleted.branchId, 'transaction_deleted', { id: txId });

    res.json({ success: true, id: txId });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};
