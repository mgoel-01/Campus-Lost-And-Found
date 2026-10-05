import 'dotenv/config';
import { connectDB } from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
