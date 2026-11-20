import { Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react'; import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'; import { ShoppingBag, Heart, User, ArrowRight, Search, LogOut, Download, Trash2, Plus, Minus, ScanLine, Eye, EyeOff, ImagePlus, Printer, Search as SearchIcon, CheckCircle2 } from 'lucide-react'; import { api, BASE } from './api';
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
function cartNow(){ return JSON.parse(localStorage.getItem('sh_cart') || '[]'); }
function saveCart(items){ localStorage.setItem('sh_cart', JSON.stringify(items)); window.dispatchEvent(new Event('sh-cart-wish-update')); }
function Card({ p, wish, active = false, onAdd, quantity = 0, onIncrement, onDecrement }) {
 const images=p.images?.length?p.images:[p.image].filter(Boolean);
 return <article className="product group"><Link to={`/product/${p._id}`} className="photo product-photo"><img src={images[0] || 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=700'} alt={p.name}/><span className="product-view">Quick view <ArrowRight size={14}/></span><small>{p.category}</small></Link><button className={'heart '+(active?'heart-active':'')} onClick={()=>wish(p)} aria-label="Wishlist"><Heart size={18} fill={active?'currentColor':'none'}/></button><div className="product-meta"><Link to={`/product/${p._id}`}><h3>{p.name}</h3></Link><b>{money(p.price)}</b></div><p>{p.description}</p>{quantity>0?<div className="card-qty"><button onClick={()=>onDecrement?.(p)}><Minus size={15}/></button><b>{quantity}</b><button onClick={()=>onIncrement?.(p)}><Plus size={15}/></button></div>:<button className="outline" onClick={()=>onAdd(p)}>Choose size <ArrowRight size={15}/></button>}</article>
}
function SizePicker({product,onClose,onAdded}) {
 const [size,S]=useState(''); const [msg,M]=useState('');
 if(!product)return null;
 const add=()=>{const stock=product.sizes?.find(z=>z.size===size)?.stock||0;if(!size)return M('Please select a size');if(!stock)return M('This size is out of stock');const old=cartNow(),idx=old.findIndex(x=>x.product===product._id&&x.size===size);let next;if(idx>=0){next=old.map((x,i)=>i===idx?{...x,quantity:Math.min(stock,x.quantity+1),stock}:x);if(old[idx].quantity>=stock)return M('Stock limit reached')}else next=[...old,{product:product._id,name:product.name,image:product.image,images:product.images||[],price:product.price,size,quantity:1,stock}];saveCart(next);onAdded?.();onClose();};
 return <div className="modal-backdrop" onClick={onClose}><section className="size-modal rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}><X/></button><img src={product.image} alt=""/><div><small>SELECT YOUR FIT</small><h2>{product.name}</h2><b>{money(product.price)}</b><p>Choose a size to add this item to your bag.</p><div className="size-choices">{(product.sizes||[]).map(z=><button key={z.size} disabled={!z.stock} className={size===z.size?'selected':''} onClick={()=>S(z.size)}>{z.size}{!z.stock?' · Sold out':''}</button>)}</div>{msg&&<p className="error">{msg}</p>}<button className="btn" onClick={add}>Add to bag <ShoppingBag size={16}/></button></div></section></div>
}
function Home() {
 const [ps,setPs]=useState([]),[cats,setCats]=useState([]),[s,S]=useState(''),[cat,C]=useState('All'),[sortBy,SortBy]=useState('popular'),[wish,W]=useState(JSON.parse(localStorage.getItem('sh_wish')||'[]')),[cart,CartState]=useState(cartNow()),[picker,Pick]=useState(null);
 useEffect(()=>{api('/products').then(setPs).catch(()=>{});api('/categories').then(setCats).catch(()=>{});const sync=()=>CartState(cartNow());window.addEventListener('sh-cart-wish-update',sync);return()=>window.removeEventListener('sh-cart-wish-update',sync);},[]);
 const toggleWish=p=>{const n=wishList(p);W(n);localStorage.setItem('sh_wish',JSON.stringify(n));window.dispatchEvent(new Event('sh-cart-wish-update'));};
 const wishList=p=>wish.some(x=>x._id===p._id)?wish.filter(x=>x._id!==p._id):[...wish,p];
 const filtered=ps.filter(p=>(!s||p.name.toLowerCase().includes(s.toLowerCase()))&&(cat==='All'||p.category===cat));
 const shown=[...filtered].sort((a,b)=>{
  if(sortBy==='price-low')return Number(a.price||0)-Number(b.price||0);
  if(sortBy==='price-high')return Number(b.price||0)-Number(a.price||0);
  if(sortBy==='newest')return new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime();
  const popularity=p=>Number(p.reviewCount||p.reviewsCount||p.soldCount||p.salesCount||0)+(Number(p.averageRating||p.rating||0)*10);
  return popularity(b)-popularity(a);
 });
 return <><section className="hero"><div><small>THE NEW SEASON / STYLEHUB EDIT</small><h1>Dress sharp.<br/><i>Live bold.</i></h1><p>Modern essentials for everyday confidence. Discover pieces made to move with you.</p><a className="btn" href="#shop">Explore collection <ArrowRight size={17}/></a><p className="micro">01 — CURATED FOR EVERYDAY</p></div><img src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=1200" alt="StyleHub collection"/></section><div className="ticker">BUILT FOR YOUR EVERYDAY　 ✳　 PREMIUM FITS　 ✳　 MADE TO MOVE</div><main id="shop"><div className="heading"><div><small>THE STYLEHUB EDIT</small><h2>Shop the collection<span>.</span></h2></div><p>Considered pieces. Everyday confidence.</p></div><div className="category-strip flex items-center gap-2 overflow-x-auto"><button className={cat==='All'?'active':''} onClick={()=>C('All')}>All products</button>{cats.map(x=><button key={x._id} className={cat===x.name?'active':''} onClick={()=>C(x.name)}>{x.name}</button>)}</div><div className="filters"><label><Search/><input placeholder="Search products..." value={s} onChange={e=>S(e.target.value)}/></label><select aria-label="Filter by category" value={cat} onChange={e=>C(e.target.value)}><option value="All">All categories</option>{cats.map(x=><option key={x._id} value={x.name}>{x.name}</option>)}</select><select aria-label="Sort products" value={sortBy} onChange={e=>SortBy(e.target.value)}><option value="popular">Popularity</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="newest">Newest</option></select></div><div className="grid">{shown.map(p=><Card key={p._id} p={p} wish={toggleWish} active={wish.some(x=>x._id===p._id)} quantity={cart.filter(x=>x.product===p._id).reduce((n,x)=>n+x.quantity,0)} onAdd={Pick} onIncrement={product=>{const row=cart.find(x=>x.product===product._id);if(!row)return Pick(product);if(row.quantity>=Number(row.stock||99))return;const next=cart.map(x=>x===row?{...x,quantity:x.quantity+1}:x);CartState(next);saveCart(next)}} onDecrement={product=>{const row=cart.find(x=>x.product===product._id);if(!row)return;const next=row.quantity<=1?cart.filter(x=>x!==row):cart.map(x=>x===row?{...x,quantity:x.quantity-1}:x);CartState(next);saveCart(next)}}/>)}</div>{!shown.length&&<p className="empty">No products found in this collection.</p>}</main><section className="promise"><div><small>THE STYLEHUB PROMISE</small><h2>Good clothes.<br/><i>Good energy.</i></h2></div><p>✳ Thoughtful everyday essentials<br/><br/>✳ Easy orders & reliable delivery<br/><br/>✳ Fits worth coming back for</p></section><footer><b className="logo">STYLE<span>HUB.</span></b><small>Everyday style, made simple. © 2026 STYLEHUB</small></footer><SizePicker product={picker} onClose={()=>Pick(null)}/></>
}
function ProductDetails(){
 const {id}=useParams();const [p,P]=useState(null),[reviews,R]=useState({reviews:[],average:0,count:0}),[img,I]=useState(0),[picker,Pick]=useState(null),[err,E]=useState('');
 useEffect(()=>{api('/products').then(a=>P(a.find(x=>x._id===id)||null)).catch(e=>E(e.message));api('/reviews/product/'+id).then(R).catch(()=>{});},[id]);
 if(!p)return <main className="page"><p>{err||'Loading product...'}</p></main>;
 const imgs=p.images?.length?p.images:[p.image].filter(Boolean);
 return <main className="page product-detail mx-auto max-w-7xl px-6 py-10"><div className="detail-gallery"><div className="detail-thumbs">{imgs.map((x,i)=><button className={img===i?'active':''} onClick={()=>I(i)} key={i}><img src={x}/></button>)}</div><div className="detail-main-image"><img src={imgs[img]||p.image} alt={p.name}/></div></div><section className="detail-info"><small>{p.category} / STYLEHUB</small><h1>{p.name}</h1><div className="review-summary">⭐ {reviews.average.toFixed(1)} · {reviews.count} verified reviews</div><h2>{money(p.price)}</h2><p>{p.description}</p><div className="detail-size"><b>Available sizes</b><div>{(p.sizes||[]).map(z=><span className={!z.stock?'sold':''} key={z.size}>{z.size} {z.stock?'':'· Out of stock'}</span>)}</div></div><button className="btn" onClick={()=>Pick(p)}>Choose size & add to cart <ShoppingBag/></button><p className="detail-note">Secure checkout · Easy order tracking · Quality essentials</p></section><section className="review-section"><small>THE COMMUNITY</small><h2>Customer reviews<span>.</span></h2>{reviews.reviews.map(r=><article className="review-card" key={r._id}><b>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</b><h3>{r.title||'Verified purchase'}</h3><p>{r.comment}</p><small>{r.user?.name||'Customer'} · {new Date(r.createdAt).toLocaleDateString('en-IN')}</small><div className="review-images">{(r.images||[]).map((x,i)=><img key={i} src={x}/>)}</div></article>)}{!reviews.count&&<p>No reviews yet. Be the first to share your experience after purchase.</p>}</section><SizePicker product={picker} onClose={()=>Pick(null)}/></main>
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
function Cart(){const [it,I]=useState(cartNow());const n=useNavigate();const total=it.reduce((a,x)=>a+x.price*x.quantity,0);const save=v=>{I(v);saveCart(v)};const qty=(item,d)=>save(it.map(x=>x.product===item.product&&x.size===item.size?{...x,quantity:Math.max(1,Math.min(Number(x.stock||99),x.quantity+d))}:x));return <main className="page"><h1>Your bag<span>.</span></h1>{it.map((x,i)=><div className="cartrow" key={x.product+'-'+x.size}><img src={x.image}/><div><b>{x.name}</b><small>Size {x.size} · {money(x.price)}</small></div><div className="qty-control"><button onClick={()=>qty(x,-1)}><Minus/></button><b>{x.quantity}</b><button disabled={x.quantity>=Number(x.stock||99)} onClick={()=>qty(x,1)}><Plus/></button></div><b>{money(x.price*x.quantity)}</b><button onClick={()=>save(it.filter((_,j)=>j!==i))}><Trash2/></button></div>)}{!it.length&&<p>Your bag is empty. Explore the collection to find your fit.</p>}<h3 className="total">Subtotal: {money(total)}</h3><button className="btn" disabled={!it.length} onClick={()=>n('/checkout')}>Checkout <ArrowRight/></button></main>}
function Wishlist(){const [it,I]=useState(JSON.parse(localStorage.getItem('sh_wish')||'[]')),[picker,Pick]=useState(null);const remove=x=>{const v=it.filter(y=>y._id!==x._id);I(v);localStorage.setItem('sh_wish',JSON.stringify(v));window.dispatchEvent(new Event('sh-cart-wish-update'))};return <main className="page"><h1>Wishlist<span>.</span></h1><div className="grid">{it.map(p=><Card key={p._id} p={p} active wish={remove} onAdd={Pick}/>)}</div>{!it.length&&<p>No saved items.</p>}<SizePicker product={picker} onClose={()=>Pick(null)}/></main>}
function Checkout({ a }) { const [ad, A] = useState({ fullName: a.user?.name || '', phone: a.user?.phone || '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '' }), [err, E] = useState(''); const n = useNavigate(), items = JSON.parse(localStorage.getItem('sh_cart') || '[]'), total = items.reduce((v, x) => v + x.price * x.quantity, 0); const pay = async e => { e.preventDefault(); try { const p = await api('/orders/create-payment', { method: 'POST', body: JSON.stringify({ items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })) }) }); const rz = new window.Razorpay({ key: p.key, amount: p.amount, currency: p.currency, order_id: p.id, name: 'STYLEHUB', description: 'Clothing order', prefill: { name: ad.fullName, contact: ad.phone }, handler: async response => { try { await api('/orders/verify-payment', { method: 'POST', body: JSON.stringify({ ...response, items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })), address: ad }) }); localStorage.removeItem('sh_cart'); n('/orders') } catch (x) { E(x.message) } } }); rz.open() } catch (x) { E(x.message) } }; return <main className="page"><h1>Checkout<span>.</span></h1><form className="checkout" onSubmit={pay}><section className="panel"><h2>Delivery address</h2>{Object.keys(ad).map(k => <label>{k}<input required={k !== 'line2'} value={ad[k]} onChange={e => A({ ...ad, [k]: e.target.value })} /></label>)}</section><section className="panel"><h2>Order summary</h2>{items.map(x => <p>{x.name} · {x.size} × {x.quantity} <b>{money(x.price * x.quantity)}</b></p>)}<hr /><h3>Total {money(total)}</h3><small>Secure Razorpay checkout. Order is confirmed after server verification.</small>{err && <p className="error">{err}</p>}<button className="btn" disabled={!items.length}>Pay {money(total)}</button></section></form></main> }
function ReviewForm({productId,orderId}){const [rating,R]=useState(5),[title,T]=useState(''),[comment,C]=useState(''),[files,F]=useState([]),[msg,M]=useState('');const submit=async e=>{e.preventDefault();try{const d=new FormData();d.append('rating',rating);d.append('title',title);d.append('comment',comment);d.append('orderId',orderId);files.slice(0,3).forEach(f=>d.append('reviewImages',f));await api('/reviews/'+productId,{method:'POST',body:d});M('Review submitted. Thank you!');}catch(x){M(x.message)}};return <form className="review-form" onSubmit={submit}><b>Share your fit review</b><div className="rating-picker">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>R(n)} className={n<=rating?'chosen':''}>★</button>)}</div><input placeholder="Review title (optional)" value={title} onChange={e=>T(e.target.value)}/><textarea placeholder="Tell others about the fit, fabric and quality..." value={comment} onChange={e=>C(e.target.value)}/><label>Add photos (up to 3)<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e=>F(Array.from(e.target.files||[]).slice(0,3))}/></label><button className="outline">Submit review</button>{msg&&<small>{msg}</small>}</form>}
function Orders() { const [o, O] = useState([]), [err, E] = useState(''); useEffect(() => { api('/orders/mine').then(O).catch(e => E(e.message)) }, []); return <main className="page"><h1>My orders<span>.</span></h1>{err && <p className="error">{err}</p>}{o.map(x => <div className="order" key={x._id}><div className="order-head"><b>{x.orderNumber}</b><span className="order-status">{String(x.status || 'placed').replaceAll('_', ' ')}</span></div><p className="tracking-line"><b>Tracking ID:</b> <strong>{x.trackingId || 'Being generated'}</strong></p><p>{money(x.total)} · Payment: {x.paymentStatus} · Method: {x.paymentMethod}</p><h3>Products in this order</h3>{(x.items || []).map((i, n) => <div className="order-item" key={i.product + '-' + i.size + '-' + n}>{i.image && <img src={i.image} alt={i.name} />}<div><b>{i.name}</b><small>Size: {i.size} · Quantity: {i.quantity} · Unit price: {money(i.price)}</small><ReviewForm productId={i.product} orderId={x._id}/></div><strong>{money(i.price * i.quantity)}</strong></div>)}{x.address && <p className="order-address"><b>Delivery:</b> {[x.address.fullName, x.address.line1, x.address.line2, x.address.city, x.address.state, x.address.pincode, x.address.phone].filter(Boolean).join(', ')}</p>}<h3>Total: {money(x.total)}</h3></div>)}{!o.length && !err && <p>No online orders yet.</p>}</main> }
function Admin() {
    const [editingId, setEditingId] = useState(null), [p, P] = useState([]), [orders, SO] = useState([]), [sum, S] = useState({}), [m, M] = useState(''), [preview, PV] = useState([]), [files, FILES] = useState([]), [categories, CATS] = useState([]), [newCategory, NEWCAT] = useState(''), [f, F] = useState({ name: '', description: '', category: 'Shirts', price: '', barcode: '', sizes: [{ size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }] }); const editProduct = (product) => {
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

        PV(product.images?.length ? product.images : [product.image].filter(Boolean));
        FILES([]);

        window.scrollTo({

            behavior: 'smooth'
        });
    }; const load = () => api('/products').then(P); const loadCategories = () => api('/categories').then(CATS).catch(() => {}); const loadOrders = () => api('/orders').then(SO).catch(e => M(e.message)); useEffect(() => { load(); loadOrders(); loadCategories(); api('/reports/summary').then(S).catch(() => { }) }, []);
    const save = async (e) => {
        e.preventDefault();

        try {
            if (!editingId && !files.length) { throw Error('Please select 1 to 3 product images'); }

            const data = new FormData();

            Object.entries(f).forEach(([k, v]) => {
                data.append(
                    k,
                    k === 'sizes' ? JSON.stringify(v) : v
                );
            });

            // Upload up to three product gallery images
            files.forEach(file => data.append('imageFiles', file));

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
            FILES([]);
            PV([]);

            e.target.reset();

            load();

        } catch (error) {
            M(error.message);
        }
    }; const dl = async t => { const r = await fetch(`${BASE}/reports/${t}.csv`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('sh_token') } }); if (!r.ok) return M('Download failed'); const u = URL.createObjectURL(await r.blob()), a = document.createElement('a'); a.href = u; a.download = `stylehub-${t}.csv`; a.click(); URL.revokeObjectURL(u) }; return <main className="page"><h1>Admin dashboard<span>.</span></h1><div className="stats"><b>Paid orders: {sum.paidOrders || 0}</b><b>Products: {sum.products || 0}</b><b>Revenue: {money(sum.revenue)}</b></div><section className="panel online-orders"><div className="online-orders-head"><div><small>WEBSITE CHECKOUT</small><h2>Online orders</h2></div><button type="button" className="outline" onClick={loadOrders}>Refresh orders</button></div>{orders.length ? orders.map(o => <article className="admin-order" key={o._id}><div className="admin-order-top"><div><b>{o.orderNumber}</b><small>{new Date(o.createdAt).toLocaleString('en-IN')} · {o.user?.name || o.customerName || 'Customer'} · {o.user?.email || o.user?.phone || o.customerPhone || ''}</small></div><strong>{money(o.total)}</strong></div><div className="admin-tracking"><label>Tracking ID<input value={o.trackingId || ''} placeholder="Tracking ID" onChange={e => SO(old => old.map(v => v._id === o._id ? { ...v, trackingId: e.target.value } : v))} /></label><label>Order status<select value={o.status || 'placed'} onChange={e => SO(old => old.map(v => v._id === o._id ? { ...v, status: e.target.value } : v))}>{['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(v => <option value={v}>{v.replaceAll('_', ' ')}</option>)}</select></label><button type="button" className="btn" onClick={async () => { try { const r = await api('/orders/' + o._id + '/tracking', { method: 'PATCH', body: JSON.stringify({ trackingId: o.trackingId, status: o.status }) }); SO(old => old.map(v => v._id === o._id ? r.order : v)); M('Tracking details updated successfully') } catch (e) { M(e.message) } }}>Save tracking</button></div><div className="admin-order-items">{(o.items || []).map((i, n) => <div className="admin-order-item" key={i.product + '-' + i.size + '-' + n}>{i.image && <img src={i.image} alt={i.name} />}<div><b>{i.name}</b><small>Size: {i.size} · Qty: {i.quantity} · Unit price: {money(i.price)}</small></div><strong>{money(i.price * i.quantity)}</strong></div>)}</div><p className="admin-delivery"><b>Payment:</b> {o.paymentStatus} ({o.paymentMethod}) · <b>Delivery:</b> {[o.address?.fullName, o.address?.line1, o.address?.line2, o.address?.city, o.address?.state, o.address?.pincode, o.address?.phone].filter(Boolean).join(', ') || 'Not provided'}</p></article>) : <p>No online orders received yet.</p>}{m && <p className="success">{m}</p>}</section><div className="checkout"><form className="panel" onSubmit={save}><h2>
        {editingId ? 'Edit Product' : 'Add Product'}
    </h2>{['name', 'description', 'price', 'barcode'].map(k => <label>{k}<input required={['name', 'price'].includes(k)} type={k === 'price' ? 'number' : 'text'} value={f[k]} onChange={e => F({ ...f, [k]: e.target.value })} /></label>)}<label>Category<select required value={f.category} onChange={e=>F({...f,category:e.target.value})}>{categories.map(c=><option key={c._id} value={c.name}>{c.name}</option>)}{!categories.some(c=>c.name===f.category)&&<option>{f.category}</option>}</select></label><label className="upload-label"><ImagePlus /> Product gallery (select up to 3 images · JPG, PNG, WEBP · max 3MB each)<input type="file" multiple accept="image/png,image/jpeg,image/webp" required={!editingId} onChange={e => { const selected=Array.from(e.target.files||[]).slice(0,3); FILES(selected); PV(selected.map(x=>URL.createObjectURL(x))); }} /></label><div className="upload-gallery">{preview.map((src,i)=><img key={i} className="upload-preview" src={src} alt={'Product preview '+(i+1)}/>)}</div><p className="upload-note">Product images are stored with the product and shown in its detail gallery. If editing without selecting new files, current images are kept.</p><h3>Size / stock</h3>{f.sizes.map((z, i) => <div className="size"><input value={z.size} onChange={e => F({ ...f, sizes: f.sizes.map((v, j) => i === j ? { ...v, size: e.target.value } : v) })} /><input type="number" min="0" value={z.stock} onChange={e => F({ ...f, sizes: f.sizes.map((v, j) => i === j ? { ...v, stock: +e.target.value } : v) })} /></div>)}<button type="button" className="outline" onClick={() => F({ ...f, sizes: [...f.sizes, { size: '', stock: 0 }] })}><Plus /> Add size</button><p>{m}</p><button className="btn"> {editingId ? 'Update Product' : 'Save Product'}</button> {editingId && (
        <button
            type="button"
            className="outline"
            onClick={() => {
                setEditingId(null);
                FILES([]);
                PV([]);
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
    )}</form><section className="panel category-admin"><h2>Manage categories</h2><form className="category-create" onSubmit={async e=>{e.preventDefault();try{await api('/categories',{method:'POST',body:JSON.stringify({name:newCategory})});NEWCAT('');loadCategories();M('Category created')}catch(x){M(x.message)}}}><input placeholder="e.g. T-shirts, Jeans" value={newCategory} onChange={e=>NEWCAT(e.target.value)} required/><button className="btn">Add category</button></form><div className="category-admin-list">{categories.map(c=><span key={c._id}>{c.name}<button type="button" onClick={async()=>{if(!confirm('Remove category '+c.name+'? Products in it will remain in inventory.'))return;await api('/categories/'+c._id,{method:'DELETE'});loadCategories()}}><X size={14}/></button></span>)}</div><small>Category names become available on the customer shop and product editor.</small></section><section className="panel"><h2>Inventory</h2>{p.map(x => <div className="inventory" key={x._id}><img src={x.image} /><div><b>{x.name}</b><small>{x.sizes.map(z => z.size + ': ' + z.stock).join(' / ')}</small></div><button
        type="button"
        onClick={() => editProduct(x)}
    >
        Edit
    </button><button onClick={async () => { await api('/products/' + x._id, { method: 'DELETE' }); load() }}>Delete</button></div>)}<button className="outline" onClick={() => dl('stock')}><Download /> Stock CSV</button> <button className="outline" onClick={() => dl('sales')}><Download /> Sales CSV</button></section></div></main>
}
function POS() {
    const [products, SP] = useState([]), [search, SS] = useState(''), [category, SCat] = useState('All'), [code, C] = useState(''), [items, I] = useState([]), [sizes, SZ] = useState({}), [cust, U] = useState({ customerName: '', customerPhone: '' }), [method, M] = useState('cash'), [msg, G] = useState(''), [busy, B] = useState(false), [completed, Done] = useState(null), [qr, QR] = useState(null);
    useEffect(() => { api('/products').then(SP).catch(e => G(e.message)) }, []);
    const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    const shown = products.filter(p => (category === 'All' || p.category === category) && (!search || [p.name, p.category, p.barcode].some(v => String(v || '').toLowerCase().includes(search.toLowerCase()))));
    const moneyTotal = items.reduce((a, x) => a + x.price * x.quantity, 0);
    const addProduct = (p, size) => { const stock = p.sizes?.find(z => z.size === size)?.stock || 0; if (!stock) return G('Selected size is out of stock'); const existing = items.find(x => x.product === p._id && x.size === size); if (existing && existing.quantity >= stock) return G('Available stock limit reached'); I(old => existing ? old.map(x => x.product === p._id && x.size === size ? { ...x, quantity: x.quantity + 1 } : x) : [...old, { product: p._id, name: p.name, image: p.image, size, price: p.price, quantity: 1, stock, barcode: p.barcode }]); G(p.name + ' added to bill'); Done(null) };
    const scan = async () => { if (!code.trim()) return; try { const p = await api('/products/barcode/' + encodeURIComponent(code.trim())); const z = p.sizes?.find(x => x.stock > 0); if (!z) throw Error('This product is out of stock'); addProduct(p, z.size) } catch (e) { G(e.message) } C('') };
    const changeQty = (item, delta) => { I(old => old.map(x => x.product === item.product && x.size === item.size ? { ...x, quantity: Math.max(1, Math.min(x.stock, x.quantity + delta)) } : x)) };
    const remove = (item) => I(old => old.filter(x => !(x.product === item.product && x.size === item.size)));
    const printReceipt = () => { if (!completed) return; const o = completed; const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); const rows = (o.items || []).map(x => `<tr><td>${esc(x.name)}<small>Size: ${esc(x.size)} × ${x.quantity}</small></td><td>₹${Number(x.price).toFixed(2)}</td><td>₹${(Number(x.price) * Number(x.quantity)).toFixed(2)}</td></tr>`).join(''); const w = window.open('', '_blank', 'width=420,height=720'); if (!w) { G('Please allow pop-ups to print the receipt'); return } w.document.write(`<!doctype html><html><head><title>Receipt ${esc(o.orderNumber)}</title><style>body{font:13px Arial,sans-serif;color:#111;padding:18px;max-width:340px;margin:auto}h1{text-align:center;font-size:22px;letter-spacing:2px;margin:5px}p{text-align:center;margin:5px 0 14px;color:#555}.line{border-top:1px dashed #555;margin:12px 0}table{width:100%;border-collapse:collapse}td{padding:7px 2px;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}small{display:block;color:#555;margin-top:4px}.total{display:flex;justify-content:space-between;font-weight:bold;font-size:17px}.thanks{text-align:center;margin-top:22px;font-weight:bold}@media print{button{display:none}body{padding:0}}</style></head><body><h1>STYLEHUB</h1><p>Everyday style, made simple</p><div class="line"></div><div>Bill: ${esc(o.orderNumber)}</div><div>Date: ${new Date(o.createdAt || Date.now()).toLocaleString('en-IN')}</div><div>Customer: ${esc(o.customerName)}</div><div>Mobile: ${esc(o.customerPhone)}</div><div class="line"></div><table>${rows}</table><div class="line"></div><div class="total"><span>Grand Total</span><span>₹${Number(o.total || 0).toFixed(2)}</span></div><p>Payment: ${esc(String(o.paymentMethod || '').toUpperCase())}</p><div class="line"></div><div class="thanks">Thank you for shopping with us!</div><p>Visit again</p><script>window.onload=()=>window.print();<\/script></body></html>`); w.document.close() };
    const bill = async () => { if (!items.length) return G('Add at least one product'); if (!cust.customerName.trim() || !cust.customerPhone.trim()) return G('Enter customer name and mobile number'); B(true); G(''); try { if(method==='upi'){const d=await api('/pos/upi-qr',{method:'POST',body:JSON.stringify({...cust,items:items.map(x=>({product:x.product,size:x.size,quantity:x.quantity}))})});QR(d);G('Scan this QR using any UPI app. Waiting for verified payment...');return;} const d = await api('/pos/checkout', { method: 'POST', body: JSON.stringify({ ...cust, items: items.map(x => ({ product: x.product, size: x.size, quantity: x.quantity })), paymentMethod: method }) }); Done(d.order); I([]); G('Bill completed successfully. Receipt is ready to print.'); api('/products').then(SP).catch(() => { }) } catch (e) { G(e.message) } finally { B(false) } };
    useEffect(()=>{if(!qr?.qrCodeId)return;let busy=false;const timer=setInterval(async()=>{if(busy)return;busy=true;try{const d=await api('/pos/upi-qr/'+qr.qrCodeId+'/status');if(d.status==='paid'){clearInterval(timer);Done(d.order);I([]);QR(null);G('UPI payment verified. Bill confirmed; receipt is ready.');api('/products').then(SP).catch(()=>{});}}catch(e){G(e.message)}finally{busy=false}},4000);return()=>clearInterval(timer)},[qr?.qrCodeId]);
    return <main className="pos-page"><div className="pos-top"><div><small>RETAIL CHECKOUT / STYLEHUB</small><h1>Point of sale<span>.</span></h1><p>Scan a barcode or find products manually. Both ways update the same inventory.</p></div><div className="pos-live"><span></span> BILLING COUNTER</div></div>
        <section className="pos-layout"><div className="pos-catalog panel"><div className="pos-section-head"><div><small>PRODUCT CATALOGUE</small><h2>Find your items</h2></div><span className="pos-count">{shown.length} products</span></div>
            <div className="scanner-box"><div className="scanner-icon"><ScanLine size={22} /></div><div className="scanner-input"><b>Barcode scanner</b><small>Connect USB scanner or type barcode manually</small><input autoComplete="off" placeholder="Scan barcode and press Enter" disabled={!!qr} value={code} onChange={e => C(e.target.value)} onKeyDown={e => e.key === 'Enter' && scan()} /></div><button className="btn" disabled={!!qr} onClick={scan}>Add code</button></div>
            <div className="pos-search-row"><label className="pos-search"><input placeholder="Search product name, category or barcode..." value={search} onChange={e => SS(e.target.value)} /></label><select value={category} onChange={e => SCat(e.target.value)} aria-label="Filter collection">{categories.map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="pos-products">{shown.map(p => { const available = (p.sizes || []).reduce((n, z) => n + Number(z.stock || 0), 0), size = sizes[p._id] || p.sizes?.find(z => z.stock > 0)?.size || ''; return <article className="pos-product" key={p._id}><div className="pos-product-image">{p.image ? <img src={p.image} alt={p.name} /> : <div className="pos-no-image">STYLEHUB</div>}<span>{p.category}</span></div><div className="pos-product-info"><b>{p.name}</b><strong>{money(p.price)}</strong><small>{available > 0 ? available + ' in stock' : 'Out of stock'}</small><div className="pos-product-actions"><select disabled={!available || !!qr} value={size} onChange={e => SZ({ ...sizes, [p._id]: e.target.value })}>{(p.sizes || []).map(z => <option key={z.size} value={z.size} disabled={!z.stock}>{z.size} · {z.stock}</option>)}</select><button disabled={!available || !!qr} onClick={() => addProduct(p, size)}><Plus size={16} /> Add</button></div></div></article> })}{!shown.length && <div className="pos-empty">No matching products. Try another search or collection.</div>}</div></div>
            <aside className="pos-checkout panel"><div className="pos-section-head"><div><small>ACTIVE TRANSACTION</small><h2>Current bill</h2></div><span className="cart-pill">{items.reduce((n, x) => n + x.quantity, 0)} items</span></div>
                <div className="pos-cart-list">{items.map(x => <div className="pos-cart-item" key={x.product + '-' + x.size}><div className="pos-cart-thumb">{x.image ? <img src={x.image} alt="" /> : <ShoppingBag size={18} />}</div><div className="pos-cart-detail"><b>{x.name}</b><small>Size {x.size} · {money(x.price)}</small><div className="qty-control"><button disabled={!!qr} onClick={() => changeQty(x, -1)}><Minus size={13} /></button><span>{x.quantity}</span><button disabled={!!qr || x.quantity >= x.stock} onClick={() => changeQty(x, 1)}><Plus size={13} /></button></div></div><div className="pos-cart-price"><b>{money(x.price * x.quantity)}</b><button disabled={!!qr} onClick={() => remove(x)} aria-label="Remove item"><Trash2 size={15} /></button></div></div>)}{!items.length && <div className="pos-cart-empty"><ShoppingBag size={28} /><b>Your bill is empty</b><span>Scan a barcode or add an item from the catalogue</span></div>}</div>
                <div className="pos-customer"><small>CUSTOMER DETAILS</small><input disabled={!!qr} placeholder="Customer name" value={cust.customerName} onChange={e => U({ ...cust, customerName: e.target.value })} /><input disabled={!!qr} placeholder="Mobile number" value={cust.customerPhone} onChange={e => U({ ...cust, customerPhone: e.target.value })} /></div>
                <div className="pos-payment"><small>PAYMENT METHOD</small><div className="payment-options">{[['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card']].map(([v, l]) => <button key={v} disabled={!!qr} className={method === v ? 'active' : ''} onClick={() => M(v)}>{l}</button>)}</div></div>{qr&&<div className="pos-qr-panel rounded-2xl shadow-soft"><b>Scan to pay {money(moneyTotal)}</b>{qr.imageUrl?<img src={qr.imageUrl} alt="Razorpay UPI payment QR code"/>:<p>QR code is being prepared...</p>}<small>Waiting for Razorpay payment confirmation. Receipt will unlock only after payment is verified.</small><button className="outline" onClick={()=>{QR(null);G('QR payment cancelled. No bill was created.')}}>Cancel QR</button></div>}
                <div className="pos-total"><span>Items subtotal</span><b>{money(moneyTotal)}</b></div><div className="pos-grand"><span>Grand total</span><strong>{money(moneyTotal)}</strong></div>
                {msg && <p className={completed ? 'pos-success' : 'pos-message'}>{completed ? <CheckCircle2 size={16} /> : null}{msg}</p>}
                {completed ? <button className="btn pos-complete" onClick={printReceipt}><Printer size={18} /> Print customer receipt</button> : <button className="btn pos-complete" disabled={!items.length || busy || !!qr} onClick={bill}>{busy ? 'Processing...' : 'Complete bill'} <ArrowRight size={17} /></button>}
                {completed && <button className="pos-new-bill" onClick={() => { Done(null); QR(null); U({ customerName: '', customerPhone: '' }); M('cash'); G('New bill started') }}>Start new bill</button>}
            </aside></section><p className="pos-footnote">Tip: A USB barcode scanner behaves like a keyboard. Click the barcode field once, then scan. Manual search works even without a scanner.</p></main>
}
export default function App() { const a = useAuth(); return <><Header a={a} /><Routes><Route path="/" element={<Home />} /><Route path="/product/:id" element={<ProductDetails />} /><Route path="/login" element={<Auth a={a} mode="login" />} /><Route path="/register" element={<Auth a={a} mode="register" />} /><Route path="/forgot-password" element={<Auth a={a} mode="forgot" />} /><Route path="/cart" element={<Cart />} /><Route path="/wishlist" element={<Wishlist />} /><Route path="/checkout" element={a.user ? <Checkout a={a} /> : <Auth a={a} mode="login" />} /><Route path="/orders" element={a.user ? <Orders /> : <Auth a={a} mode="login" />} /><Route path="/admin" element={a.user?.role === 'admin' ? <Admin /> : <Auth a={a} mode="login" />} /><Route path="/pos" element={['admin', 'staff'].includes(a.user?.role) ? <POS /> : <Auth a={a} mode="login" />} /></Routes></> }
