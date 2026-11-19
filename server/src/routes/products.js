import { Router } from 'express';
import multer from 'multer';
import { Product } from '../models.js';
import { protect, roles } from '../middleware.js';
const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_, file, cb) => { if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true); else cb(new Error('Only JPG, PNG, WEBP, GIF or AVIF images are allowed')) } });
r.get('/', async (q, s) => { try { const f = { active: true }; if (q.query.search) f.name = { $regex: q.query.search, $options: 'i' }; if (q.query.category && q.query.category !== 'All') f.category = q.query.category; if (q.query.max) f.price = { $lte: Number(q.query.max) }; if (q.query.size) f.sizes = { $elemMatch: { size: q.query.size, stock: { $gt: 0 } } }; s.json(await Product.find(f).sort({ createdAt: -1 })) } catch (e) { s.status(500).json({ message: e.message }) } });
r.get('/barcode/:code', protect, roles('admin', 'staff'), async (q, s) => { const p = await Product.findOne({ barcode: q.params.code, active: true }); if (!p) return s.status(404).json({ message: 'Barcode not found' }); s.json(p) });
// Admin uploads a real image file. The image is stored as a data URL in MongoDB with the product.
r.post('/', protect, roles('admin'), upload.single('imageFile'), async (q, s) => {
  try {
    const body = { ...q.body }; body.price = Number(body.price); body.sizes = typeof body.sizes === 'string' ? JSON.parse(body.sizes) : body.sizes;
    if (q.file) body.image = `data:${q.file.mimetype};base64,${q.file.buffer.toString('base64')}`;
    else if (!body.image) throw Error('Please choose a product image');
    s.status(201).json(await Product.create(body));
  } catch (e) { s.status(400).json({ message: e.message }) }
});
r.put('/:id', protect, roles('admin'), upload.single('imageFile'), async (q, s) => { try { const body = { ...q.body }; if (body.sizes && typeof body.sizes === 'string') body.sizes = JSON.parse(body.sizes); if (body.price !== undefined) body.price = Number(body.price); if (q.file) body.image = `data:${q.file.mimetype};base64,${q.file.buffer.toString('base64')}`; s.json(await Product.findByIdAndUpdate(q.params.id, body, { new: true, runValidators: true })) } catch (e) { s.status(400).json({ message: e.message }) } });
r.delete('/:id', protect, roles('admin'), async (q, s) => { await Product.findByIdAndUpdate(q.params.id, { active: false }); s.json({ message: 'Product archived' }) });
export default r;
