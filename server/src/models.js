import mongoose from 'mongoose';
export const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['customer', 'staff', 'admin'],
        default: 'customer'
    }, addresses: [Object]
},
    { timestamps: true }));
export const Product = mongoose.model('Product', new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    image: String,
    images: [String],
    price: { type: Number, required: true, min: 0 },
    barcode: { type: String, unique: true, sparse: true },
    sizes: [{
        size: String,
        stock: { type: Number, default: 0, min: 0 }
    }],
    active: { type: Boolean, default: true }
},
    { timestamps: true }));
export const Order = mongoose.model('Order', new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    trackingId: { type: String, unique: true, sparse: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String, customerPhone: String,
    source: {
        type: String,
        enum: ['online', 'pos'], default: 'online'
    },
    items: [{ product: mongoose.Schema.Types.ObjectId, name: String, image: String, size: String, quantity: Number, price: Number }],
    address: Object, subtotal: Number, total: Number, paymentMethod: String,
    paymentStatus: { type: String, default: 'pending' },
    paymentId: String,
    status: { type: String, default: 'placed' },
    staff: mongoose.Schema.Types.ObjectId
},
    { timestamps: true }));

export const Otp = mongoose.model('Otp', new mongoose.Schema({
    destination: {
        type: String,
        required: true, index: true
    },
    channel: {
        type: String,
        enum: ['email', 'phone'], required: true
    },
    purpose: {
        type: String,
        enum: ['register', 'reset'], required: true
    },
    codeHash: { type: String, required: true },
    payload: Object,
    expiresAt: {
        type: Date, required: true,
        index: { expires: 0 }
    }
},
    { timestamps: true }));

export const Category = mongoose.model('Category', new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true }, active: { type: Boolean, default: true } }, { timestamps: true }));
export const Review = mongoose.model('Review', new mongoose.Schema({ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, rating: { type: Number, min: 1, max: 5, required: true }, title: String, comment: String, images: [String] }, { timestamps: true }));
export const PosPayment = mongoose.model('PosPayment', new mongoose.Schema({ qrCodeId: { type: String, required: true, unique: true }, customerName: String, customerPhone: String, staff: mongoose.Schema.Types.ObjectId, items: [Object], total: Number, status: { type: String, default: 'pending' }, order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' } }, { timestamps: true }));
