import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api';

const today = new Date().toISOString().slice(0, 10);

export default function ReportItem() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    type: 'found',
    title: '',
    description: '',
    category: '',
    location: '',
    date: today,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/items/categories').then((res) => setCategories(res.data.categories));
  }, []);

  function handleImage(e) {
    const file = e.target.files[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (image) payload.append('image', image);

    try {
      const res = await api.post('/items', payload);
      navigate(`/items/${res.data.item._id}`);
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  }

  return (
    <div className="form-page form-page-wide">
      <h1>Post an item</h1>
      <p className="muted">
        Add as much detail as you can, but keep one identifying detail out of the description so you
        can verify the real owner.
      </p>

      {error && <p className="alert alert-error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <div className="segmented segmented-wide">
          <button
            type="button"
            className={form.type === 'found' ? 'active' : ''}
            onClick={() => setForm({ ...form, type: 'found' })}
          >
            I found something
          </button>
          <button
            type="button"
            className={form.type === 'lost' ? 'active' : ''}
            onClick={() => setForm({ ...form, type: 'lost' })}
          >
            I lost something
          </button>
        </div>

        <label>
          Title
          <input
            required
            maxLength={120}
            placeholder="e.g. Blue steel water bottle"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label>
          Description
          <textarea
            required
            rows={5}
            maxLength={2000}
            placeholder="Colour, brand, marks, where exactly you found it, where it is being kept..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="form-row">
          <label>
            Category
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            {form.type === 'found' ? 'Date found' : 'Date lost'}
            <input
              type="date"
              required
              max={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
        </div>

        <label>
          Location
          <input
            required
            maxLength={160}
            placeholder="e.g. Central Library, 2nd floor reading room"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>

        <label>
          Photo (optional, max 5 MB)
          <input type="file" accept="image/*" onChange={handleImage} />
        </label>

        {preview && <img className="preview" src={preview} alt="Selected preview" />}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Posting...' : 'Post item'}
        </button>
      </form>
    </div>
  );
}
