import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BalanceBar from '../components/BalanceBar';
import AddExpenseModal from '../components/AddExpenseModal';
import AddMemberModal from '../components/AddMemberModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

export default function GroupDetail() {
  const { id: groupId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balanceData, setBalanceData] = useState({ balances: [], settlementPlan: [] });
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'balances'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/expenses/group/${groupId}`),
        api.get(`/expenses/group/${groupId}/balances`),
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalanceData(balancesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Re-fetch just the balances (cheaper than refetching everything)
  const refreshBalances = useCallback(async () => {
    try {
      const { data } = await api.get(`/expenses/group/${groupId}/balances`);
      setBalanceData(data);
    } catch (err) {
      // Non-critical — silently ignore, the next manual refresh will fix it
    }
  }, [groupId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---- Real-time wiring ----
  useEffect(() => {
    if (!socket) return;

    socket.emit('joinGroup', groupId);

    const handleExpenseAdded = (newExpense) => {
      setExpenses((prev) => {
        // Avoid duplicate if the adder already has it from their own POST response
        if (prev.some((e) => e._id === newExpense._id)) return prev;
        return [newExpense, ...prev];
      });
      refreshBalances();
    };

    const handleExpenseDeleted = ({ expenseId }) => {
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
      refreshBalances();
    };

    const handleMemberAdded = (updatedGroup) => {
      setGroup(updatedGroup);
      refreshBalances();
    };

    socket.on('expenseAdded', handleExpenseAdded);
    socket.on('expenseDeleted', handleExpenseDeleted);
    socket.on('memberAdded', handleMemberAdded);

    return () => {
      socket.emit('leaveGroup', groupId);
      socket.off('expenseAdded', handleExpenseAdded);
      socket.off('expenseDeleted', handleExpenseDeleted);
      socket.off('memberAdded', handleMemberAdded);
    };
  }, [socket, groupId, refreshBalances]);

  const handleExpenseAddedLocally = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    setShowAddExpense(false);
    refreshBalances();
  };

  const handleMemberAddedLocally = (updatedGroup) => {
    setGroup(updatedGroup);
    setShowAddMember(false);
    refreshBalances();
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
      refreshBalances();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar />
        <p className="loading-text">Loading group...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="container page">
          <div className="error-banner">{error || 'Group not found'}</div>
          <Link to="/dashboard" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const maxAbsBalance = Math.max(
    1,
    ...balanceData.balances.map((b) => Math.abs(b.balance))
  );

  return (
    <div className="app-shell">
      <Navbar />

      <div className="container page">
        <div className="page-header">
          <div>
            <h1>{group.name}</h1>
            {group.description && <p className="text-soft">{group.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowAddMember(true)}>
              + Add member
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>
              + Add expense
            </button>
          </div>
        </div>

        <div className="member-pills" style={{ marginBottom: 28 }}>
          {group.members.map((m) => (
            <span className="member-pill" key={m._id}>
              <span className="avatar">{m.name.charAt(0).toUpperCase()}</span>
              {m._id === user._id ? 'You' : m.name}
            </span>
          ))}
        </div>

        <div className="group-detail-grid">
          {/* Left: expenses / balances tabs */}
          <div className="card">
            <div className="tab-row">
              <button
                className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setActiveTab('expenses')}
              >
                Expenses
              </button>
              <button
                className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
                onClick={() => setActiveTab('balances')}
              >
                Balances
              </button>
            </div>

            {activeTab === 'expenses' ? (
              expenses.length === 0 ? (
                <div className="empty-state">
                  <h3>No expenses yet</h3>
                  <p>Add the first expense to start tracking who owes what.</p>
                </div>
              ) : (
                <div>
                  {expenses.map((exp) => (
                    <div className="expense-item" key={exp._id}>
                      <div className="expense-left">
                        <div className="expense-icon">
                          {exp.description.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="expense-desc">{exp.description}</div>
                          <div className="expense-meta">
                            Paid by {exp.paidBy._id === user._id ? 'You' : exp.paidBy.name} ·{' '}
                            {new Date(exp.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="expense-amount">₹{exp.amount.toFixed(2)}</span>
                        <button
                          className="expense-delete"
                          onClick={() => handleDeleteExpense(exp._id)}
                          aria-label="Delete expense"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div>
                {balanceData.balances.map((b) => (
                  <BalanceBar
                    key={b.user._id}
                    name={b.user._id === user._id ? 'You' : b.user.name}
                    balance={b.balance}
                    maxAbs={maxAbsBalance}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: settlement plan, always visible */}
          <div className="card">
            <div className="section-title">
              <span className="live-dot" />
              Suggested settlement
            </div>

            {balanceData.settlementPlan.length === 0 ? (
              <div className="all-settled">Everyone's settled up 🎉</div>
            ) : (
              <div>
                {balanceData.settlementPlan.map((txn, idx) => (
                  <div className="settlement-item" key={idx}>
                    <span>{txn.from._id === user._id ? 'You' : txn.from.name}</span>
                    <span className="arrow">→</span>
                    <span>{txn.to._id === user._id ? 'You' : txn.to.name}</span>
                    <span className="amount">₹{txn.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-soft" style={{ fontSize: 12.5, marginTop: 14 }}>
              Calculated using the fewest possible transactions to settle every balance in
              this group.
            </p>
          </div>
        </div>
      </div>

      {showAddExpense && (
        <AddExpenseModal
          group={group}
          currentUser={user}
          onClose={() => setShowAddExpense(false)}
          onAdded={handleExpenseAddedLocally}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          onClose={() => setShowAddMember(false)}
          onAdded={handleMemberAddedLocally}
        />
      )}
    </div>
  );
}
