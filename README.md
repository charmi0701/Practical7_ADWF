# Practical 7: Authentication and Middleware Pipeline

**Course Objectives / Program Outcomes:** CO2, CO6 / PO3, PO5  
**Domain:** Node.js, Express, MongoDB/Mongoose, JWT, Bcrypt, Middleware Pipeline

---

## 1. Objective

To implement JWT-based authentication and input validation as part of the Express middleware pipeline.

---

## 2. Architecture & Pipeline Flow

```text
POST /api/auth/register ──► bcrypt.hash(password, 10) ──► save User ──► return JWT (201)
POST /api/auth/login    ──► bcrypt.compare(pwd, hash) ──► sign JWT  ──► return JWT (200)

Protected Route Pipeline:
Client Request (Header: Authorization: Bearer <token>)
       │
       ▼
[Auth Middleware] (auth.js)
  ├─ Missing / invalid format? ──► 401 Unauthorized
  ├─ jwt.verify() throws error? ──► 401 (TokenExpiredError / JsonWebTokenError)
  └─ Token valid ──► req.user = decoded; next()
       │
       ▼
[Validation Middleware] (validateTask.js)
  ├─ Missing title / empty string? ──► 400 Bad Request
  ├─ Invalid priority value?       ──► 400 Bad Request
  └─ Valid input ──► next()
       │
       ▼
[Controller Handler]
  └─ Scoped Database Operation (MongoDB query with userId) ──► Response (200/201)
```

---

## 3. Project Structure

```text
practical-7/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT verification & Bearer token extraction
│   │   └── validateTask.js  # Server-side task input validation
│   ├── models/
│   │   ├── Task.js          # Task schema with user reference
│   │   └── User.js          # User schema with hashed password & email
│   ├── routes/
│   │   ├── auth.js          # /register, /login, /me endpoints
│   │   └── tasks.js         # Protected task CRUD routes
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── server.js            # Express app, middleware wiring, MongoDB connection
│   └── test-auth.js         # Automated end-to-end verification script
└── frontend/
    ├── src/
    │   ├── api.js           # Shared API client with Bearer injection & 401 handling
    │   ├── App.jsx          # Auth views, /me inspector, Task CRUD UI
    │   ├── main.jsx
    │   └── styles.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 4. How to Run and Test

### A. Run Backend
```bash
cd practical-7/backend
npm install
npm start
```
The server starts at `http://localhost:5000` and connects to local MongoDB.

### B. Run Automated Verification Suite
In a new terminal:
```bash
cd practical-7/backend
npm run test:auth
```
This tests:
1. Accessing `/tasks` without token (rejection with 401)
2. Accessing `/tasks` with tampered token (rejection with 401)
3. User Registration with password hashing
4. Duplicate user registration rejection (409 Conflict)
5. Login with invalid password (401)
6. Login with correct password (200 + JWT token)
7. Accessing `/me` endpoint with Bearer token (200)
8. Task creation without title rejected by Validation Middleware (400)
9. Task creation with valid title and priority (201)

### C. Run Frontend
```bash
cd practical-7/frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Postman Testing Guide

1. **Register User**:
   - `POST http://localhost:5000/api/auth/register`
   - Body (JSON): `{"email": "student@example.com", "password": "password123"}`
   - Save the returned `token`.
2. **Login**:
   - `POST http://localhost:5000/api/auth/login`
   - Body (JSON): `{"email": "student@example.com", "password": "password123"}`
3. **Access Protected Tasks**:
   - `GET http://localhost:5000/tasks`
   - Headers: `Authorization: Bearer <token>`
4. **Test Input Validation Middleware**:
   - `POST http://localhost:5000/tasks`
   - Headers: `Authorization: Bearer <token>`
   - Body (JSON): `{"description": "No title provided"}`
   - Expected Output: `400 Bad Request` with `Input validation failed`.

---

## 6. Viva Questions & Concept Explanations

1. **Why must passwords be hashed before storage instead of saved as plain text?**  
   Plaintext or reversibly encrypted passwords expose users if the database is leaked. Bcrypt uses a one-way cryptographic hash with work factor (salt rounds), protecting against rainbow table and brute-force attacks.

2. **What does the authentication middleware actually verify?**  
   It extracts the Bearer token, checks digital signature validity against `JWT_SECRET`, checks token expiration timestamp (`exp`), and ensures the token hasn't been tampered with.

3. **Why should input validation happen on the server even if frontend already validates?**  
   Frontend validation is purely for user experience (UX) and can be bypassed via direct API tools (Postman, curl, browser DevTools). Server validation is the true line of security preventing database pollution, injection, and invalid states.
