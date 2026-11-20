import { Router } from 'express';
import { Category, Product } from '../models.js';
import { protect, roles } from '../middleware.js';
const r = Router();
r.get('/', async (_, res) => { const existing = await Category.countDocuments(); if (!existing) { const names = await Product.distinct('category', { active: true }); if (names.length) await Category.insertMany(names.filter(Boolean).map(name => ({ name })), { ordered: false }).catch(() => {}); } res.json(await Category.find({ active: true }).sort({ name: 1 })); });
r.post('/', protect, roles('admin'), async (req, res) => { try { const name = String(req.body.name || '').trim(); if (!name) return res.status(400).json({ message: 'Category name is required' }); res.status(201).json(await Category.create({ name })); } catch (e) { res.status(400).json({ message: e.code === 11000 ? 'Category already exists' : e.message }); } });
r.delete('/:id', protect, roles('admin'), async (req, res) => { const c = await Category.findByIdAndUpdate(req.params.id, { active: false }, { new: true }); if (!c) return res.status(404).json({ message: 'Category not found' }); res.json({ message: 'Category removed' }); });
export default r;
