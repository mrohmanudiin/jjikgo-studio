const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate, requireRole, branchScope } = require('../middleware/auth');

// Queue viewing — all authenticated + branch scoped
router.get('/', authenticate, requireRole(['admin', 'cashier', 'staff']), branchScope, queueController.getQueue);

// Queue actions — staff only (branch scoped)
router.post('/call-next', authenticate, requireRole(['staff']), branchScope, queueController.callNextQueue);
router.post('/start', authenticate, requireRole(['staff']), branchScope, queueController.startSession);
router.post('/finish', authenticate, requireRole(['staff']), branchScope, queueController.finishSession);
router.post('/send-to-print', authenticate, requireRole(['staff']), branchScope, queueController.sendToPrint);
router.post('/skip', authenticate, requireRole(['staff']), branchScope, queueController.skipQueue);
router.patch('/note', authenticate, requireRole(['staff']), branchScope, queueController.updateQueueNotes);

// Public — QR queue tracking
router.get('/track/:queueNumber', queueController.trackQueue);

module.exports = router;
