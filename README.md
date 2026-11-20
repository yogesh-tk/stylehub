# STYLEHUB MERN Store + POS
React/Vite frontend, Express/Node API, MongoDB/Mongoose, JWT auth, OTP-verified registration, password reset, multi-image product galleries, dynamic categories, size-confirmed cart, verified customer reviews, Razorpay online checkout and POS UPI QR verification, and role-based Admin/Staff/Customer portals. Tailwind CSS Play CDN is included for utility styling alongside the custom responsive component styles.

## Run locally
1. Use Node.js 20+ and MongoDB Atlas or a local MongoDB server.
2. In `server`, run `npm install`, copy `.env.example` to `.env`, fill the settings below, then run `npm run dev`.
3. In `client`, run `npm install`, copy `.env.example` to `.env`, then run `npm run dev`.
4. Register using email OTP or mobile OTP. Promote the first admin in MongoDB Compass / mongosh, for example: `db.users.updateOne({email:"you@example.com"},{$set:{role:"admin"}})`. For a phone-only account, query by phone instead.
5. If this is an existing database created by the earlier ZIP, run `db.users.dropIndex("email_1")` once (only if that index exists), then create the optional unique indexes with `db.users.createIndex({email:1},{unique:true,sparse:true})` and `db.users.createIndex({phone:1},{unique:true,sparse:true})`. This permits accounts that verify either email or mobile.
6. Login with that account and open `/admin` to upload products.

## OTP delivery setup
Registration and forgot-password flows send a 6-digit OTP valid for 5 minutes. Choose one channel (email or mobile) on the screen.

- **Email:** Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `server/.env`. For Gmail, use a Google App Password (not your normal Gmail password).
- **SMS:** Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM`. Use a Twilio-enabled sender and an allowed/verified destination while testing. Phone numbers should include country code (India: +91).
- At least one delivery provider must be configured. If only email is configured, choose Email OTP. If only Twilio is configured, choose Mobile OTP.

## Password requirements
New registration and reset passwords require at least 8 characters and at least one special symbol. Password inputs include show/hide controls.

## Product images, categories and product details
Admin can upload up to 3 product gallery images (JPG, PNG or WEBP, up to 3 MB each). Images are stored as Base64 data URLs in MongoDB. Existing single-image products remain supported. Admins can create and archive categories; categories appear as filters on the storefront and can be assigned to products. Selecting a product card opens a gallery/details page. Customers must choose an in-stock size before adding a product to the cart. Quantity controls are shown on product cards and in the cart. This is suitable for a small demo catalogue. For a larger production catalogue, use object storage such as Cloudinary or S3 and store only the image URL/key in MongoDB, rather than storing large binary data in product documents.

## Other notes
POS billing supports USB barcode scanning and manual product search. Choose size, adjust quantities, remove items, enter customer details, and select Cash/UPI/Card. Cash and Card bills are saved directly. UPI creates a single-use Razorpay QR code; the POS polls Razorpay and only creates the bill / unlocks the receipt after a captured payment is confirmed. Razorpay QR Code API access must be enabled for the account, and test/live Razorpay keys must match the environment. Online customers can submit a star rating, written review and up to 3 photos from My orders; the API checks that the logged-in customer has a paid order containing that product. USB barcode scanners generally type the barcode then send Enter. Add unique barcode values to products. Razorpay test keys are required for online checkout. Payment is verified server-side before an online order is created. Each successful online order receives a unique STYLEHUB tracking ID. Admins can review online orders, customer/contact and delivery details, every ordered product (image, size, quantity and price), edit the tracking ID, and update order status from the Admin dashboard. Customers can see the tracking ID, current status, delivery address and complete item breakdown under My orders. Wishlist hearts turn red when an item is saved. MongoDB transactions require a replica set (Atlas supports this). Tailwind is loaded using the Tailwind Play CDN for this demo; for a production deployment, install and build Tailwind locally instead of relying on the CDN.

This remains a starter project. Before production, add OTP resend throttling/rate limits, account lockout, strict validation, HTTPS, secure secrets, webhook reconciliation, backups, tax invoice review, and concurrency/security testing. Do not expose SMTP or Twilio credentials in frontend code.
