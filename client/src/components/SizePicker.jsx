import React, { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { cartNow, productIdOf, saveCart } from '../utils/store';
export default function SizePicker({product,onClose,onAdded,money}) {
 const [size,S]=useState(''); const [msg,M]=useState(''); const [busy,B]=useState(false);
 useEffect(()=>{S('');M('');B(false)},[productIdOf(product)]);
 if(!product)return null;
 const sizes=Array.isArray(product.sizes)?product.sizes:[];
 const add=()=>{
  if(busy)return;
  if(!size){M('Please select a size');return;}
  const selected=sizes.find(z=>String(z.size)===String(size));
  if(!selected){M('Selected size is not available. Please choose another size.');return;}
  const stock=Number(selected.stock);
  if(!Number.isFinite(stock)||stock<=0){M('This size is out of stock');return;}
  const id=productIdOf(product);
  if(!id){M('Product ID is missing. Please refresh the shop and try again.');return;}
  const old=cartNow();
  const idx=old.findIndex(x=>productIdOf(x)===id&&String(x.size)===String(size));
  if(idx>=0 && Number(old[idx].quantity)>=stock){M('Stock limit reached for this size');return;}
  const next=idx>=0?old.map((x,i)=>i===idx?{...x,product:id,quantity:Number(x.quantity||0)+1,stock}:x):[
   ...old,{product:id,name:product.name,image:product.image||product.images?.[0]||'',images:product.images||[],price:Number(product.price||0),size:String(size),quantity:1,stock}
  ];
  B(true);
  saveCart(next);
  onAdded?.();
  onClose?.();
 };
 return <div className="modal-backdrop" onClick={onClose}><section className="size-modal rounded-2xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X/></button><img src={product.image||product.images?.[0]||''} alt={product.name||'Product'}/><div><small>SELECT YOUR FIT</small><h2>{product.name}</h2><b>{money(product.price)}</b><p>Choose a size to add this item to your bag.</p><div className="size-choices">{sizes.map(z=><button type="button" key={z.size} disabled={Number(z.stock)<=0} className={String(size)===String(z.size)?'selected':''} onClick={()=>{S(String(z.size));M('')}}>{z.size}{Number(z.stock)<=0?' · Sold out':''}</button>)}</div>{!sizes.length&&<p className="error">No sizes are configured for this product. Please ask the admin to add sizes and stock.</p>}{msg&&<p className="error">{msg}</p>}<button type="button" className="btn" disabled={busy||!sizes.some(z=>Number(z.stock)>0)} onClick={add}>{busy?'Adding...':'Add to bag'} <ShoppingBag size={16}/></button></div></section></div>
}

