# 🛒 Fashion Store E-Commerce Backend API (Pro Grade)

A robust and scalable e-commerce backend system built with **Node.js**, **Express.js**, and **MongoDB**. This project focuses on high-level security, database validation, and architectural scalability.

---

## 🚀 Key Features

- **Advanced Authentication**: JWT-based registration and login with secure password encryption (BcryptJS).
- **Smart Inventory Management**: Handles product details, slugs, and multiple variants (Size, Color, SKU).
- **Dynamic Categories**: Support for nested categories and sub-category relationships.
- **Powerful Validation**: Strict database-level validation using Regex and Custom Mongoose Validators.
- **Image Management**: Integrated with Cloudinary for image uploads and automatic deletion.
- **Discount & Coupon System**: Advanced logic for percentage and flat discounts with expiry tracking.
- **Order & Payments**: Complete order lifecycle with transaction ID tracking and payment gateway integration.
- **Review & Wishlist**: Automated average rating calculation and personalized wishlist system.

---

## 🛠 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Auth**: JSON Web Tokens (JWT) & BcryptJS
- **File Storage**: Cloudinary (Multer for handling uploads)
- **Environment**: Dotenv

---

## 📂 Project Architecture

```text
├── config/             # Database and Cloudinary configuration
├── controllers/        # Business logic for Auth, Product, Order, etc.
├── middleware/         # Security, Error handling, and Image upload
├── models/             # 10+ Pro-grade Mongoose Schemas
├── routes/             # RESTful API Endpoints
├── utils/              # Helper functions (Slugs, Cloudinary helpers)
├── .env                # Environment variables (Hidden)
├── .gitignore          # Files to ignore in Git
├── server.js           # Main entry point
└── README.md           # Project documentation

---

## 👨‍💻 Developer Profile

- **Name**: Syed Rana
- **LinkedIn**: https://www.linkedin.com/in/syedrana/
- **GitHub**: https://github.com/syedrana

---
⭐ If you find this project helpful, please give it a **Star**!
```
