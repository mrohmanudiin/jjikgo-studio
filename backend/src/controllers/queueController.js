const { db } = require('../config/db');
const { queues, transactions, themes, booths } = require('../db/schema');
const { eq, and, inArray, asc, gte, lt, count } = require('drizzle-orm');
const { emitQueueUpdate, emitPrintRequest } = require('../socket');

/**
 * GET /api/queue
 * Access: CASHIER, STAFF (branch-scoped), ADMIN
 */
exports.getQueue = async (req, res) => {
  try {
    const activeStatuses = ['waiting', 'called', 'in_session', 'print_requested', 'printing'];

    const result = await db.query.queues.findMany({
      where: inArray(queues.status, activeStatuses),
      with: {
        theme: true,
        transaction: true,
        booth: true,
      },
      orderBy: [asc(queues.createdAt)],
    });

    // Filter by branch if non-admin
    let filtered = result;
    if (req.branchFilter) {
      filtered = result.filter(q => q.transaction?.branchId === req.branchFilter);
    }

    // Group by theme name
    const groupedQueue = filtered.reduce((acc, queue) => {
      const themeName = queue.theme?.name || 'Unknown';
      if (!acc[themeName]) acc[themeName] = [];
      acc[themeName].push(queue);
      return acc;
    }, {});

    res.json(groupedQueue);
  } catch (error) {
    console.error('getQueue error:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
};

/**
 * POST /api/queue/call-next
 * Access: STAFF
 */
exports.callNextQueue = async (req, res) => {
  try {
    const { theme_id } = req.body;

    // Find next waiting queue for this theme, filtered by branch for non-admin
    const allWaiting = await db.query.queues.findMany({
      where: and(
        eq(queues.themeId, parseInt(theme_id)),
        eq(queues.status, 'waiting')
      ),
      with: { transaction: true, theme: true },
      orderBy: [asc(queues.createdAt)],
    });

    // Branch scope filter
    let nextQueue;
    if (req.branchFilter) {
      nextQueue = allWaiting.find(q => q.transaction?.branchId === req.branchFilter);
    } else {
      nextQueue = allWaiting[0];
    }

    if (!nextQueue) {
      return res.status(404).json({ message: 'No waiting queue found for this theme' });
    }

    const [updatedQueue] = await db.update(queues)
      .set({ status: 'called', updatedAt: new Date() })
      .where(eq(queues.id, nextQueue.id))
      .returning();

    await db.update(transactions)
      .set({ status: 'called' })
      .where(eq(transactions.id, updatedQueue.transactionId));

    const branchId = nextQueue.transaction?.branchId;
    const io = req.app.get('io');
    emitQueueUpdate(io, branchId, 'queue_called', {
      ...updatedQueue,
      theme: nextQueue.theme,
      transaction: nextQueue.transaction,
    });

    res.json(updatedQueue);
  } catch (error) {
    console.error('callNextQueue error:', error);
    res.status(500).json({ error: 'Failed to call next queue' });
  }
};

/**
 * POST /api/queue/start
 * Access: STAFF
 */
exports.startSession = async (req, res) => {
  try {
    const { queue_id, booth_id } = req.body;

    const updateData = { status: 'in_session' };
    if (booth_id) updateData.boothId = parseInt(booth_id);

    const [updatedQueue] = await db.update(queues)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(queues.id, parseInt(queue_id)))
      .returning();

    await db.update(transactions)
      .set({ status: 'in_session' })
      .where(eq(transactions.id, updatedQueue.transactionId));

    if (booth_id) {
      await db.update(booths)
        .set({ status: 'busy' })
        .where(eq(booths.id, parseInt(booth_id)));
    }

    // Determine branch for scoped emit
    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedQueue.transactionId),
      columns: { branchId: true },
    });

    const io = req.app.get('io');
    emitQueueUpdate(io, tx?.branchId, 'session_started', updatedQueue);

    res.json(updatedQueue);
  } catch (error) {
    console.error('startSession error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

/**
 * POST /api/queue/finish
 * Access: STAFF
 */
exports.finishSession = async (req, res) => {
  try {
    const { queue_id, booth_id } = req.body;

    const [updatedQueue] = await db.update(queues)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(queues.id, parseInt(queue_id)))
      .returning();

    await db.update(transactions)
      .set({ status: 'done' })
      .where(eq(transactions.id, updatedQueue.transactionId));

    if (booth_id) {
      await db.update(booths)
        .set({ status: 'available' })
        .where(eq(booths.id, parseInt(booth_id)));
    }

    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedQueue.transactionId),
      columns: { branchId: true },
    });

    const io = req.app.get('io');
    emitQueueUpdate(io, tx?.branchId, 'session_finished', updatedQueue);

    res.json(updatedQueue);
  } catch (error) {
    console.error('finishSession error:', error);
    res.status(500).json({ error: 'Failed to finish session' });
  }
};

