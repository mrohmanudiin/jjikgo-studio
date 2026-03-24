const { db } = require('../config/db');
const { shifts, expenses, users } = require('../db/schema');
const { eq, and, sql } = require('drizzle-orm');

/**
 * POST /api/shifts/start
 * Access: CASHIER
 */
exports.startShift = async (req, res) => {
  try {
    const { branch_id, user_id, starting_cash } = req.body;
    
    // Safer parsing
    const parsedReqBranchId = parseInt(branch_id, 10);
    const parsedUserBranchId = parseInt(req.user?.branchId, 10);
    const effectiveBranchId = !isNaN(parsedReqBranchId) ? parsedReqBranchId : (!isNaN(parsedUserBranchId) ? parsedUserBranchId : null);

    const parsedReqUserId = parseInt(user_id, 10);
    const parsedAuthUserId = parseInt(req.user?.id, 10);
    const effectiveUserId = !isNaN(parsedReqUserId) ? parsedReqUserId : (!isNaN(parsedAuthUserId) ? parsedAuthUserId : null);

    // ── Validate branch ────────────────────────────────────────
    if (!effectiveBranchId) {
      return res.status(400).json({
        error: 'No branch assigned to your account. Ask an admin to assign you to a branch before starting a shift.'
      });
    }

    // ── Validate user ─────────────────────────────────────────
    if (!effectiveUserId) {
      return res.status(400).json({
        error: 'User ID is required. Please log in again.'
      });
    }

    // ── Check for existing open shift ──────────────────────────
    const openShift = await db.query.shifts.findFirst({
      where: and(
        eq(shifts.branchId, effectiveBranchId),
        eq(shifts.status, 'open')
      ),
    });

    if (openShift) {
      // Return the existing shift instead of an error — idempotent behaviour
      const result = await db.query.shifts.findFirst({
        where: eq(shifts.id, openShift.id),
        with: { user: { columns: { fullName: true, username: true } } },
      });
      return res.json({
        ...result,
        user: result.user ? { full_name: result.user.fullName, username: result.user.username } : null,
        _alreadyOpen: true,
      });
    }

    // ── Insert new shift ─────────────────────────────────────────
    const [shift] = await db.insert(shifts).values({
      branchId: effectiveBranchId,
      userId: effectiveUserId,
      startingCash: parseFloat(starting_cash) || 0,
      status: 'open',
    }).returning();

    // Fetch with user info
    const result = await db.query.shifts.findFirst({
      where: eq(shifts.id, shift.id),
      with: {
        user: { columns: { fullName: true, username: true } },
      },
    });

    // Map to expected format
    res.json({
      ...result,
      user: result.user ? { full_name: result.user.fullName, username: result.user.username } : null,
    });
  } catch (error) {
    console.error('startShift error:', error);
    res.status(500).json({ error: 'Failed to start shift', detail: error.message });
  }
};

/**
 * POST /api/shifts/:id/end
 * Access: CASHIER
 */
exports.endShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { ending_cash } = req.body;

    const [shift] = await db.update(shifts)
      .set({
        endTime: new Date(),
        endingCash: parseFloat(ending_cash) || 0,
        status: 'closed',
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(shift);
  } catch (error) {
    console.error('endShift error:', error);
    res.status(500).json({ error: 'Failed to end shift' });
  }
};

/**
 * GET /api/shifts/current
 * Access: CASHIER (branch-scoped)
 */
exports.getCurrentShift = async (req, res) => {
  try {
    const branchId = parseInt(req.query.branch_id || req.branchFilter || req.user?.branchId);

    const shift = await db.query.shifts.findFirst({
      where: and(
        eq(shifts.branchId, branchId),
        eq(shifts.status, 'open')
      ),
      with: {
        user: { columns: { fullName: true, username: true } },
        expenses: true,
      },
    });

    if (!shift) {
      return res.json(null);
    }

    // Map to expected format
    res.json({
      ...shift,
      user: shift.user ? { full_name: shift.user.fullName, username: shift.user.username } : null,
    });
  } catch (error) {
    console.error('getCurrentShift error:', error);
    res.status(500).json({ error: 'Failed to get current shift' });
  }
};

/**
 * POST /api/shifts/expenses
 * Access: CASHIER
 */
exports.addExpense = async (req, res) => {
  try {
    const { shift_id, amount, description } = req.body;

    const [expense] = await db.insert(expenses).values({
      shiftId: parseInt(shift_id),
      amount: parseFloat(amount),
      description,
    }).returning();

    // Update total expenses in the shift
    await db.update(shifts)
      .set({
        totalExpenses: sql`${shifts.totalExpenses} + ${parseFloat(amount)}`,
      })
      .where(eq(shifts.id, parseInt(shift_id)));

    res.json(expense);
  } catch (error) {
    console.error('addExpense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
};

/**
 * GET /api/shifts/history
 * Access: CASHIER / ADMIN (branch-scoped)
 */
exports.getShiftHistory = async (req, res) => {
  try {
    const branchId = parseInt(req.query.branch_id || req.branchFilter || req.user?.branchId);
    const { date_from, date_to } = req.query;

    const conditions = [
      eq(shifts.branchId, branchId),
      eq(shifts.status, 'closed')
    ];

    if (date_from) {
      const from = new Date(date_from);
      from.setHours(0, 0, 0, 0);
      conditions.push(gte(shifts.endTime, from));
    }

    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(shifts.endTime, to));
    }

    // We get the last 100 closed shifts within date range
    const history = await db.query.shifts.findMany({
      where: and(...conditions),
      orderBy: (shifts, { desc }) => [desc(shifts.endTime)],
      limit: 100,
      with: {
        user: { columns: { fullName: true, username: true } },
      },
    });

    res.json(history.map(shift => ({
      ...shift,
      user: shift.user ? { full_name: shift.user.fullName, username: shift.user.username } : null
    })));
  } catch (error) {
    console.error('getShiftHistory error:', error);
    res.status(500).json({ error: 'Failed to get shift history' });
  }
};
