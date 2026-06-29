const mongoose = require('mongoose');

// Each expense is paid by one person, but split among multiple members.
// "splitAmong" stores exactly how much each member owes for THIS expense.
const splitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    splitAmong: {
      type: [splitSchema],
      required: true,
      validate: {
        validator: function (splits) {
          return splits.length > 0;
        },
        message: 'Expense must be split among at least one member',
      },
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
