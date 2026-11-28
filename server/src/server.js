import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import auth from './routes/auth.js';
import products from './routes/products.js';
import orders from './routes/orders.js';
import pos from './routes/pos.js';
import reports from './routes/reports.js';
import categories from './routes/categories.js';
import reviews from './routes/reviews.js';
import userState from './routes/userState.js';
dotenv.config();
const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://stylehub-dnk0.onrender.com"
  ],
  credentials: true
}));

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.get('/api/health', (_, r) => r.json({ status: 'ok' }));
app.use('/api/auth', auth); app.use('/api/products', products);
app.use('/api/orders', orders);
app.use('/api/pos', pos);
app.use('/api/reports', reports);
app.use('/api/categories', categories);
app.use('/api/reviews', reviews);
app.use('/api/user-state', userState);
mongoose.connect(process.env.MONGO_URI).then(() => app.listen(process.env.PORT || 5000, () => console.log('STYLEHUB API ready'))).catch(e => { console.error(e); process.exit(1) });
