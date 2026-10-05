import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../api';
import { formatDate } from '../components/ItemCard';

export default function Requests() {
  const [tab, setTab] = useState('received');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/claims/${tab}`)
      .then((res) => setClaims(res.data.claims))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [tab]);

  async function decide(claimId, status) {
    try {
      await api.patch(`/claims/${claimId}`, { status });
      const res = await api.get(`/claims/${tab}`);
      setClaims(res.data.claims);
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <>
      <h1>Claim requests</h1>

      <div className="segmented segmented-wide">
        <button className={tab === 'received' ? 'active' : ''} onClick={() => setTab('received')}>
          Received on my posts
        </button>
        <button className={tab === 'sent' ? 'active' : ''} onClick={() => setTab('sent')}>
          Sent by me
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading...</p>
      ) : claims.length === 0 ? (
        <p className="empty">
          {tab === 'received'
            ? 'Nobody has claimed your posts yet.'
            : 'You have not sent any claim requests.'}
        </p>
      ) : (
        <ul className="claim-list">
          {claims.map((claim) => (
            <li key={claim._id} className="claim">
              <div className="claim-head">
                <Link to={`/items/${claim.item?._id}`} className="claim-title">
                  {claim.item?.title || 'Deleted item'}
                </Link>
                <span className={`tag tag-${claim.status}`}>{claim.status}</span>
              </div>

              <p className="claim-message">{claim.message}</p>

              <p className="muted small">
                {tab === 'received' && claim.claimant
                  ? `From ${claim.claimant.name} · ${claim.claimant.email}${
                      claim.claimant.phone ? ` · ${claim.claimant.phone}` : ''
                    } · `
                  : ''}
                {formatDate(claim.createdAt)}
              </p>

              {tab === 'received' && claim.status === 'pending' && (
                <div className="claim-actions">
                  <button className="btn btn-primary" onClick={() => decide(claim._id, 'approved')}>
                    Approve &amp; mark returned
                  </button>
                  <button className="btn btn-ghost" onClick={() => decide(claim._id, 'rejected')}>
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
