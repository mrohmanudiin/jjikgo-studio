const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticate, requireRole, branchScope } = require('../middleware/auth');

// Shift management — cashier only (branch-scoped)
router.post('/start', authenticate, requireRole(['cashier', 'admin']), branchScope, shiftController.startShift);
router.post('/:id/end', authenticate, requireRole(['cashier', 'admin']), branchScope, shiftController.endShift);
router.get('/current', authenticate, requireRole(['cashier', 'admin']), branchScope, shiftController.getCurrentShift);
router.get('/history', authenticate, requireRole(['cashier', 'admin']), branchScope, shiftController.getShiftHistory);
router.post('/expenses', authenticate, requireRole(['cashier', 'admin']), branchScope, shiftController.addExpense);

module.exports = router;

