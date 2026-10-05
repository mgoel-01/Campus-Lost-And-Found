import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { apiError } from '../api';
import { formatDate } from '../components/ItemCard';
import { useAuth } from '../context/AuthContext';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/items/${id}`)
      .then((res) => setItem(res.data.item))
      .catch((err) => setError(apiError(err)));
  }, [id]);

  const isOwner = user && item && (item.postedBy._id === user.id || user.role === 'admin');

  async function sendClaim(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/claims', { itemId: id, message });
      setMessage('');
      setNotice('Request sent. The person who posted this item will review it.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function markResolved() {
    try {
      const res = await api.patch(`/items/${id}`, { status: 'resolved' });
      setItem({ ...item, status: res.data.item.status });
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function removeItem() {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/items/${id}`);
      navigate('/my-posts');
    } catch (err) {
      setError(apiError(err));
    }
  }

  if (error && !item) return <p className="alert alert-error">{error}</p>;
  if (!item) return <p className="empty">Loading...</p>;

  return (
    <article className="detail">
      <Link to="/" className="back-link">
        &larr; Back to all items
      </Link>

      <div className="detail-grid">
        <div className="detail-media">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} />
          ) : (
            <span className="card-placeholder">No photo provided</span>
          )}
        </div>

        <div>
          <div className="detail-tags">
            <span className={`tag tag-${item.type}`}>
              {item.type === 'found' ? 'Found item' : 'Lost item'}
            </span>
            {item.status === 'resolved' && <span className="tag tag-resolved">Returned</span>}
          </div>

          <h1>{item.title}</h1>
          <p className="detail-desc">{item.description}</p>

          <dl className="detail-meta">
            <div>
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
            <div>
              <dt>{item.type === 'found' ? 'Found at' : 'Lost around'}</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(item.date)}</dd>
            </div>
            <div>
              <dt>Posted by</dt>
              <dd>{item.postedBy.name}</dd>
            </div>
            {item.postedBy.email && (
              <div>
                <dt>Contact</dt>
                <dd>
                  {item.postedBy.email}
                  {item.postedBy.phone ? ` · ${item.postedBy.phone}` : ''}
                </dd>
              </div>
            )}
          </dl>

          {error && <p className="alert alert-error">{error}</p>}
          {notice && <p className="alert alert-success">{notice}</p>}

          {isOwner ? (
            <div className="detail-actions">
              {item.status === 'open' && (
                <button className="btn btn-primary" onClick={markResolved}>
                  Mark as returned
                </button>
              )}
              <Link className="btn btn-ghost" to="/requests">
                View requests
              </Link>
              <button className="btn btn-danger" onClick={removeItem}>
                Delete post
              </button>
            </div>
          ) : item.status === 'resolved' ? (
            <p className="muted">This item has already been returned to its owner.</p>
          ) : user ? (
            <form className="claim-form" onSubmit={sendClaim}>
              <h2>{item.type === 'found' ? 'Is this yours?' : 'Did you find this?'}</h2>
              <label>
                Describe something that proves it - a mark, contents, or where you lost it.
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending...' : 'Send request'}
              </button>
            </form>
          ) : (
            <p className="muted">
              <Link to="/login">Log in</Link> to contact the person who posted this.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
