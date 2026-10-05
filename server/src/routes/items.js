import path from 'node:path';
import fs from 'node:fs/promises';
import { Router } from 'express';
import Item, { CATEGORIES } from '../models/Item.js';
import Claim from '../models/Claim.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function removeImageFile(imageUrl) {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  await fs.rm(path.resolve('uploads', filename), { force: true });
}

router.get('/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

router.get('/stats', async (req, res, next) => {
  try {
    const [found, lost, resolved] = await Promise.all([
      Item.countDocuments({ type: 'found', status: 'open' }),
      Item.countDocuments({ type: 'lost', status: 'open' }),
      Item.countDocuments({ status: 'resolved' }),
    ]);
    res.json({ found, lost, resolved });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await Item.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { q, category, type, status = 'open' } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));

    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (status !== 'all') filter.status = status;

    if (q && q.trim()) {
      const term = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: term }, { description: term }, { location: term }];
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('postedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Item.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('postedBy', 'name email phone');
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    const payload = item.toObject();
    if (!req.user) {
      delete payload.postedBy.email;
      delete payload.postedBy.phone;
    }

    res.json({ item: payload });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, uploadImage, async (req, res, next) => {
  try {
    const { type, title, description, category, location, date } = req.body;

    if (!type || !title || !description || !category || !location || !date) {
      return res.status(400).json({ message: 'All fields except the photo are required.' });
    }

    const item = await Item.create({
      type,
      title,
      description,
      category,
      location,
      date,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : '',
      postedBy: req.user._id,
    });

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, uploadImage, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    if (!item.postedBy.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own posts.' });
    }

    const editable = ['type', 'title', 'description', 'category', 'location', 'date', 'status'];
    for (const field of editable) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }

    if (req.file) {
      await removeImageFile(item.imageUrl);
      item.imageUrl = `/uploads/${req.file.filename}`;
    }

    if (item.status === 'open') item.resolvedWith = null;

    await item.save();
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    if (!item.postedBy.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }

    await removeImageFile(item.imageUrl);
    await Claim.deleteMany({ item: item._id });
    await item.deleteOne();

    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
