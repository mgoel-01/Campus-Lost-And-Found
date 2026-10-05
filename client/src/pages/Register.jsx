import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <h1>Create your account</h1>
      <p className="muted">Anyone with a campus email can post and claim items.</p>

      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label>
          Full name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

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
          Phone (optional, shown to people you approve)
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <small className="muted">At least 6 characters.</small>
        </label>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
