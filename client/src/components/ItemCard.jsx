import { Link } from 'react-router-dom';

export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ItemCard({ item }) {
  return (
    <Link to={`/items/${item._id}`} className="card">
      <div className="card-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy" />
        ) : (
          <span className="card-placeholder">No photo</span>
        )}
        <span className={`tag tag-${item.type}`}>{item.type === 'found' ? 'Found' : 'Lost'}</span>
        {item.status === 'resolved' && <span className="tag tag-resolved">Returned</span>}
      </div>

      <div className="card-body">
        <h3>{item.title}</h3>
        <p className="card-desc">{item.description}</p>
        <dl className="card-meta">
          <div>
            <dt>Category</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{formatDate(item.date)}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
