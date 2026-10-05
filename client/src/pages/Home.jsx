import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../api';
import ItemCard from '../components/ItemCard';
import { useAuth } from '../context/AuthContext';

const TYPES = [
  { value: '', label: 'Everything' },
  { value: 'found', label: 'Found items' },
  { value: 'lost', label: 'Lost items' },
];

export default function Home() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/items/categories').then((res) => setCategories(res.data.categories));
    api.get('/items/stats').then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/items', { params: { q: query, category, type, status, page } })
      .then((res) => setData(res.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [query, category, type, status, page]);

  return (
    <>
      <section className="hero">
        <h1>Lost something on campus?</h1>
        <p>
          Search what other students have handed in, or post an item you found so it gets back to
          its owner.
        </p>
        {stats && (
          <div className="stats">
            <div>
              <strong>{stats.found}</strong>
              <span>found items waiting</span>
            </div>
            <div>
              <strong>{stats.lost}</strong>
              <span>reported missing</span>
            </div>
            <div>
              <strong>{stats.resolved}</strong>
              <span>returned to owners</span>
            </div>
          </div>
        )}
        {!user && (
          <p className="hero-cta">
            <Link to="/register">Create an account</Link> to post an item or send a claim request.
          </p>
        )}
      </section>

      <section className="filters">
        <input
          className="search"
          type="search"
          placeholder="Search by keyword, e.g. calculator, blue bottle, ID card..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-row">
          <div className="segmented">
            {TYPES.map((option) => (
              <button
                key={option.value}
                className={type === option.value ? 'active' : ''}
                onClick={() => {
                  setType(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="open">Still open</option>
            <option value="resolved">Already returned</option>
            <option value="all">Any status</option>
          </select>
        </div>
      </section>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p className="empty">Loading items...</p>
      ) : data.items.length === 0 ? (
        <p className="empty">
          No items match your search. Try a different keyword or clear the filters.
        </p>
      ) : (
        <>
          <p className="result-count">
            {data.total} {data.total === 1 ? 'item' : 'items'} found
          </p>
          <div className="grid">
            {data.items.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        </>
      )}

      {data.pages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
