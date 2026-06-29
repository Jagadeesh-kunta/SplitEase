import { useState, useMemo } from 'react';
import api from '../utils/api';

export default function AddExpenseModal({ group, currentUser, onClose, onAdded }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser._id);
  const [splitType, setSplitType] = useState('equal');
  const [customAmounts, setCustomAmounts] = useState({}); // { userId: "12.50" }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = parseFloat(amount) || 0;

  const customTotal = useMemo(() => {
    return Object.values(customAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  }, [customAmounts]);

  const customMismatch = splitType === 'custom' && Math.abs(customTotal - numericAmount) > 0.05;

  const handleCustomChange = (userId, value) => {
    setCustomAmounts((prev) => ({ ...prev, [userId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim() || !amount || numericAmount <= 0) {
      setError('Please enter a description and a valid amount');
      return;
    }

    if (customMismatch) {
      setError(
        `Custom amounts add up to ₹${customTotal.toFixed(2)}, but the total is ₹${numericAmount.toFixed(2)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        groupId: group._id,
        description: description.trim(),
        amount: numericAmount,
        paidBy,
        splitType,
      };

      if (splitType === 'custom') {
        payload.customSplits = group.members.map((m) => ({
          user: m._id,
          amount: parseFloat(customAmounts[m._id]) || 0,
        }));
      }

      const { data } = await api.post('/expenses', payload);
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Add an expense</h2>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="desc">Description</label>
            <input
              id="desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, cab fare, groceries..."
              required
            />
          </div>

          <div className="field">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="paidBy">Paid by</label>
            <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {group.members.map((m) => (
                <option value={m._id} key={m._id}>
                  {m._id === currentUser._id ? 'You' : m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Split type</label>
            <div className="split-type-row">
              <button
                type="button"
                className={`split-type-option ${splitType === 'equal' ? 'active' : ''}`}
                onClick={() => setSplitType('equal')}
              >
                Split equally
              </button>
              <button
                type="button"
                className={`split-type-option ${splitType === 'custom' ? 'active' : ''}`}
                onClick={() => setSplitType('custom')}
              >
                Custom amounts
              </button>
            </div>
          </div>

          {splitType === 'equal' && (
            <p className="text-soft" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Split equally between all {group.members.length} members
              {numericAmount > 0 &&
                ` — ₹${(numericAmount / group.members.length).toFixed(2)} each`}
              .
            </p>
          )}

          {splitType === 'custom' && (
            <div className="field">
              <label>How much does each person owe?</label>
              {group.members.map((m) => (
                <div className="custom-split-row" key={m._id}>
                  <span>{m._id === currentUser._id ? 'You' : m.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmounts[m._id] || ''}
                    onChange={(e) => handleCustomChange(m._id, e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ))}
              <p className={`split-total-hint ${customMismatch ? 'mismatch' : ''}`}>
                Total entered: ₹{customTotal.toFixed(2)} / ₹{numericAmount.toFixed(2)}
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
