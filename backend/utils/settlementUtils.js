/**
 * settlementUtils.js
 * ---------------------------------------------------------
 * This file contains the "brain" of SplitEase: given a list of
 * expenses in a group, it figures out:
 *   1. The net balance of every member (positive = owed money,
 *      negative = owes money)
 *   2. The minimum number of transactions required to settle
 *      all debts in the group (a classic greedy algorithm).
 * ---------------------------------------------------------
 */

/**
 * Calculate net balance for each member of a group based on expenses.
 * @param {Array} expenses - array of expense documents (populated with paidBy & splitAmong.user)
 * @param {Array} members - array of user documents (the group members)
 * @returns {Object} balances - map of userId -> net balance (Number)
 */
function calculateBalances(expenses, members) {
  // Initialize every member's balance to 0
  const balances = {};
  members.forEach((member) => {
    balances[member._id.toString()] = 0;
  });

  expenses.forEach((expense) => {
    const paidById = expense.paidBy._id
      ? expense.paidBy._id.toString()
      : expense.paidBy.toString();

    // The payer effectively "lent" the full amount
    balances[paidById] = (balances[paidById] || 0) + expense.amount;

    // Each person in splitAmong "owes" their share
    expense.splitAmong.forEach((split) => {
      const userId = split.user._id ? split.user._id.toString() : split.user.toString();
      balances[userId] = (balances[userId] || 0) - split.amount;
    });
  });

  // Round to 2 decimal places to avoid floating point dust (e.g. 9.999999999)
  Object.keys(balances).forEach((id) => {
    balances[id] = Math.round(balances[id] * 100) / 100;
  });

  return balances;
}

/**
 * Greedy debt-simplification algorithm.
 * Goal: settle all balances using the FEWEST number of transactions possible,
 * instead of everyone paying everyone individually.
 *
 * How it works:
 *  - Split members into creditors (owed money, balance > 0) and
 *    debtors (owe money, balance < 0).
 *  - Repeatedly match the person who owes the MOST with the person
 *    who is owed the MOST, settle as much as possible between them,
 *    and repeat until everyone is settled.
 *
 * This is the classic "min cash flow" problem — a great talking point
 * in interviews since it's a real greedy-algorithm application.
 *
 * @param {Object} balances - map of userId -> net balance
 * @returns {Array} transactions - array of { from, to, amount }
 */
function simplifyDebts(balances) {
  // Convert balances object into an array of { userId, amount } and filter out settled members
  const entries = Object.entries(balances)
    .map(([userId, amount]) => ({ userId, amount }))
    .filter((entry) => Math.abs(entry.amount) > 0.009); // ignore near-zero balances

  const transactions = [];

  // Use two pointers on sorted arrays: most negative (owes most) <-> most positive (owed most)
  while (entries.length > 0) {
    // Sort every iteration: descending by amount
    entries.sort((a, b) => b.amount - a.amount);

    const maxCreditor = entries[0]; // owed the most (most positive)
    const maxDebtor = entries[entries.length - 1]; // owes the most (most negative)

    // If both are ~0, we're done settling
    if (Math.abs(maxCreditor.amount) < 0.01 && Math.abs(maxDebtor.amount) < 0.01) {
      break;
    }

    const settledAmount = Math.min(maxCreditor.amount, -maxDebtor.amount);
    const roundedAmount = Math.round(settledAmount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        from: maxDebtor.userId,
        to: maxCreditor.userId,
        amount: roundedAmount,
      });
    }

    maxCreditor.amount = Math.round((maxCreditor.amount - settledAmount) * 100) / 100;
    maxDebtor.amount = Math.round((maxDebtor.amount + settledAmount) * 100) / 100;

    // Remove any entry that is now settled (~0)
    for (let i = entries.length - 1; i >= 0; i--) {
      if (Math.abs(entries[i].amount) < 0.01) {
        entries.splice(i, 1);
      }
    }
  }

  return transactions;
}

module.exports = { calculateBalances, simplifyDebts };
