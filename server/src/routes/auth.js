import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import nodemailer from 'nodemailer';
import { randomInt } from 'node:crypto';
import { User, Otp } from '../models.js';
import { protect, roles } from '../middleware.js';
const r = Router();
const token = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });
const validPassword = p => typeof p === 'string' && p.length >= 8 && /[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\/;'`~]/.test(p);
const cleanEmail = v => (v || '').trim().toLowerCase();
const cleanPhone = v => (v || '').replace(/\D/g, '');
// async function deliverOtp({channel,destination,code,purpose}){
//   if(channel==='email'){
//     if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)throw Error('Email OTP is not configured. Add SMTP settings in server .env');
//     const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
//     await transport.sendMail({from:process.env.MAIL_FROM||process.env.SMTP_USER,to:destination,subject:`STYLEHUB ${purpose==='register'?'registration':'password reset'} OTP`,text:`Your STYLEHUB OTP is ${code}. It expires in 5 minutes. Do not share this code.`});
//     return;
//   }
//   if(channel==='phone'){
//     if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_FROM)throw Error('SMS OTP is not configured. Add Twilio settings in server .env');
//     const auth=Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
//     const body=new URLSearchParams({To:destination.startsWith('+')?destination:`+${destination}`,From:process.env.TWILIO_FROM,Body:`Your STYLEHUB OTP is ${code}. It expires in 5 minutes. Do not share it.`});
//     const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body});
//     if(!response.ok)throw Error('Could not send SMS OTP. Check Twilio settings and phone number.');
//     return;
//   }
//   throw Error('Choose email or mobile OTP');
// }
async function deliverOtp({ channel, destination, code, purpose }) {
  if (channel === 'email') {
    if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) throw Error('Email OTP is not configured');
    const response = await fetch('https://brevo.com', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'STYLEHUB', email: process.env.MAIL_FROM },
        to: [{ email: destination }],
        subject: `STYLEHUB ${purpose === 'register' ? 'registration' : 'password reset'} OTP`,
        textContent: `Your STYLEHUB OTP is ${code}. It expires in 5 minutes. Do not share this code.`
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw Error(`Brevo Error: ${errData.message || response.status}`);
    }
    return;
  }
  if (channel === 'phone') {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) throw Error('SMS OTP is not configured');
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const body = new URLSearchParams({ To: destination.startsWith('+') ? destination : `+${destination}`, From: process.env.TWILIO_FROM, Body: `Your STYLEHUB OTP is ${code}. It expires in 5 minutes. Do not share it.` });
    const response = await fetch(`https://twilio.com{process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw Error('Could not send SMS OTP');
    return;
  }
  throw Error('Choose email or mobile OTP');
}



r.post('/send-register-otp', async (q, s) => {
  try {
    const { name, email, phone, channel } = q.body; const e = cleanEmail(email), p = cleanPhone(phone);
    if (!name?.trim() || !channel || !(channel === 'email' ? e : p)) return s.status(400).json({ message: 'Name and a valid email or mobile number are required' });
    if (channel === 'email' && await User.findOne({ email: e })) return s.status(409).json({ message: 'Email already registered' });
    if (channel === 'phone' && await User.findOne({ phone: p })) return s.status(409).json({ message: 'Mobile number already registered' });
    const destination = channel === 'email' ? e : p; const code = String(randomInt(100000, 1000000));
    await Otp.deleteMany({ destination, purpose: 'register' });
    await Otp.create({ destination, channel, purpose: 'register', codeHash: await bcrypt.hash(code, 10), payload: { name: name.trim(), email: e, phone: p }, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    await deliverOtp({ channel, destination, code, purpose: 'register' }); s.json({ message: `OTP sent to your ${channel === 'email' ? 'email' : 'mobile number'}` });
  } catch (e) { s.status(400).json({ message: e.message }) }
});
r.post('/verify-register-otp', async (q, s) => {
  try {
    const { email, phone, channel, code, password } = q.body; const destination = channel === 'email' ? cleanEmail(email) : cleanPhone(phone);
    if (!validPassword(password)) return s.status(400).json({ message: 'Password must be at least 8 characters and include one special symbol' });
    const otp = await Otp.findOne({ destination, purpose: 'register', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!otp || !await bcrypt.compare(String(code || ''), otp.codeHash)) return s.status(400).json({ message: 'Invalid or expired OTP' });
    if (await User.findOne({ $or: [...(otp.payload.email ? [{ email: otp.payload.email }] : []), ...(otp.payload.phone ? [{ phone: otp.payload.phone }] : [])] })) return s.status(409).json({ message: 'Email or mobile number already registered' });
    const userData = { name: otp.payload.name, password: await bcrypt.hash(password, 12) }; if (otp.payload.email) userData.email = otp.payload.email; if (otp.payload.phone) userData.phone = otp.payload.phone; const u = await User.create(userData);
    await Otp.deleteMany({ destination, purpose: 'register' }); s.status(201).json({ token: token(u), user: safe(u) });
  } catch (e) { s.status(400).json({ message: e.message }) }
});
r.post('/login', async (q, s) => { try { const identifier = (q.body.identifier || q.body.email || '').trim(); const u = await User.findOne({ $or: [{ email: cleanEmail(identifier) }, { phone: cleanPhone(identifier) }] }); if (!u || !await bcrypt.compare(q.body.password || '', u.password)) return s.status(401).json({ message: 'Invalid login details' }); s.json({ token: token(u), user: safe(u) }) } catch (e) { s.status(400).json({ message: e.message }) } });
r.post('/forgot-password/send-otp', async (q, s) => { try { const { identifier, channel } = q.body; const dest = channel === 'email' ? cleanEmail(identifier) : cleanPhone(identifier); const u = await User.findOne(channel === 'email' ? { email: dest } : { phone: dest }); if (!u) return s.status(404).json({ message: 'No account found with this contact' }); const code = String(randomInt(100000, 1000000)); await Otp.deleteMany({ destination: dest, purpose: 'reset' }); await Otp.create({ destination: dest, channel, purpose: 'reset', codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + 5 * 60 * 1000) }); await deliverOtp({ channel, destination: dest, code, purpose: 'reset' }); s.json({ message: `Password reset OTP sent to your ${channel === 'email' ? 'email' : 'mobile'}` }) } catch (e) { s.status(400).json({ message: e.message }) } });
r.post('/forgot-password/reset', async (q, s) => { try { const { identifier, channel, code, newPassword } = q.body; const dest = channel === 'email' ? cleanEmail(identifier) : cleanPhone(identifier); if (!validPassword(newPassword)) return s.status(400).json({ message: 'Password must be at least 8 characters and include one special symbol' }); const otp = await Otp.findOne({ destination: dest, purpose: 'reset', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }); if (!otp || !await bcrypt.compare(String(code || ''), otp.codeHash)) return s.status(400).json({ message: 'Invalid or expired OTP' }); const u = await User.findOneAndUpdate(channel === 'email' ? { email: dest } : { phone: dest }, { password: await bcrypt.hash(newPassword, 12) }, { new: true }); if (!u) return s.status(404).json({ message: 'Account not found' }); await Otp.deleteMany({ destination: dest, purpose: 'reset' }); s.json({ message: 'Password updated successfully. Please login.' }) } catch (e) { s.status(400).json({ message: e.message }) } });
r.get('/me', protect, (q, s) => s.json({ user: safe(q.user) }));
r.post('/staff', protect, roles('admin'), async (q, s) => { try { const { name, email, password, phone } = q.body; if (!validPassword(password)) return s.status(400).json({ message: 'Password must be at least 8 characters and include one special symbol' }); if (await User.findOne({ email: cleanEmail(email) })) return s.status(409).json({ message: 'Email already exists' }); const staffData = { name, email: cleanEmail(email), password: await bcrypt.hash(password, 12), role: 'staff' }; if (cleanPhone(phone)) staffData.phone = cleanPhone(phone); const u = await User.create(staffData); s.status(201).json(safe(u)) } catch (e) { s.status(400).json({ message: e.message }) } });
r.post('/addresses', protect, async (q, s) => { const u = await User.findByIdAndUpdate(q.user._id, { $push: { addresses: q.body } }, { new: true }); s.json(u.addresses) });
export default r;
