import { Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react'; import { Routes, Route, Link, useNavigate } from 'react-router-dom'; import { ShoppingBag, Heart, User, ArrowRight, Search, LogOut, Download, Trash2, Plus, Minus, ScanLine, Eye, EyeOff, ImagePlus, Printer, Search as SearchIcon, CheckCircle2 } from 'lucide-react'; import { api, BASE } from './api';
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
function useAuth() {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('sh_user') || 'null'));
    return {
        user, login: d => {
            localStorage.setItem('sh_token', d.token);
            localStorage.setItem('sh_user', JSON.stringify(d.user));
            setUser(d.user)
        }, logout: () => {
            localStorage.clear();
            setUser(null)
        }
    }
}

function useStoreCounts() {
    const [counts, setCounts] = useState({
        cart: 0,
        wishlist: 0
    });

    useEffect(() => {
        const updateCounts = () => {
            const cart = JSON.parse(
                localStorage.getItem('sh_cart') || '[]'
            );

            const wish = JSON.parse(
                localStorage.getItem('sh_wish') || '[]'
            );

            setCounts({
                cart: cart.reduce(
                    (total, item) => total + item.quantity, 0
                ),
                wishlist: wish.length
            });
        };

        updateCounts();

        window.addEventListener('sh-cart-wish-update', updateCounts);

        return () => {
            window.removeEventListener(
                'sh-cart-wish-update',
                updateCounts
            );
        };
    }, []);

    return counts;
}
function Header({ a }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const counts = useStoreCounts();

    return (
        <header>
            <Link className="logo" to="/">
                STYLE<span>HUB.</span>
            </Link>

            <button
                className="menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
            >
                {menuOpen ? <X /> : <Menu />}
            </button>

            <nav className={menuOpen ? 'nav-open' : ''}>
                <Link to="/" onClick={() => setMenuOpen(false)}>
                    Shop
                </Link>

                {a.user?.role === 'customer' &&
                    <Link to="/orders" onClick={() => setMenuOpen(false)}>
                        My orders
                    </Link>
                }

                {a.user?.role === 'admin' &&
                    <Link to="/admin" onClick={() => setMenuOpen(false)}>
                        Admin
                    </Link>
                }

                {['admin', 'staff'].includes(a.user?.role) &&
                    <Link to="/pos" onClick={() => setMenuOpen(false)}>
                        POS Billing
                    </Link>
                }

                <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
                    <Heart size={16} />
                    Wishlist
                    <span className="count-badge">
                        {counts.wishlist}
                    </span>
                </Link>

                <Link to="/cart" onClick={() => setMenuOpen(false)}>
                    <ShoppingBag size={16} />
                    Cart
                    <span className="count-badge">
                        {counts.cart}
                    </span>
                </Link>

                {a.user ?
                    <button onClick={() => {
                        a.logout();
                        setMenuOpen(false);
                    }}>
                        <LogOut size={16} />
                        Logout
                    </button>
                    :
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                        <User size={16} />
                        Login
                    </Link>
                }


            </nav>
        </header>
    );
}
function Card({ p, add, wish, active = false }) { return <article className="product"><div className="photo"><img src={p.image || 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=700'} /><button className={'heart ' + (active ? 'heart-active' : '')} aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => wish(p)}><Heart size={18} fill={active ? 'currentColor' : 'none'} /></button><small>{p.category}</small></div><h3>{p.name}</h3><p>{p.description}</p><b>{money(p.price)}</b><button className="outline" onClick={() => add(p)}>Add to Cart <ArrowRight size={15} /></button></article> }
function Home() {
    const [ps, setPs] = useState([]), [s, S] = useState(''), [cat, C] = useState('All'), [max, M] = useState(''); const [carts, SC] = useState(JSON.parse(localStorage.getItem('sh_cart') || '[]')); const [w, SW] = useState(JSON.parse(localStorage.getItem('sh_wish') || '[]')); const [msg, SM] = useState(''); useEffect(() => { api('/products').then(setPs).catch(() => { }) }, []); const add = p => {
        const z = p.sizes?.find(x => x.stock > 0); if (!z) return SM('Out of stock'); const n = [...carts, { product: p._id, name: p.name, image: p.image, price: p.price, size: z.size, quantity: 1 }]; SC(n); localStorage.setItem('sh_cart', JSON.stringify(n)); window.dispatchEvent(
            new Event('sh-cart-wish-update')
        ); SM('Added to bag')
    }; const wish = p => { const n = w.some(x => x._id === p._id) ? w.filter(x => x._id !== p._id) : [...w, p]; SW(n); localStorage.setItem('sh_wish', JSON.stringify(n)) };
    window.dispatchEvent(
        new Event('sh-cart-wish-update')
    ); const shown = ps.filter(p => (!s || p.name.toLowerCase().includes(s.toLowerCase())) && (cat === 'All' || p.category === cat) && (!max || p.price <= +max)); return <><section className="hero"><div><small>THE NEW SEASON / 2026</small><h1>Dress sharp.<br /><i>Live bold.</i></h1><p>Modern essentials for men who make every day count. Discover your next favourite fit.</p><a className="btn" href="#shop">Explore collection <ArrowRight size={17} /></a><p className="micro">01 — 04　　CURATED FOR EVERYDAY</p></div><img src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=1200" /></section><div className="ticker">BUILT FOR YOUR EVERYDAY　 ✳　 PREMIUM FITS　 ✳　 MADE TO MOVE</div><main id="shop"><div className="heading"><div><small>THE STYLEHUB EDIT</small><h2>Shop the collection<span>.</span></h2></div><p>Considered pieces. Everyday confidence.</p></div><div className="filters"><label><Search /><input placeholder="Search products..." value={s} onChange={e => S(e.target.value)} /></label><select value={cat} onChange={e => C(e.target.value)}>{['All', ...new Set(ps.map(p => p.category))].map(x => <option>{x}</option>)}</select><input type="number" placeholder="Max price ₹" value={max} onChange={e => M(e.target.value)} /></div>{msg && <p className="msg">{msg}</p>}<div className="grid">{shown.map(p => <Card key={p._id} p={p} add={add} wish={wish} active={w.some(x => x._id === p._id)} />)}</div>{!shown.length && <p className="empty">No products yet. Admin can add products from the dashboard.</p>}</main><section className="promise"><div><small>THE STYLEHUB PROMISE</small><h2>Good clothes.<br /><i>Good energy.</i></h2></div><p>✳ Thoughtful everyday essentials<br /><br />✳ Easy orders & reliable delivery<br /><br />✳ Fits worth coming back for</p></section><footer><b className="logo">STYLE<span>HUB.</span></b><small>Everyday style, made simple. © 2026 STYLEHUB</small></footer></>
}
function PasswordField({ value, onChange, placeholder = 'Password' }) { const [show, S] = useState(false); return <><div className="password-wrap"><input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} required /><button type="button" className="password-toggle" onClick={() => S(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small className="password-help">Password must contain at least 8 characters and one special symbol (example: @, #, !, $).</small></> }
function Auth({ a, mode }) {
    const [step, ST] = useState('form'), [channel, CH] = useState('email'), [f, F] = useState({ name: '', email: '', phone: '', identifier: '', password: '', code: '', newPassword: '' }), [err, E] = useState(''), [busy, B] = useState(false), [show, S] = useState(false); const n = useNavigate();
    const set = (k, v) => F(old => ({ ...old, [k]: v })); const identifier = channel === 'email' ? f.email : f.phone;
    const sendRegister = async e => { e.preventDefault(); E(''); B(true); try { await api('/auth/send-register-otp', { method: 'POST', body: JSON.stringify({ name: f.name, email: f.email, phone: f.phone, channel }) }); ST('verify') } catch (x) { E(x.message) } finally { B(false) } };
    const verifyRegister = async e => { e.preventDefault(); E(''); B(true); try { const d = await api('/auth/verify-register-otp', { method: 'POST', body: JSON.stringify({ ...f, channel }) }); a.login(d); n('/') } catch (x) { E(x.message) } finally { B(false) } };
    const login = async e => { e.preventDefault(); E(''); B(true); try { a.login(await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: f.identifier, password: f.password }) })); n('/') } catch (x) { E(x.message) } finally { B(false) } };
    const sendReset = async e => { e.preventDefault(); E(''); B(true); try { await api('/auth/forgot-password/send-otp', { method: 'POST', body: JSON.stringify({ identifier: f.identifier, channel }) }); ST('reset') } catch (x) { E(x.message) } finally { B(false) } };
    const reset = async e => { e.preventDefault(); E(''); B(true); try { await api('/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify({ identifier: f.identifier, channel, code: f.code, newPassword: f.newPassword }) }); E('Password changed successfully. You can login now.'); ST('form') } catch (x) { E(x.message) } finally { B(false) } };
    return <main className="auth"><form onSubmit={mode === 'register' ? (step === 'form' ? sendRegister : verifyRegister) : mode === 'forgot' ? (step === 'form' ? sendReset : reset) : login}>
        <small>WELCOME TO STYLEHUB</small><h1>{mode === 'register' ? (step === 'form' ? 'Create your account.' : 'Verify your contact.') : mode === 'forgot' ? (step === 'form' ? 'Reset password.' : 'Create new password.') : 'Good to see you.'}</h1>
        {mode === 'register' && step === 'form' && <><input placeholder="Full name" required value={f.name} onChange={e => set('name', e.target.value)} /><div className="channel-row"><button type="button" className={channel === 'email' ? 'selected' : ''} onClick={() => CH('email')}>Email OTP</button><button type="button" className={channel === 'phone' ? 'selected' : ''} onClick={() => CH('phone')}>Mobile OTP</button></div>{channel === 'email' ? <input type="email" placeholder="Email address" required value={f.email} onChange={e => set('email', e.target.value)} /> : <input type="tel" placeholder="Mobile number with country code" required value={f.phone} onChange={e => set('phone', e.target.value)} />}</>}
        {mode === 'register' && step === 'verify' && <><p>OTP sent to your {channel === 'email' ? 'email address' : 'mobile number'}.</p><input placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength="6" required value={f.code} onChange={e => set('code', e.target.value)} /><PasswordField value={f.password} onChange={e => set('password', e.target.value)} placeholder="Create password" /></>}
        {mode === 'login' && <><input placeholder="Email or mobile number" required value={f.identifier} onChange={e => set('identifier', e.target.value)} /><div className="password-wrap"><input type={show ? 'text' : 'password'} placeholder="Password" required value={f.password} onChange={e => set('password', e.target.value)} /><button type="button" className="password-toggle" onClick={() => S(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="forgot-link"><Link to="/forgot-password">Forgot password?</Link></p></>}
        {mode === 'forgot' && step === 'form' && <><div className="channel-row"><button type="button" className={channel === 'email' ? 'selected' : ''} onClick={() => CH('email')}>Email OTP</button><button type="button" className={channel === 'phone' ? 'selected' : ''} onClick={() => CH('phone')}>Mobile OTP</button></div><input placeholder={channel === 'email' ? 'Registered email' : 'Registered mobile number'} required value={f.identifier} onChange={e => set('identifier', e.target.value)} /></>}
        {mode === 'forgot' && step === 'reset' && <><p>OTP sent to your registered {channel === 'email' ? 'email' : 'mobile'}.</p><input placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength="6" required value={f.code} onChange={e => set('code', e.target.value)} /><PasswordField value={f.newPassword} onChange={e => set('newPassword', e.target.value)} placeholder="New password" /></>}
        {err && <p className={err.startsWith('Password changed') ? 'success' : 'error'}>{err}</p>}<button className="btn" disabled={busy}>{busy ? 'Please wait...' : mode === 'register' ? (step === 'form' ? 'Send OTP' : 'Verify & create account') : mode === 'forgot' ? (step === 'form' ? 'Send reset OTP' : 'Update password') : 'Sign in'} <ArrowRight /></button>
        {mode === 'login' ? <p>New here? <Link to="/register">Register</Link></p> : mode === 'register' ? <p>Already a member? <Link to="/login">Login</Link></p> : <p><Link to="/login">Back to login</Link></p>}
    </form></main>
}
function Cart() {
    const [it, I] = useState(JSON.parse(localStorage.getItem('sh_cart') || '[]')); const n = useNavigate(), total = it.reduce((a, x) => a + x.price * x.quantity, 0); const save = v => {
        I(v); localStorage.setItem('sh_cart', JSON.stringify(v)); window.dispatchEvent(
            new Event('sh-cart-wish-update')
        );
    }; return <main className="page"><h1>Your bag<span>.</span></h1>{it.map((x, i) => <div className="cartrow"><img src={x.image} /><div>{x.name}<small>Size {x.size} · {money(x.price)}</small></div><input type="number" min="1" value={x.quantity} onChange={e => save(it.map((v, j) => i === j ? { ...v, quantity: +e.target.value } : v))} /><b>{money(x.price * x.quantity)}</b><button onClick={() => save(it.filter((_, j) => i !== j))}><Trash2 /></button></div>)}<h3 className="total">Subtotal: {money(total)}</h3><button className="btn" disabled={!it.length} onClick={() => n('/checkout')}>Checkout <ArrowRight /></button></main>
}
function Wishlist() {
    const [it, I] = useState(JSON.parse(localStorage.getItem('sh_wish') || '[]')); return <main className="page"><h1>Wishlist<span>.</span></h1><div className="grid">{it.map(p => <Card p={p} active={true} add={x => {
        let c = JSON.parse(localStorage.getItem('sh_cart') || '[]'), z = x.sizes.find(v => v.stock > 0); if (z) {
            c.push({ product: x._id, name: x.name, image: x.image, price: x.price, size: z.size, quantity: 1 }); localStorage.setItem('sh_cart', JSON.stringify(c)); window.dispatchEvent(
                new Event('sh-cart-wish-update')
            );
        }
    }} wish={x => {
        const v = it.filter(y => y._id !== x._id); I(v); localStorage.setItem('sh_wish', JSON.stringify(v)); window.dispatchEvent(
            new Event('sh-cart-wish-update')
        );
    }} />)}</div>{!it.length && <p>No saved items.</p>}</main>
}
function Checkout({ a }) { const [ad, A] = useState({ fullName: a.user?.name || '', phone: a.user?.phone || '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '' }), [err, E] = useState(''); const n = useNavigate(), items = JSON.parse(localStorage.getItem('sh_cart') || '[]'), total = items.reduce((v, x) => v + x.price * x.quantity, 0); const pay = async e => { e.preventDefault(); try { const p = await api('/orders/create-payment', { method: 'POST', body: JSON.stringify({ items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })) }) }); const rz = new window.Razorpay({ key: p.key, amount: p.amount, currency: p.currency, order_id: p.id, name: 'STYLEHUB', description: 'Clothing order', prefill: { name: ad.fullName, contact: ad.phone }, handler: async response => { try { await api('/orders/verify-payment', { method: 'POST', body: JSON.stringify({ ...response, items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })), address: ad }) }); localStorage.removeItem('sh_cart'); n('/orders') } catch (x) { E(x.message) } } }); rz.open() } catch (x) { E(x.message) } }; return <main className="page"><h1>Checkout<span>.</span></h1><form className="checkout" onSubmit={pay}><section className="panel"><h2>Delivery address</h2>{Object.keys(ad).map(k => <label>{k}<input required={k !== 'line2'} value={ad[k]} onChange={e => A({ ...ad, [k]: e.target.value })} /></label>)}</section><section className="panel"><h2>Order summary</h2>{items.map(x => <p>{x.name} · {x.size} × {x.quantity} <b>{money(x.price * x.quantity)}</b></p>)}<hr /><h3>Total {money(total)}</h3><small>Secure Razorpay checkout. Order is confirmed after server verification.</small>{err && <p className="error">{err}</p>}<button className="btn" disabled={!items.length}>Pay {money(total)}</button></section></form></main> }
function Orders() { const [o, O] = useState([]), [err, E] = useState(''); useEffect(() => { api('/orders/mine').then(O).catch(e => E(e.message)) }, []); return <main className="page"><h1>My orders<span>.</span></h1>{err && <p className="error">{err}</p>}{o.map(x => <div className="order" key={x._id}><div className="order-head"><b>{x.orderNumber}</b><span className="order-status">{String(x.status || 'placed').replaceAll('_', ' ')}</span></div><p className="tracking-line"><b>Tracking ID:</b> <strong>{x.trackingId || 'Being generated'}</strong></p><p>{money(x.total)} · Payment: {x.paymentStatus} · Method: {x.paymentMethod}</p><h3>Products in this order</h3>{(x.items || []).map((i, n) => <div className="order-item" key={i.product + '-' + i.size + '-' + n}>{i.image && <img src={i.image} alt={i.name} />}<div><b>{i.name}</b><small>Size: {i.size} · Quantity: {i.quantity} · Unit price: {money(i.price)}</small></div><strong>{money(i.price * i.quantity)}</strong></div>)}{x.address && <p className="order-address"><b>Delivery:</b> {[x.address.fullName, x.address.line1, x.address.line2, x.address.city, x.address.state, x.address.pincode, x.address.phone].filter(Boolean).join(', ')}</p>}<h3>Total: {money(x.total)}</h3></div>)}{!o.length && !err && <p>No online orders yet.</p>}</main> }
function Admin() {
    const [editingId, setEditingId] = useState(null), [p, P] = useState([]), [orders, SO] = useState([]), [sum, S] = useState({}), [m, M] = useState(''), [preview, PV] = useState(''), [file, FILE] = useState(null), [f, F] = useState({ name: '', description: '', category: 'Shirts', price: '', barcode: '', sizes: [{ size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }] }); const editProduct = (product) => {
        setEditingId(product._id);

        F({
            name: product.name,
            description: product.description || '',
            category: product.category,
            price: product.price,
            barcode: product.barcode || '',
            sizes: product.sizes.map(size => ({
                size: size.size,
                stock: size.stock
            }))
        });

        PV(product.image || '');
        FILE(null);

        window.scrollTo({

            behavior: 'smooth'
        });
    }; const load = () => api('/products').then(P); const loadOrders = () => api('/orders').then(SO).catch(e => M(e.message)); useEffect(() => { load(); loadOrders(); api('/reports/summary').then(S).catch(() => { }) }, []);
    const save = async (e) => {
        e.preventDefault();

        try {
            if (!editingId && !file) {
                throw Error('Please select a product image');
            }

            const data = new FormData();

            Object.entries(f).forEach(([k, v]) => {
                data.append(
                    k,
                    k === 'sizes' ? JSON.stringify(v) : v
                );
            });

            // New image selected என்றால் மட்டும் upload
            if (file) {
                data.append('imageFile', file);
            }

            if (editingId) {
                // UPDATE PRODUCT
                await api(`/products/${editingId}`, {
                    method: 'PUT',
                    body: data
                });

                M('Product updated successfully!');
            } else {
                // ADD NEW PRODUCT
                await api('/products', {
                    method: 'POST',
                    body: data
                });

                M('Product added successfully!');
            }

            // Reset form
            F({
                name: '',
                description: '',
                category: 'Shirts',
                price: '',
                barcode: '',
                sizes: [
                    { size: 'M', stock: 0 },
                    { size: 'L', stock: 0 },
                    { size: 'XL', stock: 0 }
                ]
            });

            setEditingId(null);
            FILE(null);
            PV('');

            e.target.reset();

            load();

        } catch (error) {
            M(error.message);
        }
    }; const dl = async t => { const r = await fetch(`${BASE}/reports/${t}.csv`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('sh_token') } }); if (!r.ok) return M('Download failed'); const u = URL.createObjectURL(await r.blob()), a = document.createElement('a'); a.href = u; a.download = `stylehub-${t}.csv`; a.click(); URL.revokeObjectURL(u) }; return <main className="page"><h1>Admin dashboard<span>.</span></h1><div className="stats"><b>Paid orders: {sum.paidOrders || 0}</b><b>Products: {sum.products || 0}</b><b>Revenue: {money(sum.revenue)}</b></div><section className="panel online-orders"><div className="online-orders-head"><div><small>WEBSITE CHECKOUT</small><h2>Online orders</h2></div><button type="button" className="outline" onClick={loadOrders}>Refresh orders</button></div>{orders.length ? orders.map(o => <article className="admin-order" key={o._id}><div className="admin-order-top"><div><b>{o.orderNumber}</b><small>{new Date(o.createdAt).toLocaleString('en-IN')} · {o.user?.name || o.customerName || 'Customer'} · {o.user?.email || o.user?.phone || o.customerPhone || ''}</small></div><strong>{money(o.total)}</strong></div><div className="admin-tracking"><label>Tracking ID<input value={o.trackingId || ''} placeholder="Tracking ID" onChange={e => SO(old => old.map(v => v._id === o._id ? { ...v, trackingId: e.target.value } : v))} /></label><label>Order status<select value={o.status || 'placed'} onChange={e => SO(old => old.map(v => v._id === o._id ? { ...v, status: e.target.value } : v))}>{['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(v => <option value={v}>{v.replaceAll('_', ' ')}</option>)}</select></label><button type="button" className="btn" onClick={async () => { try { const r = await api('/orders/' + o._id + '/tracking', { method: 'PATCH', body: JSON.stringify({ trackingId: o.trackingId, status: o.status }) }); SO(old => old.map(v => v._id === o._id ? r.order : v)); M('Tracking details updated successfully') } catch (e) { M(e.message) } }}>Save tracking</button></div><div className="admin-order-items">{(o.items || []).map((i, n) => <div className="admin-order-item" key={i.product + '-' + i.size + '-' + n}>{i.image && <img src={i.image} alt={i.name} />}<div><b>{i.name}</b><small>Size: {i.size} · Qty: {i.quantity} · Unit price: {money(i.price)}</small></div><strong>{money(i.price * i.quantity)}</strong></div>)}</div><p className="admin-delivery"><b>Payment:</b> {o.paymentStatus} ({o.paymentMethod}) · <b>Delivery:</b> {[o.address?.fullName, o.address?.line1, o.address?.line2, o.address?.city, o.address?.state, o.address?.pincode, o.address?.phone].filter(Boolean).join(', ') || 'Not provided'}</p></article>) : <p>No online orders received yet.</p>}{m && <p className="success">{m}</p>}</section><div className="checkout"><form className="panel" onSubmit={save}><h2>
        {editingId ? 'Edit Product' : 'Add Product'}
    </h2>{['name', 'description', 'category', 'price', 'barcode'].map(k => <label>{k}<input required={['name', 'category', 'price'].includes(k)} type={k === 'price' ? 'number' : 'text'} value={f[k]} onChange={e => F({ ...f, [k]: e.target.value })} /></label>)}<label className="upload-label"><ImagePlus /> Product image (JPG, PNG, WEBP, GIF, AVIF - max 5MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" required={!editingId} onChange={e => {
        const selected = e.target.files[0];
        FILE(selected || null);
        PV(selected ? URL.createObjectURL(selected) : preview);
    }} /></label>{preview && <img className="upload-preview" src={preview} alt="Selected product preview" />}<p className="upload-note">Selected image file will be saved in MongoDB with this product. No image URL required.</p><h3>Size / stock</h3>{f.sizes.map((z, i) => <div className="size"><input value={z.size} onChange={e => F({ ...f, sizes: f.sizes.map((v, j) => i === j ? { ...v, size: e.target.value } : v) })} /><input type="number" min="0" value={z.stock} onChange={e => F({ ...f, sizes: f.sizes.map((v, j) => i === j ? { ...v, stock: +e.target.value } : v) })} /></div>)}<button type="button" className="outline" onClick={() => F({ ...f, sizes: [...f.sizes, { size: '', stock: 0 }] })}><Plus /> Add size</button><p>{m}</p><button className="btn"> {editingId ? 'Update Product' : 'Save Product'}</button> {editingId && (
        <button
            type="button"
            className="outline"
            onClick={() => {
                setEditingId(null);
                FILE(null);
                PV('');
                F({
                    name: '',
                    description: '',
                    category: 'Shirts',
                    price: '',
                    barcode: '',
                    sizes: [
                        { size: 'M', stock: 0 },
                        { size: 'L', stock: 0 },
                        { size: 'XL', stock: 0 }
                    ]
                });
            }}
        >
            Cancel Edit
        </button>
    )}</form><section className="panel"><h2>Inventory</h2>{p.map(x => <div className="inventory" key={x._id}><img src={x.image} /><div><b>{x.name}</b><small>{x.sizes.map(z => z.size + ': ' + z.stock).join(' / ')}</small></div><button
        type="button"
        onClick={() => editProduct(x)}
    >
        Edit
    </button><button onClick={async () => { await api('/products/' + x._id, { method: 'DELETE' }); load() }}>Delete</button></div>)}<button className="outline" onClick={() => dl('stock')}><Download /> Stock CSV</button> <button className="outline" onClick={() => dl('sales')}><Download /> Sales CSV</button></section></div></main>
}
function POS() {
    const [products, SP] = useState([]), [search, SS] = useState(''), [category, SCat] = useState('All'), [code, C] = useState(''), [items, I] = useState([]), [sizes, SZ] = useState({}), [cust, U] = useState({ customerName: '', customerPhone: '' }), [method, M] = useState('cash'), [msg, G] = useState(''), [busy, B] = useState(false), [completed, Done] = useState(null);
    useEffect(() => { api('/products').then(SP).catch(e => G(e.message)) }, []);
    const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    const shown = products.filter(p => (category === 'All' || p.category === category) && (!search || [p.name, p.category, p.barcode].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))));
    const moneyTotal = items.reduce((a, x) => a + x.price * x.quantity, 0);
    const addProduct = (p, size) => { const stock = p.sizes?.find(z => z.size === size)?.stock || 0; if (!stock) return G('Selected size is out of stock'); const existing = items.find(x => x.product === p._id && x.size === size); if (existing && existing.quantity >= stock) return G('Available stock limit reached'); I(old => existing ? old.map(x => x.product === p._id && x.size === size ? { ...x, quantity: x.quantity + 1 } : x) : [...old, { product: p._id, name: p.name, image: p.image, size, price: p.price, quantity: 1, stock, barcode: p.barcode }]); G(p.name + ' added to bill'); Done(null) };
    const scan = async () => { if (!code.trim()) return; try { const p = await api('/products/barcode/' + encodeURIComponent(code.trim())); const z = p.sizes?.find(x => x.stock > 0); if (!z) throw Error('This product is out of stock'); addProduct(p, z.size) } catch (e) { G(e.message) } C('') };
    const changeQty = (item, delta) => { I(old => old.map(x => x.product === item.product && x.size === item.size ? { ...x, quantity: Math.max(1, Math.min(x.stock, x.quantity + delta)) } : x)) };
    const remove = (item) => I(old => old.filter(x => !(x.product === item.product && x.size === item.size)));
    const printReceipt = () => { if (!completed) return; const o = completed; const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); const rows = (o.items || []).map(x => `<tr><td>${esc(x.name)}<small>Size: ${esc(x.size)} × ${x.quantity}</small></td><td>₹${Number(x.price).toFixed(2)}</td><td>₹${(Number(x.price) * Number(x.quantity)).toFixed(2)}</td></tr>`).join(''); const w = window.open('', '_blank', 'width=420,height=720'); if (!w) { G('Please allow pop-ups to print the receipt'); return } w.document.write(`<!doctype html><html><head><title>Receipt ${esc(o.orderNumber)}</title><style>body{font:13px Arial,sans-serif;color:#111;padding:18px;max-width:340px;margin:auto}h1{text-align:center;font-size:22px;letter-spacing:2px;margin:5px}p{text-align:center;margin:5px 0 14px;color:#555}.line{border-top:1px dashed #555;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:7px 2px;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}small{display:block;color:#555;margin-top:4px}.total{display:flex;justify-content:space-between;font-weight:bold;font-size:17px}.thanks{text-align:center;margin-top:22px;font-weight:bold}@media print{button{display:none}body{padding:0}}</style></head><body><h1>STYLEHUB</h1><p>Everyday style, made simple</p><div class="line"></div><div>Bill: ${esc(o.orderNumber)}</div><div>Date: ${new Date(o.createdAt || Date.now()).toLocaleString('en-IN')}</div><div>Customer: ${esc(o.customerName)}</div><div>Mobile: ${esc(o.customerPhone)}</div><div class="line"></div><table>${rows}</table><div class="line"></div><div class="total"><span>Grand Total</span><span>₹${Number(o.total || 0).toFixed(2)}</span></div><p>Payment: ${esc(String(o.paymentMethod || '').toUpperCase())}</p><div class="line"></div><div class="thanks">Thank you for shopping with us!</div><p>Visit again</p><script>window.onload=()=>window.print();<\/script></body></html>`); w.document.close() };
    const bill = async () => { if (!items.length) return G('Add at least one product'); if (!cust.customerName.trim() || !cust.customerPhone.trim()) return G('Enter customer name and mobile number'); B(true); G(''); try { const d = await api('/pos/checkout', { method: 'POST', body: JSON.stringify({ ...cust, items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })), paymentMethod: method }) }); Done(d.order); I([]); G('Bill completed successfully. Receipt is ready to print.'); api('/products').then(SP).catch(() => { }) } catch (e) { G(e.message) } finally { B(false) } };
    return <main className="pos-page"><div className="pos-top"><div><small>RETAIL CHECKOUT / STYLEHUB</small><h1>Point of sale<span>.</span></h1><p>Scan a barcode or find products manually. Both ways update the same inventory.</p></div><div className="pos-live"><span></span> BILLING COUNTER</div></div>
        <section className="pos-layout"><div className="pos-catalog panel"><div className="pos-section-head"><div><small>PRODUCT CATALOGUE</small><h2>Find your items</h2></div><span className="pos-count">{shown.length} products</span></div>
            <div className="scanner-box"><div className="scanner-icon"><ScanLine size={22} /></div><div className="scanner-input"><b>Barcode scanner</b><small>Connect USB scanner or type barcode manually</small><input autoComplete="off" placeholder="Scan barcode and press Enter" value={code} onChange={e => C(e.target.value)} onKeyDown={e => e.key === 'Enter' && scan()} /></div><button className="btn" onClick={scan}>Add code</button></div>
            <div className="pos-search-row"><label className="pos-search"><input placeholder="Search product name, category or barcode..." value={search} onChange={e => SS(e.target.value)} /></label><select value={category} onChange={e => SCat(e.target.value)} aria-label="Filter collection">{categories.map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="pos-products">{shown.map(p => { const available = (p.sizes || []).reduce((n, z) => n + Number(z.stock || 0), 0), size = sizes[p._id] || p.sizes?.find(z => z.stock > 0)?.size || ''; return <article className="pos-product" key={p._id}><div className="pos-product-image">{p.image ? <img src={p.image} alt={p.name} /> : <div className="pos-no-image">STYLEHUB</div>}<span>{p.category}</span></div><div className="pos-product-info"><b>{p.name}</b><strong>{money(p.price)}</strong><small>{available > 0 ? available + ' in stock' : 'Out of stock'}</small><div className="pos-product-actions"><select disabled={!available} value={size} onChange={e => SZ({ ...sizes, [p._id]: e.target.value })}>{(p.sizes || []).map(z => <option key={z.size} value={z.size} disabled={!z.stock}>{z.size} · {z.stock}</option>)}</select><button disabled={!available} onClick={() => addProduct(p, size)}><Plus size={16} /> Add</button></div></div></article> })}{!shown.length && <div className="pos-empty">No matching products. Try another search or collection.</div>}</div></div>
            <aside className="pos-checkout panel"><div className="pos-section-head"><div><small>ACTIVE TRANSACTION</small><h2>Current bill</h2></div><span className="cart-pill">{items.reduce((n, x) => n + x.quantity, 0)} items</span></div>
                <div className="pos-cart-list">{items.map(x => <div className="pos-cart-item" key={x.product + '-' + x.size}><div className="pos-cart-thumb">{x.image ? <img src={x.image} alt="" /> : <ShoppingBag size={18} />}</div><div className="pos-cart-detail"><b>{x.name}</b><small>Size {x.size} · {money(x.price)}</small><div className="qty-control"><button onClick={() => changeQty(x, -1)}><Minus size={13} /></button><span>{x.quantity}</span><button disabled={x.quantity >= x.stock} onClick={() => changeQty(x, 1)}><Plus size={13} /></button></div></div><div className="pos-cart-price"><b>{money(x.price * x.quantity)}</b><button onClick={() => remove(x)} aria-label="Remove item"><Trash2 size={15} /></button></div></div>)}{!items.length && <div className="pos-cart-empty"><ShoppingBag size={28} /><b>Your bill is empty</b><span>Scan a barcode or add an item from the catalogue</span></div>}</div>
                <div className="pos-customer"><small>CUSTOMER DETAILS</small><input placeholder="Customer name" value={cust.customerName} onChange={e => U({ ...cust, customerName: e.target.value })} /><input placeholder="Mobile number" value={cust.customerPhone} onChange={e => U({ ...cust, customerPhone: e.target.value })} /></div>
                <div className="pos-payment"><small>PAYMENT METHOD</small><div className="payment-options">{[['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card']].map(([v, l]) => <button key={v} className={method === v ? 'active' : ''} onClick={() => M(v)}>{l}</button>)}</div></div>
                <div className="pos-total"><span>Items subtotal</span><b>{money(moneyTotal)}</b></div><div className="pos-grand"><span>Grand total</span><strong>{money(moneyTotal)}</strong></div>
                {msg && <p className={completed ? 'pos-success' : 'pos-message'}>{completed ? <CheckCircle2 size={16} /> : null}{msg}</p>}
                {completed ? <button className="btn pos-complete" onClick={printReceipt}><Printer size={18} /> Print customer receipt</button> : <button className="btn pos-complete" disabled={!items.length || busy} onClick={bill}>{busy ? 'Processing...' : 'Complete bill'} <ArrowRight size={17} /></button>}
                {completed && <button className="pos-new-bill" onClick={() => { Done(null); U({ customerName: '', customerPhone: '' }); M('cash'); G('New bill started') }}>Start new bill</button>}
            </aside></section><p className="pos-footnote">Tip: A USB barcode scanner behaves like a keyboard. Click the barcode field once, then scan. Manual search works even without a scanner.</p></main>
}
export default function App() { const a = useAuth(); return <><Header a={a} /><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<Auth a={a} mode="login" />} /><Route path="/register" element={<Auth a={a} mode="register" />} /><Route path="/forgot-password" element={<Auth a={a} mode="forgot" />} /><Route path="/cart" element={<Cart />} /><Route path="/wishlist" element={<Wishlist />} /><Route path="/checkout" element={a.user ? <Checkout a={a} /> : <Auth a={a} mode="login" />} /><Route path="/orders" element={a.user ? <Orders /> : <Auth a={a} mode="login" />} /><Route path="/admin" element={a.user?.role === 'admin' ? <Admin /> : <Auth a={a} mode="login" />} /><Route path="/pos" element={['admin', 'staff'].includes(a.user?.role) ? <POS /> : <Auth a={a} mode="login" />} /></Routes></> }
