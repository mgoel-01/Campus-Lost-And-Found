import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <h1>Log in</h1>
      <p className="muted">Use your campus account to post items and send claim requests.</p>

      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
