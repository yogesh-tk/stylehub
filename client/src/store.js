// Shared browser store for cart and wishlist. All product IDs are normalized to strings.
export const productKey = (product) =>
  String(product?._id ?? product?.id ?? product?.productId ?? product?.product?._id ?? product?.product?.id ?? product?.slug ?? '');

export function readWishlist() {
  try {
    const value = JSON.parse(localStorage.getItem('sh_wish') || '[]');
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeWishlist(items) {
  const unique = [];
  const seen = new Set();
  for (const item of items || []) {
    const key = productKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  localStorage.setItem('sh_wish', JSON.stringify(unique));
  window.dispatchEvent(new Event('sh-cart-wish-update'));
  return unique;
}

export function toggleWishlist(product) {
  const key = productKey(product);
  if (!key) return readWishlist();
  const current = readWishlist();
  const exists = current.some(item => productKey(item) === key);
  return writeWishlist(exists
    ? current.filter(item => productKey(item) !== key)
    : [...current, { ...product, _id: key }]);
}

export function cartNow() {
  try {
    const value = JSON.parse(localStorage.getItem('sh_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  const normalized = (items || []).map(item => ({
    ...item,
    product: String(item.product ?? item._id ?? item.id ?? ''),
    quantity: Math.max(1, Number(item.quantity) || 1),
    stock: Number(item.stock ?? 99)
  })).filter(item => item.product);
  localStorage.setItem('sh_cart', JSON.stringify(normalized));
  window.dispatchEvent(new Event('sh-cart-wish-update'));
  return normalized;
}

export function getCartQuantity(cart, product) {
  const key = productKey(product);
  return (cart || cartNow()).reduce(
    (sum, item) => sum + (String(item.product) === key ? Number(item.quantity) || 0 : 0), 0
  );
}

// Returns null when the product is not in the cart (the UI should open the size picker).
export function changeProductQuantity(product, delta, currentCart = cartNow()) {
  const key = productKey(product);
  const rows = currentCart
    .map((item, index) => ({ item, index }))
    .filter(row => String(row.item.product) === key);
  if (!rows.length) return null;

  let target;
  if (delta > 0) {
    target = rows.find(({ item }) => Number(item.quantity || 0) < Number(item.stock || 99));
    if (!target) return currentCart;
    const next = currentCart.map((item, index) =>
      index === target.index ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item
    );
    return saveCart(next);
  }

  target = [...rows].reverse().find(({ item }) => Number(item.quantity || 0) > 0);
  if (!target) return currentCart;
  const next = currentCart
    .map((item, index) => index === target.index
      ? { ...item, quantity: Number(item.quantity || 0) - 1 }
      : item)
    .filter(item => Number(item.quantity) > 0);
  return saveCart(next);
}
