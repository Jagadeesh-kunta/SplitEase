import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">S</span>
          SplitEase
        </Link>

        {user && (
          <div className="topbar-user">
            <span>{user.name}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
