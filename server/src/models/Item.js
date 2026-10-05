import mongoose from 'mongoose';

export const CATEGORIES = [
  'ID Card',
  'Electronics',
  'Books & Stationery',
  'Clothing',
  'Bottles & Containers',
  'Keys',
  'Wallet & Purse',
  'Jewellery',
  'Bag',
  'Other',
];

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['found', 'lost'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    date: { type: Date, required: true },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

itemSchema.index({ category: 1, type: 1, status: 1, createdAt: -1 });

export default mongoose.model('Item', itemSchema);
