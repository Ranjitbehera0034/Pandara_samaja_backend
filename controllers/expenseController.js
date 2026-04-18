const Expense = require('../models/expenseModel');
const RecurringExpense = require('../models/recurringExpenseModel');
const { uploadToFirebase, UPLOAD_PATHS } = require('../utils/firebaseStorage');
const pool = require('../config/db');

/**
 * Internal helper for logging admin actions
 */
const logAdminAction = async (req, action, targetType, targetId, details = {}) => {
  try {
    const adminUsername = req.user ? req.user.username : 'system';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    await pool.query(
      'INSERT INTO admin_audit_logs (admin_username, action, target_type, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [adminUsername, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
};

/**
 * GET /api/v1/admin/expenses
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await Expense.findAll({
      category,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      expenses: result.rows,
      pagination: {
        total: result.total,
        page: parseInt(page),
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/expenses
 */
exports.addExpense = async (req, res, next) => {
  try {
    const { title, category, amount, description, payee, expense_date } = req.body;
    const adminUser = req.user.username;

    let attachment_url = null;
    if (req.file) {
      attachment_url = await uploadToFirebase(req.file, UPLOAD_PATHS.ADMIN_UPLOAD(adminUser, 'expenses'));
    }

    const { rows } = await Expense.create({
      title: title || description || 'N/A', // Fallback for various frontend versions
      category,
      amount: parseFloat(amount),
      description,
      payee: payee || title || 'N/A',
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      attachment_url,
      recorded_by: adminUser
    });

    const expense = rows[0];

    await logAdminAction(req, 'ADD_EXPENSE', 'Expense', expense.id, {
      title: expense.title,
      amount: expense.amount
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/expenses/:id
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (req.file) {
      updateData.attachment_url = await uploadToFirebase(req.file, UPLOAD_PATHS.ADMIN_UPLOAD(req.user.username, 'expenses'));
    }

    const result = await Expense.update(id, updateData);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    const expense = result.rows[0];

    await logAdminAction(req, 'UPDATE_EXPENSE', 'Expense', id, {
      title: expense.title
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/expenses/:id
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Expense.findById(id);

    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await Expense.remove(id);

    await logAdminAction(req, 'DELETE_EXPENSE', 'Expense', id, {
      title: existing.rows[0].title
    });

    res.json({
      success: true,
      message: 'Expense record deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/expenses/stats
 */
exports.getExpenseStats = async (req, res, next) => {
  try {
    const stats = await Expense.getStats();
    
    // Add bills due soon
    const dueSoon = await RecurringExpense.findDueSoon(7);
    stats.dueSoonCount = dueSoon.rowCount;
    stats.dueSoonBills = dueSoon.rows;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * --- Recurring Expenses (Subscriptions) ---
 */

exports.getSubscriptions = async (req, res, next) => {
  try {
    const result = await RecurringExpense.findAll();
    res.json({ success: true, subscriptions: result.rows });
  } catch (error) { next(error); }
};

exports.addSubscription = async (req, res, next) => {
  try {
    const result = await RecurringExpense.create(req.body);
    res.status(201).json({ success: true, subscription: result.rows[0] });
  } catch (error) { next(error); }
};

exports.paySubscription = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Get the subscription
    const subResult = await client.query('SELECT * FROM recurring_expenses WHERE id = $1', [id]);
    if (subResult.rowCount === 0) throw new Error('Subscription not found');
    const sub = subResult.rows[0];

    // 1. Create a regular expense record
    const adminUser = req.user.username;
    await client.query(`
        INSERT INTO expenses (title, category, amount, description, expense_date, recorded_by)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
    `, [sub.title, sub.category, sub.amount, `Automatic payment for ${sub.frequency} subscription`, adminUser]);

    // 2. Update next due date
    const interval = sub.frequency === 'yearly' ? '1 year' : '1 month';
    await client.query(`
        UPDATE recurring_expenses 
        SET next_due_date = next_due_date + interval '${interval}', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
    `, [id]);

    await client.query('COMMIT');

    await logAdminAction(req, 'PAY_SUBSCRIPTION', 'Subscription', id, { title: sub.title });

    res.json({ success: true, message: 'Subscription marked as paid' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

exports.deleteSubscription = async (req, res, next) => {
  try {
    await RecurringExpense.remove(req.params.id);
    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) { next(error); }
};
