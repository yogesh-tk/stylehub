import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Product, Order, ReturnRequest } from '../models.js';
import { protect, roles } from '../middleware.js';
const r = Router(), rp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
r.post('/create-payment', protect, async (q, s) => { try { let total = 0; for (const i of q.body.items || []) { const p = await Product.findById(i.product), z = p?.sizes.find(x => x.size === i.size); if (!z || z.stock < i.quantity) return s.status(409).json({ message: 'Insufficient stock' }); total += p.price * i.quantity } const o = await rp().orders.create({ amount: Math.round(total * 100), currency: 'INR', receipt: 'sh' + Date.now() }); s.json({ id: o.id, amount: o.amount, currency: o.currency, key: process.env.RAZORPAY_KEY_ID }) } catch (e) { s.status(500).json({ message: e.message }) } });
r.post('/verify-payment', protect, async (q, s) => { const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address } = q.body; const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex'); if (sig !== razorpay_signature) return s.status(400).json({ message: 'Payment verification failed' }); const session = await mongoose.startSession(); try { let order; await session.withTransaction(async () => { let total = 0, lines = []; for (const i of items) { const p = await Product.findById(i.product).session(session), z = p?.sizes.find(x => x.size === i.size); if (!z || z.stock < i.quantity) throw Error('Stock changed; contact support'); z.stock -= i.quantity; await p.save({ session }); lines.push({ product: p._id, name: p.name, image: p.image, size: i.size, quantity: i.quantity, price: p.price }); total += p.price * i.quantity } [order] = await Order.create([{ orderNumber: 'SH' + Date.now(), trackingId: 'STH' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase(), user: q.user._id, customerName: q.user.name, customerPhone: q.user.phone, items: lines, address, subtotal: total, total, paymentMethod: 'razorpay', paymentStatus: 'paid', paymentId: razorpay_payment_id, invoiceNumber: 'INV-SH-'+Date.now(), statusHistory:[{status:'placed',note:'Payment verified and order placed',source:'system'}] }], { session }) }); s.status(201).json({ order }) } catch (e) { s.status(409).json({ message: e.message }) } finally { await session.endSession() } });
r.get('/mine', protect, async (q, s) => s.json(await Order.find({ user: q.user._id }).sort({ createdAt: -1 })));
r.patch('/:id/tracking', protect, roles('admin'), async (q, s) => { try { const { trackingId, status } = q.body; const update = {}; if (typeof trackingId === 'string' && trackingId.trim()) update.trackingId = trackingId.trim(); if (typeof status === 'string' && ['placed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) update.status = status; const current = await Order.findById(q.params.id); if (!current) return s.status(404).json({ message: 'Order not found' }); if (update.status) current.statusHistory.push({ status: update.status, note: 'Updated by admin', source: 'admin' }); Object.assign(current, update); const order = await current.save(); if (!order) return s.status(404).json({ message: 'Order not found' }); s.json({ order }) } catch (e) { s.status(400).json({ message: e.message }) } });
r.get('/', protect, roles('admin', 'staff'), async (q, s) => s.json(await Order.find({ source: 'online', status: { $nin: ['delivered','cancelled','return_requested','return_approved','returned','refund_processing','refunded'] } }).sort({ createdAt: -1 }).populate('user', 'name email phone')));
r.get('/deliveries', protect, roles('admin','staff'), async (q,s) => s.json(await Order.find({ source:'online', status:{ $in:['delivered','return_requested','return_approved','returned','refund_processing','refunded'] } }).sort({ updatedAt:-1 }).populate('user','name email phone')));
r.post('/:id/return-request', protect, async (q,s) => { try { const order=await Order.findOne({_id:q.params.id,user:q.user._id,paymentStatus:'paid'}); if(!order) return s.status(404).json({message:'Paid order not found'}); if(order.status!=='delivered') return s.status(409).json({message:'Returns can be requested only after delivery'}); const existing=await ReturnRequest.findOne({order:order._id,user:q.user._id,status:{$nin:['rejected','refunded']}}); if(existing) return s.status(409).json({message:'A return request already exists for this order'}); const items=(q.body.items||order.items).map(i=>({product:i.product,name:i.name,size:i.size,quantity:i.quantity})); const rr=await ReturnRequest.create({order:order._id,user:q.user._id,items,reason:q.body.reason||'Other',note:q.body.note||''}); order.status='return_requested'; order.statusHistory.push({status:'return_requested',note:'Customer requested return/refund',source:'customer'}); await order.save(); s.status(201).json(rr); } catch(e){s.status(400).json({message:e.message})} });
r.get('/returns', protect, roles('admin','staff'), async(q,s)=>s.json(await ReturnRequest.find().sort({createdAt:-1}).populate('user','name email phone').populate('order')));
r.patch('/returns/:id', protect, roles('admin'), async(q,s)=>{ try { const allowed=['approved','rejected','pickup_scheduled','picked_up','refund_processing','refunded']; if(!allowed.includes(q.body.status)) return s.status(400).json({message:'Invalid return status'}); const rr=await ReturnRequest.findByIdAndUpdate(q.params.id,{$set:{status:q.body.status,adminNote:q.body.adminNote||'',refundAmount:q.body.refundAmount,refundReference:q.body.refundReference}},{new:true}); if(!rr)return s.status(404).json({message:'Return request not found'}); const order=await Order.findById(rr.order); if(order){order.status=q.body.status==='refunded'?'refunded':q.body.status==='approved'?'return_approved':q.body.status==='refund_processing'?'refund_processing':q.body.status==='rejected'?'delivered':'return_requested';order.statusHistory.push({status:order.status,note:'Return request '+q.body.status,source:'admin'});await order.save()} s.json(rr); }catch(e){s.status(400).json({message:e.message})} });
const shipwayConfig = () => {
  const base = (process.env.SHIPWAY_API_URL || 'https://shipway.in/api').replace(/\/$/, '');
  return {
    base,
    username: process.env.SHIPWAY_USERNAME,
    password: process.env.SHIPWAY_LICENSE_KEY,
    company: process.env.SHIPWAY_COMPANY_NAME || 'STYLEHUB',
    pushPath: process.env.SHIPWAY_PUSH_ORDERS_PATH || 'PushOrderData',
    trackingPath: process.env.SHIPWAY_TRACKING_PATH || 'getOrderShipmentDetails',
    carriersPath: process.env.SHIPWAY_CARRIERS_PATH || 'carriers'
  };
};
const shipwayReady = c => Boolean(c.username && c.password);
const shipwayPost = async (path, payload) => {
  const c = shipwayConfig();
  const response = await fetch(`${c.base}/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: c.username, password: c.password, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || String(data.status || '').toLowerCase() === 'failed' || data.success === false) {
    const error = new Error(data.message || data.msg || `Shipway request failed (${response.status})`);
    error.details = data;
    throw error;
  }
  return data;
};
const shipwayStatus = data => {
  const x = data?.response || data?.data || data;
  const code = String(x?.current_status_code || x?.status_code || x?.shipment_status_code || '').toUpperCase();
  const label = String(x?.current_status || x?.status || x?.shipment_status || '').toLowerCase().replace(/[^a-z]+/g, '_');
  const map = {
    SCH: 'shipped', INT: 'shipped', OOD: 'out_for_delivery', DEL: 'delivered',
    UND: 'shipped', RTO: 'shipped', RTD: 'delivered', CAN: 'cancelled',
    shipped: 'shipped', in_transit: 'shipped', manifested: 'shipped',
    out_for_delivery: 'out_for_delivery', delivered: 'delivered', cancelled: 'cancelled'
  };
  return map[code] || map[label] || null;
};

// Return the courier IDs configured for this Shipway Experience account.
r.get('/shipway/carriers', protect, roles('admin', 'staff'), async (_q, s) => {
  try {
    const c = shipwayConfig();
    if (!shipwayReady(c)) return s.status(503).json({ message: 'Set SHIPWAY_USERNAME and SHIPWAY_LICENSE_KEY in the server environment.' });
    const data = await shipwayPost(c.carriersPath, {});
    const candidates = Array.isArray(data) ? data : (data.carriers || data.response || data.data || data.message || []);
    const carriers = Array.isArray(candidates) ? candidates : (Array.isArray(candidates?.carriers) ? candidates.carriers : []);
    s.json({ carriers, raw: carriers.length ? undefined : data });
  } catch (e) { s.status(502).json({ message: e.message, details: e.details }); }
});

// Shipway Experience PushOrderData accepts an existing courier AWB; it does not book a pickup or generate an AWB.
r.post('/:id/shipway-book', protect, roles('admin', 'staff'), async (q, s) => {
  try {
    const c = shipwayConfig();
    if (!shipwayReady(c)) return s.status(503).json({ message: 'Configure SHIPWAY_USERNAME and SHIPWAY_LICENSE_KEY in the server environment.' });
    if (!process.env.SHIPWAY_COMPANY_NAME) return s.status(503).json({ message: 'Set SHIPWAY_COMPANY_NAME in the server environment.' });
    const { awb, carrier_id, carrier_name } = q.body;
    if (!String(awb || '').trim() || !String(carrier_id || '').trim()) return s.status(400).json({ message: 'Enter the courier AWB number and Shipway carrier ID. PushOrderData tracks an existing shipment; it does not create one.' });
    const order = await Order.findById(q.params.id).populate('user', 'name email phone');
    if (!order) return s.status(404).json({ message: 'Order not found' });
    if (!order.user?.email || !order.user?.phone) return s.status(400).json({ message: 'Shipway Experience requires the customer email and phone number.' });
    const parts = String(order.user.name || order.customerName || 'StyleHub Customer').trim().split(/\s+/);
    const firstName = parts.shift() || 'Customer';
    const lastName = parts.join(' ') || '-';
    const productText = (order.items || []).map(i => `${i.name} x${i.quantity}`).join(', ').slice(0, 35) || 'StyleHub order';
    const payload = {
      carrier_id: Number(carrier_id), awb: String(awb).trim(), order_id: order.orderNumber,
      email: order.user.email, phone: String(order.user.phone), first_name: firstName,
      last_name: lastName, products: productText, Company: c.company
    };
    if (!Number.isInteger(payload.carrier_id) || payload.carrier_id <= 0) return s.status(400).json({ message: 'Carrier ID must be a positive number.' });
    const data = await shipwayPost(c.pushPath, payload);
    const success = String(data.status || '').toLowerCase() === 'success' || data.success === true;
    if (!success) return s.status(502).json({ message: data.message || 'Shipway did not confirm the tracking push.', details: data });
    order.shipment = { ...(order.shipment?.toObject?.() || order.shipment || {}), provider: 'Shipway Experience', carrier: String(carrier_name || data.carrier || data.courier_name || `Carrier ${payload.carrier_id}`).slice(0, 100), carrierId: payload.carrier_id, awb: payload.awb, trackingUrl: data.tracking_url || data.trackingUrl || '', bookedAt: new Date() };
    order.trackingId = payload.awb;
    if (order.status === 'placed' || order.status === 'processing' || order.status === 'packed') {
      order.status = 'shipped';
      order.statusHistory.push({ status: 'shipped', note: 'Existing courier AWB pushed to Shipway Experience', source: 'shipway' });
    }
    await order.save();
    s.json({ order, shipway: data, message: 'AWB successfully pushed to Shipway Experience.' });
  } catch (e) { s.status(502).json({ message: e.message, details: e.details }); }
});

// Manually refresh tracking from Shipway; customer orders also refresh via the normal My Orders polling/webhook.
r.post('/:id/shipway-sync', protect, roles('admin', 'staff'), async (q, s) => {
  try {
    const c = shipwayConfig();
    if (!shipwayReady(c)) return s.status(503).json({ message: 'Configure Shipway credentials first.' });
    const order = await Order.findById(q.params.id);
    if (!order) return s.status(404).json({ message: 'Order not found' });
    if (!order.shipment?.awb) return s.status(409).json({ message: 'Push a valid AWB to Shipway before syncing tracking.' });
    const data = await shipwayPost(c.trackingPath, { order_id: order.orderNumber });
    const nextStatus = shipwayStatus(data);
    const detail = data.response || data.data || data;
    order.shipment.lastSyncedAt = new Date();
    if (detail.carrier || detail.courier) order.shipment.carrier = detail.carrier || detail.courier;
    if (nextStatus && nextStatus !== order.status) {
      order.status = nextStatus;
      order.statusHistory.push({ status: nextStatus, note: `Shipway tracking sync: ${detail.current_status || detail.status || detail.current_status_code || 'status updated'}`, source: 'shipway' });
    }
    await order.save();
    s.json({ order, tracking: data });
  } catch (e) { s.status(502).json({ message: e.message, details: e.details }); }
});

// Shipway webhook callback. Accepts common AWB/status field names; unknown events are acknowledged without changing order state.
r.post('/shipway/webhook', async (q, s) => {
  try {
    const secret = process.env.SHIPWAY_WEBHOOK_SECRET;
    if (secret && q.headers['x-shipway-secret'] !== secret) return s.status(401).json({ message: 'Invalid webhook secret' });
    const body = q.body || {};
    const nested = body.response || body.data || body.shipment || body;
    const awb = String(nested.awb || nested.awb_number || nested.tracking_number || nested.order_tracking_number || '');
    if (!awb) return s.status(400).json({ message: 'AWB missing in webhook payload' });
    const order = await Order.findOne({ 'shipment.awb': awb });
    if (!order) return s.status(404).json({ message: 'Shipment not found' });
    const nextStatus = shipwayStatus(nested);
    order.shipment.lastSyncedAt = new Date();
    if (nextStatus && nextStatus !== order.status) {
      order.status = nextStatus;
      order.statusHistory.push({ status: nextStatus, note: `Shipway webhook: ${nested.current_status || nested.status || nested.current_status_code || 'status updated'}`, source: 'shipway' });
    }
    await order.save();
    s.json({ received: true, updated: Boolean(nextStatus) });
  } catch (e) { s.status(400).json({ message: e.message }); }
});

r.get('/:id/invoice', protect, async(q,s)=>{const order=await Order.findById(q.params.id).populate('user','name email phone');if(!order)return s.status(404).json({message:'Order not found'});if(String(order.user?._id||order.user)!==String(q.user._id)&&!['admin','staff'].includes(q.user.role))return s.status(403).json({message:'Not allowed'});s.json({invoiceNumber:order.invoiceNumber||('INV-'+order.orderNumber),orderNumber:order.orderNumber,createdAt:order.createdAt,customer:order.user,address:order.address,items:order.items,subtotal:order.subtotal,total:order.total,paymentMethod:order.paymentMethod,paymentStatus:order.paymentStatus});});
export default r;
