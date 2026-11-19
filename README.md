# STYLEHUB MERN Store + POS
React/Vite frontend, Express/Node API, MongoDB/Mongoose, JWT auth, OTP-verified registration, password reset, product image upload, Razorpay checkout, and role-based Admin/Staff/Customer portals.

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

## Product image uploads
Admin selects an image file (JPG, PNG, WEBP, GIF or AVIF, up to 5 MB). The API stores the image as a Base64 data URL in the MongoDB product document; no external image URL is needed. This is suitable for a small demo catalogue. For a larger production catalogue, use object storage such as Cloudinary or S3 and store only the image URL/key in MongoDB, rather than storing large binary data in product documents.

## Other notes
POS billing supports both USB barcode scanning and manual product search by name, category/collection or barcode. Choose size, adjust quantities, remove items, enter customer details, and select Cash/UPI/Card. After the bill is saved and stock is reduced, use Print customer receipt to print a customer copy from a thermal or regular printer. USB barcode scanners generally type the barcode then send Enter. Add unique barcode values to products. Razorpay test keys are required for online checkout. Payment is verified server-side before an online order is created. Each successful online order receives a unique STYLEHUB tracking ID. Admins can review online orders, customer/contact and delivery details, every ordered product (image, size, quantity and price), edit the tracking ID, and update order status from the Admin dashboard. Customers can see the tracking ID, current status, delivery address and complete item breakdown under My orders. Wishlist hearts turn red when an item is saved. MongoDB transactions require a replica set (Atlas supports this).

This remains a starter project. Before production, add OTP resend throttling/rate limits, account lockout, strict validation, HTTPS, secure secrets, webhook reconciliation, backups, tax invoice review, and concurrency/security testing. Do not expose SMTP or Twilio credentials in frontend code.
