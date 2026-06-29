import { useState } from 'react';
import api from '../utils/api';

export default function AddMemberModal({ groupId, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: foundUser } = await api.get(
        `/users/search?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );

      const { data: updatedGroup } = await api.put(`/groups/${groupId}/members`, {
        userId: foundUser._id,
      });

      onAdded(updatedGroup);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Add a member</h2>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="newMemberEmail">Email address</label>
            <input
              id="newMemberEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
