import { Router } from 'express';
import mongoose from 'mongoose';
import { Product, UserState } from '../models.js';
import { protect } from '../middleware.js';

const r = Router();
r.use(protect);

// Return only the signed-in user's saved products and cart.
r.get('/', async (req, res) => {
  try {
    const state = await UserState.findOne({ user: req.user._id })
      .populate({ path: 'wishlist', match: { active: true } })
      .populate({ path: 'cart.product', match: { active: true } });
    if (!state) return res.json({ wishlist: [], cart: [] });
    const wishlist = (state.wishlist || []).filter(Boolean);
    const cart = (state.cart || []).filter(row => row.product).map(row => ({
      product: String(row.product._id),
      _id: String(row.product._id),
      name: row.product.name,
      image: row.product.image || row.product.images?.[0] || '',
      images: row.product.images || [],
      price: Number(row.product.price || 0),
      size: row.size,
      quantity: Number(row.quantity || 1),
      stock: Number(row.product.sizes?.find(s => String(s.size) === String(row.size))?.stock || 0)
    }));
    res.json({ wishlist, cart });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

r.put('/wishlist', async (req, res) => {
  try {
    const ids = [...new Set((Array.isArray(req.body.productIds) ? req.body.productIds : []).map(String))];
    if (ids.some(id => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'Invalid product in wishlist' });
    const found = await Product.find({ _id: { $in: ids }, active: true }).select('_id');
    if (found.length !== ids.length) return res.status(400).json({ message: 'One or more wishlist products are unavailable' });
    const state = await UserState.findOneAndUpdate(
      { user: req.user._id },
      { $set: { wishlist: ids, user: req.user._id } },
      { new: true, upsert: true, runValidators: true }
    ).populate({ path: 'wishlist', match: { active: true } });
    res.json({ wishlist: (state.wishlist || []).filter(Boolean) });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

r.put('/cart', async (req, res) => {
  try {
    const input = Array.isArray(req.body.items) ? req.body.items : [];
    const merged = new Map();
    for (const row of input) {
      const product = String(row.product || row.productId || '');
      const size = String(row.size || '').trim();
      const quantity = Math.floor(Number(row.quantity));
      if (!mongoose.isValidObjectId(product) || !size || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Cart item has an invalid product, size or quantity' });
      }
      const key = `${product}:${size}`;
      merged.set(key, { product, size, quantity: (merged.get(key)?.quantity || 0) + quantity });
    }
    const items = [...merged.values()];
    const products = await Product.find({ _id: { $in: items.map(x => x.product) }, active: true });
    const byId = new Map(products.map(p => [String(p._id), p]));
    for (const item of items) {
      const p = byId.get(item.product);
      if (!p) return res.status(400).json({ message: 'A cart product is unavailable' });
      const sizeRow = (p.sizes || []).find(s => String(s.size) === item.size);
      if (!sizeRow) return res.status(400).json({ message: `${p.name}: selected size is unavailable` });
      if (item.quantity > Number(sizeRow.stock || 0)) return res.status(400).json({ message: `${p.name}: only ${sizeRow.stock} item(s) available for size ${item.size}` });
    }
    const state = await UserState.findOneAndUpdate(
      { user: req.user._id },
      { $set: { cart: items, user: req.user._id } },
      { new: true, upsert: true, runValidators: true }
    ).populate({ path: 'cart.product', match: { active: true } });
    const cart = (state.cart || []).filter(row => row.product).map(row => ({
      product: String(row.product._id), _id: String(row.product._id),
      name: row.product.name, image: row.product.image || row.product.images?.[0] || '',
      images: row.product.images || [], price: Number(row.product.price || 0),
      size: row.size, quantity: Number(row.quantity || 1),
      stock: Number(row.product.sizes?.find(s => String(s.size) === String(row.size))?.stock || 0)
    }));
    res.json({ cart });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

export default r;
