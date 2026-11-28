import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Minus, Plus } from 'lucide-react';
import { money } from '../utils.js';

export default function ProductCard({
  product, isWished = false, onToggleWishlist, onAddToCart,
  quantity = 0, onIncrement, onDecrement, onGoToCart
}) {
  const id = String(product?._id ?? product?.id ?? '');
  const images = product?.images?.length ? product.images : [product?.image].filter(Boolean);
  const image = images[0] || 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=700';

  return (
    <article className="product group">
      <Link to={`/product/${id}`} className="photo product-photo">
        <img src={image} alt={product?.name || 'Product'} />
        <span className="product-view">Quick view <ArrowRight size={14} /></span>
        <small>{product?.category}</small>
      </Link>
      <button
        type="button"
        className={'heart ' + (isWished ? 'heart-active' : '')}
        onClick={() => onToggleWishlist?.(product)}
        aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        title={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={18} fill={isWished ? 'currentColor' : 'none'} />
      </button>
      <div className="product-meta">
        <Link to={`/product/${id}`}><h3>{product?.name}</h3></Link>
        <b>{money(product?.price)}</b>
      </div>
      <p>{product?.description}</p>
      {quantity > 0 ? (
        <div className="card-cart-actions">
          <div className="card-qty">
            <button type="button" aria-label="Decrease quantity" onClick={() => onDecrement?.(product)}><Minus size={15} /></button>
            <b>{quantity}</b>
            <button type="button" aria-label="Increase quantity" onClick={() => onIncrement?.(product)}><Plus size={15} /></button>
          </div>
          <button type="button" className="outline go-to-cart" onClick={onGoToCart}>Go to Cart <ArrowRight size={15} /></button>
        </div>
      ) : (
        <button type="button" className="outline" onClick={() => onAddToCart?.(product)}>Add To Cart <ArrowRight size={15} /></button>
      )}
    </article>
  );
}
