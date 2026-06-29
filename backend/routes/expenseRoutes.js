const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');
const { calculateBalances, simplifyDebts } = require('../utils/settlementUtils');

const router = express.Router();

// Helper: verify the requesting user belongs to the group
async function verifyMembership(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) return { error: 'Group not found', status: 404 };

  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) return { error: 'You are not a member of this group', status: 403 };

  return { group };
}

// @route   POST /api/expenses
// @desc    Add a new expense to a group, split equally or custom
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { groupId, description, amount, paidBy, splitType, customSplits } = req.body;

    if (!groupId || !description || !amount) {
      return res.status(400).json({ message: 'groupId, description and amount are required' });
    }

    const { group, error, status } = await verifyMembership(groupId, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const payerId = paidBy || req.user._id;

    let splitAmong = [];

    if (splitType === 'custom') {
      // Expect customSplits = [{ user, amount }, ...] supplied by client
      if (!Array.isArray(customSplits) || customSplits.length === 0) {
        return res.status(400).json({ message: 'customSplits must be a non-empty array' });
      }

      const totalCustom = customSplits.reduce((sum, s) => sum + Number(s.amount), 0);
      // Allow a tiny rounding tolerance
      if (Math.abs(totalCustom - Number(amount)) > 0.05) {
        return res.status(400).json({
          message: `Custom split amounts (${totalCustom}) must add up to the total expense amount (${amount})`,
        });
      }

      splitAmong = customSplits.map((s) => ({ user: s.user, amount: Number(s.amount) }));
    } else {
      // Equal split among ALL group members by default
      const shareCount = group.members.length;
      const rawShare = Number(amount) / shareCount;
      const roundedShare = Math.round(rawShare * 100) / 100;

      splitAmong = group.members.map((memberId, index) => {
        // Give any leftover paise/cents to the last member so totals match exactly
        const isLast = index === shareCount - 1;
        const shareAmount = isLast
          ? Math.round((Number(amount) - roundedShare * (shareCount - 1)) * 100) / 100
          : roundedShare;
        return { user: memberId, amount: shareAmount };
      });
    }

    const expense = await Expense.create({
      group: groupId,
      description,
      amount,
      paidBy: payerId,
      splitAmong,
      splitType: splitType || 'equal',
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splitAmong.user', 'name email');

    // Real-time: notify everyone viewing this group
    req.io.to(groupId).emit('expenseAdded', populatedExpense);

    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error('Add expense error:', error.message);
    res.status(500).json({ message: 'Server error while adding expense' });
  }
});

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a group
// @access  Private
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const { error, status } = await verifyMembership(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splitAmong.user', 'name email')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error.message);
    res.status(500).json({ message: 'Server error while fetching expenses' });
  }
});

// @route   GET /api/expenses/group/:groupId/balances
// @desc    Get net balances + simplified settlement plan for a group
// @access  Private
router.get('/group/:groupId/balances', protect, async (req, res) => {
  try {
    const { group, error, status } = await verifyMembership(req.params.groupId, req.user._id);
    if (error) return res.status(status).json({ message: error });

    const fullGroup = await group.populate('members', 'name email');

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splitAmong.user', 'name email');

    const balances = calculateBalances(expenses, fullGroup.members);

    // Attach user info to each balance entry for easier frontend rendering
    const balancesWithUserInfo = fullGroup.members.map((member) => ({
      user: { _id: member._id, name: member.name, email: member.email },
      balance: balances[member._id.toString()] || 0,
    }));

    const settlementPlan = simplifyDebts({ ...balances });

    // Map settlement plan user IDs to readable user info
    const memberMap = {};
    fullGroup.members.forEach((m) => {
      memberMap[m._id.toString()] = { name: m.name, email: m.email };
    });

    const settlementPlanWithNames = settlementPlan.map((txn) => ({
      from: { _id: txn.from, ...memberMap[txn.from] },
      to: { _id: txn.to, ...memberMap[txn.to] },
      amount: txn.amount,
    }));

    res.json({
      balances: balancesWithUserInfo,
      settlementPlan: settlementPlanWithNames,
    });
  } catch (error) {
    console.error('Get balances error:', error.message);
    res.status(500).json({ message: 'Server error while calculating balances' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { error, status } = await verifyMembership(expense.group, req.user._id);
    if (error) return res.status(status).json({ message: error });

    await expense.deleteOne();

    req.io.to(expense.group.toString()).emit('expenseDeleted', { expenseId: req.params.id });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error.message);
    res.status(500).json({ message: 'Server error while deleting expense' });
  }
});

module.exports = router;
