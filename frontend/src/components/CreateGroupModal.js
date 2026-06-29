import { useState } from 'react';
import api from '../utils/api';

export default function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [pendingMembers, setPendingMembers] = useState([]); // [{_id, name, email}]
  const [searchError, setSearchError] = useState('');
  const [formError, setFormError] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAddMember = async () => {
    setSearchError('');
    const trimmedEmail = memberEmail.trim().toLowerCase();
    if (!trimmedEmail) return;

    if (pendingMembers.some((m) => m.email === trimmedEmail)) {
      setSearchError('That person is already added');
      return;
    }

    setSearching(true);
    try {
      const { data } = await api.get(`/users/search?email=${encodeURIComponent(trimmedEmail)}`);
      setPendingMembers((prev) => [...prev, data]);
      setMemberEmail('');
    } catch (err) {
      setSearchError(err.response?.data?.message || 'No user found with that email');
    } finally {
      setSearching(false);
    }
  };

  const removeMember = (id) => {
    setPendingMembers((prev) => prev.filter((m) => m._id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Group name is required');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        memberIds: pendingMembers.map((m) => m._id),
      });
      onCreated(data);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Create a new group</h2>

        {formError && <div className="error-banner">{formError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="groupName">Group name</label>
            <input
              id="groupName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goa Trip, Flat 4B, ..."
              required
            />
          </div>

          <div className="field">
            <label htmlFor="groupDesc">Description (optional)</label>
            <input
              id="groupDesc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group for?"
            />
          </div>

          <div className="field">
            <label htmlFor="memberEmail">Add members by email</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="friend@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddMember}
                disabled={searching}
              >
                {searching ? '...' : 'Add'}
              </button>
            </div>
            {searchError && (
              <p className="split-total-hint mismatch" style={{ marginTop: 6 }}>
                {searchError}
              </p>
            )}
          </div>

          {pendingMembers.length > 0 && (
            <div className="member-pills" style={{ marginBottom: 16 }}>
              {pendingMembers.map((m) => (
                <span className="member-pill" key={m._id}>
                  <span className="avatar">{m.name.charAt(0).toUpperCase()}</span>
                  {m.name}
                  <button
                    type="button"
                    onClick={() => removeMember(m._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 700,
                      padding: 0,
                    }}
                    aria-label={`Remove ${m.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
