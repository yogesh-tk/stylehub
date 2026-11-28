import { api } from '../api';

// Prefer the cart row's product reference over Mongo's embedded subdocument _id.
export const productIdOf = value => {
  const raw = value?.productId ?? value?.product ?? value?._id ?? value?.id ?? value?.slug;
  if (raw && typeof raw === 'object') return String(raw._id ?? raw.id ?? raw.$oid ?? '');
  return raw == null ? '' : String(raw);
};
export const productKey = product => productIdOf(product) || `${String(product?.name || 'product').trim().toLowerCase()}-${Number(product?.price || 0)}`;
export const normalizeCart = rows => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, product: productIdOf(row), quantity: Math.max(1, Number(row.quantity) || 1), price: Number(row.price) || 0, stock: Number(row.stock) || 0 })).filter(row => row.product);
const hasSession = () => Boolean(localStorage.getItem('sh_token'));
let wishlistQueue = Promise.resolve();
let cartQueue = Promise.resolve();
const dispatchUpdate = () => window.dispatchEvent(new Event('sh-cart-wish-update'));

export function readWishlist() {
  try { const value = JSON.parse(localStorage.getItem('sh_wish') || '[]'); return Array.isArray(value) ? value.filter(Boolean) : []; }
  catch { return []; }
}
export function writeWishlist(items, { persist = true } = {}) {
  const unique = [...new Map(items.filter(Boolean).map(item => [productKey(item), item])).values()];
  localStorage.setItem('sh_wish', JSON.stringify(unique));
  dispatchUpdate();
  if (persist && hasSession()) {
    const productIds = unique.map(productIdOf).filter(Boolean);
    const sessionToken = localStorage.getItem('sh_token');
    wishlistQueue = wishlistQueue.then(() => localStorage.getItem('sh_token') === sessionToken
      ? api('/user-state/wishlist', { method: 'PUT', body: JSON.stringify({ productIds }) })
      : null).catch(error => { console.error('Wishlist could not be saved to your account:', error.message); window.dispatchEvent(new CustomEvent('sh-store-error', { detail: error.message })); });
  }
  return unique;
}
export function toggleWishlist(product) {
  if (!product) return readWishlist();
  const current = readWishlist();
  const key = productKey(product);
  return writeWishlist(current.some(item => productKey(item) === key)
    ? current.filter(item => productKey(item) !== key)
    : [...current, { ...product, _id: productIdOf(product) || key }]);
}
export function cartNow() {
  try { return normalizeCart(JSON.parse(localStorage.getItem('sh_cart') || '[]')); }
  catch { return []; }
}
export function saveCart(items, { persist = true } = {}) {
  const clean = normalizeCart(items);
  localStorage.setItem('sh_cart', JSON.stringify(clean));
  dispatchUpdate();
  if (persist && hasSession()) {
    const payload = clean.map(row => ({ product: row.product, size: String(row.size || ''), quantity: Number(row.quantity || 1) }));
    const sessionToken = localStorage.getItem('sh_token');
    cartQueue = cartQueue.then(() => localStorage.getItem('sh_token') === sessionToken
      ? api('/user-state/cart', { method: 'PUT', body: JSON.stringify({ items: payload }) })
      : null).catch(error => { console.error('Cart could not be saved to your account:', error.message); window.dispatchEvent(new CustomEvent('sh-store-error', { detail: error.message })); });
  }
  return clean;
}

// The database is canonical after login; localStorage is only a fast UI cache.
export async function hydrateUserState() {
  if (!hasSession()) return { wishlist: [], cart: [] };
  const state = await api('/user-state');
  writeWishlist(state.wishlist || [], { persist: false });
  saveCart(state.cart || [], { persist: false });
  return state;
}
export function clearLocalUserState() {
  localStorage.removeItem('sh_wish');
  localStorage.removeItem('sh_cart');
  dispatchUpdate();
}
