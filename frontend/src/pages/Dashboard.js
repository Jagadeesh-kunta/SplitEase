import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CreateGroupModal from '../components/CreateGroupModal';
import api from '../utils/api';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (err) {
      setError('Failed to load groups. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    setShowModal(false);
  };

  return (
    <div className="app-shell">
      <Navbar />

      <div className="container page">
        <div className="page-header">
          <h1>Your groups</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New group
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="loading-text">Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="empty-state card">
            <h3>No groups yet</h3>
            <p>Create your first group to start splitting expenses with friends.</p>
          </div>
        ) : (
          <div className="group-grid">
            {groups.map((group) => (
              <Link to={`/groups/${group._id}`} key={group._id} className="group-card">
                <h3>{group.name}</h3>
                {group.description && <p className="text-soft">{group.description}</p>}
                <p className="member-count">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateGroupModal onClose={() => setShowModal(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}
