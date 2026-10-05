import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub);
  } catch {
    req.user = undefined;
  }
  next();
}

export async function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ message: 'You must be logged in to do that.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}
