import React, { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { money } from '../utils.js';
import { cartNow, productKey, saveCart } from '../store.js';

export default function SizePicker({ product, onClose, onAdded }) {
  const [size, setSize] = useState('');
  const [message, setMessage] = useState('');

  // A picker instance is reused by React. Reset its selected size whenever another
  // product is opened, otherwise the previous product's size can leak into this one.
  useEffect(() => {
    setSize('');
    setMessage('');
  }, [productKey(product)]);

  if (!product) return null;

  const add = () => {
    if (!size) {
      setMessage('Please select a size');
      return;
    }
    const selected = (product.sizes || []).find(item => String(item.size) === String(size));
    const stock = Number(selected?.stock ?? 0);
    if (!selected || stock <= 0) {
      setMessage('This size is out of stock. Please choose another size.');
      return;
    }

    const id = productKey(product);
    if (!id) {
      setMessage('Product ID is missing. Please refresh and try again.');
      return;
    }

    const current = cartNow();
    const index = current.findIndex(item =>
      String(item.product) === id && String(item.size) === String(size)
    );

    let next;
    if (index >= 0) {
      if (Number(current[index].quantity || 0) >= stock) {
        setMessage('Stock limit reached for this size');
        return;
      }
      next = current.map((item, i) => i === index
        ? { ...item, quantity: Number(item.quantity || 0) + 1, stock }
        : item
      );
    } else {
      next = [...current, {
        product: id,
        name: product.name,
        image: product.image || product.images?.[0] || '',
        images: product.images || [],
        price: Number(product.price || 0),
        size: String(size),
        quantity: 1,
        stock
      }];
    }

    saveCart(next);
    onAdded?.();
    onClose?.();
  };

  const images = product.images?.length ? product.images : [product.image].filter(Boolean);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="size-modal rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close size selector"><X /></button>
        <img src={images[0] || ''} alt={product.name || 'Product'} />
        <div>
          <small>SELECT YOUR FIT</small>
          <h2>{product.name}</h2>
          <b>{money(product.price)}</b>
          <p>Choose a size to add this item to your bag.</p>
          <div className="size-choices">
            {(product.sizes || []).map(item => (
              <button
                type="button"
                key={item.size}
                disabled={Number(item.stock) <= 0}
                className={size === String(item.size) ? 'selected' : ''}
                onClick={() => { setSize(String(item.size)); setMessage(''); }}
              >
                {item.size}{Number(item.stock) <= 0 ? ' · Sold out' : ''}
              </button>
            ))}
          </div>
          {message && <p className="error" role="alert">{message}</p>}
          <button type="button" className="btn" onClick={add}>Add to bag <ShoppingBag size={16} /></button>
        </div>
      </section>
    </div>
  );
}
