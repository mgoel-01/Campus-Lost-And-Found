import { Router } from 'express';
import Claim from '../models/Claim.js';
import Item from '../models/Item.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId || !message) {
      return res.status(400).json({ message: 'Please describe why this item is yours.' });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    if (item.postedBy.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot claim your own post.' });
    }
    if (item.status === 'resolved') {
      return res.status(400).json({ message: 'This item has already been returned.' });
    }

    const existing = await Claim.findOne({ item: item._id, claimant: req.user._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already sent a request for this item.' });
    }

    const claim = await Claim.create({ item: item._id, claimant: req.user._id, message });
    res.status(201).json({ claim });
  } catch (err) {
    next(err);
  }
});

router.get('/sent', async (req, res, next) => {
  try {
    const claims = await Claim.find({ claimant: req.user._id })
      .populate('item', 'title type imageUrl status')
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) {
    next(err);
  }
});

router.get('/received', async (req, res, next) => {
  try {
    const myItems = await Item.find({ postedBy: req.user._id }).select('_id');
    const claims = await Claim.find({ item: { $in: myItems.map((i) => i._id) } })
      .populate('item', 'title type imageUrl status')
      .populate('claimant', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const claim = await Claim.findById(req.params.id).populate('item');
    if (!claim) return res.status(404).json({ message: 'Request not found.' });

    if (!claim.item.postedBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the person who posted the item can do that.' });
    }
    if (claim.item.status === 'resolved') {
      return res.status(400).json({ message: 'This item has already been returned.' });
    }

    claim.status = status;
    await claim.save();

    if (status === 'approved') {
      await Item.findByIdAndUpdate(claim.item._id, {
        status: 'resolved',
        resolvedWith: claim.claimant,
      });
      await Claim.updateMany(
        { item: claim.item._id, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'rejected' }
      );
    }

    res.json({ claim });
  } catch (err) {
    next(err);
  }
});

export default router;
