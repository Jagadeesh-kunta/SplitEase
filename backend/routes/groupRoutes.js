const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/groups
// @desc    Create a new group (creator is auto-added as a member)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Combine creator + any other selected members, removing duplicates
    const members = Array.from(new Set([req.user._id.toString(), ...(memberIds || [])]));

    const group = await Group.create({
      name,
      description,
      members,
      createdBy: req.user._id,
    });

    const populatedGroup = await Group.findById(group._id).populate('members', 'name email');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Create group error:', error.message);
    res.status(500).json({ message: 'Server error while creating group' });
  }
});

// @route   GET /api/groups
// @desc    Get all groups the logged-in user belongs to
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error.message);
    res.status(500).json({ message: 'Server error while fetching groups' });
  }
});

// @route   GET /api/groups/:id
// @desc    Get a single group's details (only if user is a member)
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error.message);
    res.status(500).json({ message: 'Server error while fetching group' });
  }
});

// @route   PUT /api/groups/:id/members
// @desc    Add a member to an existing group
// @access  Private
router.put('/:id/members', protect, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((member) => member.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const alreadyMember = group.members.some((member) => member.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(group._id).populate('members', 'name email');

    // Notify everyone in this group's room in real-time
    req.io.to(req.params.id).emit('memberAdded', updatedGroup);

    res.json(updatedGroup);
  } catch (error) {
    console.error('Add member error:', error.message);
    res.status(500).json({ message: 'Server error while adding member' });
  }
});

// @route   DELETE /api/groups/:id
// @desc    Delete a group (only the creator can delete it)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can delete this group' });
    }

    await Expense.deleteMany({ group: group._id });
    await group.deleteOne();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error.message);
    res.status(500).json({ message: 'Server error while deleting group' });
  }
});

module.exports = router;