/**
 * POST /api/queue/send-to-print
 * Access: STAFF
 */
exports.sendToPrint = async (req, res) => {
  try {
    const { queue_id } = req.body;

    const [updatedQueue] = await db.update(queues)
      .set({ status: 'print_requested', updatedAt: new Date() })
      .where(eq(queues.id, parseInt(queue_id)))
      .returning();

    await db.update(transactions)
      .set({ status: 'print_requested' })
      .where(eq(transactions.id, updatedQueue.transactionId));

    const txWithTheme = await db.query.queues.findFirst({
      where: eq(queues.id, updatedQueue.id),
      with: { transaction: true, theme: true },
    });

    const branchId = txWithTheme?.transaction?.branchId;
    const io = req.app.get('io');
    emitQueueUpdate(io, branchId, 'print_requested', txWithTheme);
    emitPrintRequest(io, branchId, txWithTheme);

    res.json(updatedQueue);
  } catch (error) {
    console.error('sendToPrint error:', error);
    res.status(500).json({ error: 'Failed to send print request' });
  }
};

/**
 * GET /api/queue/track/:queueNumber
 * Access: PUBLIC (for QR tracking)
 */
exports.trackQueue = async (req, res) => {
  try {
    const { queueNumber } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentQueues = await db.query.queues.findMany({
      where: gte(queues.createdAt, today),
      with: {
        theme: true,
        transaction: true,
      },
      orderBy: [asc(queues.createdAt)],
    });

    const targetQueue = recentQueues.find(q => {
      const formatted = `${q.theme?.prefix || 'T'}${String(q.queueNumber).padStart(2, '0')}`;
      return formatted.toUpperCase() === queueNumber.toUpperCase();
    });

    if (!targetQueue) {
      return res.status(404).json({ error: 'Queue not found for today.' });
    }

    const peopleAhead = recentQueues.filter(q =>
      q.themeId === targetQueue.themeId &&
      q.status === 'waiting' &&
      q.createdAt < targetQueue.createdAt
    ).length;

    res.json({
      queueNumber: queueNumber.toUpperCase(),
      customerName: targetQueue.transaction?.customerName,
      theme: targetQueue.theme?.name,
      people: targetQueue.transaction?.peopleCount,
      status: targetQueue.status === 'waiting_shoot' ? 'waiting' : targetQueue.status,
      peopleAhead: ['waiting', 'waiting_shoot'].includes(targetQueue.status) ? peopleAhead : 0,
      booth: `${targetQueue.theme?.name} Booth`,
    });
  } catch (error) {
    console.error('trackQueue error:', error);
    res.status(500).json({ error: 'Failed to track queue' });
  }
};

/**
 * POST /api/queue/skip
 * Access: STAFF
 */
exports.skipQueue = async (req, res) => {
  try {
    const { queue_id } = req.body;

    // Skip moves it to 'waiting' with an updated timestamp to put it at the end of the queue
    // OR just marks as 'cancelled'. Let's do 'cancelled' for now to match "no-show" requirement.
    const [updatedQueue] = await db.update(queues)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(queues.id, parseInt(queue_id)))
      .returning();

    await db.update(transactions)
      .set({ status: 'cancelled' })
      .where(eq(transactions.id, updatedQueue.transactionId));

    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedQueue.transactionId),
      columns: { branchId: true },
    });

    const io = req.app.get('io');
    emitQueueUpdate(io, tx?.branchId, 'queue_skipped', updatedQueue);

    res.json(updatedQueue);
  } catch (error) {
    console.error('skipQueue error:', error);
    res.status(500).json({ error: 'Failed to skip queue' });
  }
};

/**
 * PATCH /api/queue/note
 * Access: STAFF
 */
exports.updateQueueNotes = async (req, res) => {
  try {
    const { queue_id, note } = req.body;

    const [updatedQueue] = await db.update(queues)
      .set({ note, updatedAt: new Date() })
      .where(eq(queues.id, parseInt(queue_id)))
      .returning();

    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedQueue.transactionId),
      columns: { branchId: true },
    });

    const io = req.app.get('io');
    emitQueueUpdate(io, tx?.branchId, 'queue_noted', updatedQueue);

    res.json(updatedQueue);
  } catch (error) {
    console.error('updateQueueNotes error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};
