import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">L&amp;F</span>
          <span>Campus Lost &amp; Found</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Browse</NavLink>
          {user && <NavLink to="/my-posts">My posts</NavLink>}
          {user && <NavLink to="/requests">Requests</NavLink>}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link className="btn btn-primary" to="/report">
                Post an item
              </Link>
              <span className="nav-user">{user.name.split(' ')[0]}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">
                Log in
              </Link>
              <Link className="btn btn-primary" to="/register">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
