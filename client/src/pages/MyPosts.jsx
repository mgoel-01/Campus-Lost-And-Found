import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../api';
import ItemCard from '../components/ItemCard';

export default function MyPosts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/items/mine')
      .then((res) => setItems(res.data.items))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>My posts</h1>
        <Link className="btn btn-primary" to="/report">
          Post an item
        </Link>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading...</p>
      ) : items.length === 0 ? (
        <p className="empty">You have not posted anything yet.</p>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
