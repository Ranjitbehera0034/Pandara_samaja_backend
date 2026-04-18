const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { requireAuthAdmin } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// All routes here require admin authentication
router.use(requireAuthAdmin);

/**
 * List expenses with filters
 * GET /api/v1/admin/expenses?category=hosting&startDate=2024-01-01
 */
router.get('/', expenseController.getExpenses);

/**
 * Get expense summary statistics
 * GET /api/v1/admin/expenses/stats
 */
router.get('/stats', expenseController.getExpenseStats);

/**
 * Add a new expense record with optional attachment
 * POST /api/v1/admin/expenses
 */
router.post('/', upload.single('attachment'), expenseController.addExpense);

/**
 * Update an existing expense record
 * PUT /api/v1/admin/expenses/:id
 */
router.put('/:id', upload.single('attachment'), expenseController.updateExpense);

/**
 * Delete an expense record
 * DELETE /api/v1/admin/expenses/:id
 */
router.delete('/:id', expenseController.deleteExpense);

/**
 * Recurring Expenses (Subscriptions)
 */
router.get('/subscriptions', expenseController.getSubscriptions);
router.post('/subscriptions', expenseController.addSubscription);
router.post('/subscriptions/:id/pay', expenseController.paySubscription);
router.delete('/subscriptions/:id', expenseController.deleteSubscription);

module.exports = router;
