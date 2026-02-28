# Blogging Backend API

REST API for a blogging platform built with Node.js, Express, and MongoDB.  
It supports user authentication, profile management, posts, likes, and subscriptions.

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Cloudinary (image upload)
- Multer (multipart/form-data handling)

## Project Structure

```text
.
|-- index.js
|-- constants.js
|-- src
|   |-- app.js
|   |-- config
|   |   |-- db.js
|   |-- controllers
|   |-- middlewares
|   |-- models
|   |-- routers
|   |-- utils
|-- public
```

## Prerequisites

- Node.js 18+
- MongoDB instance
- Cloudinary account

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=8000
CORS_ORIGIN=http://localhost:5173

MONGO_CONNECTION_STRING=mongodb://127.0.0.1:27017

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

OWNER_EMAIL=owner@example.com
# Optional alternative owner match by user id
OWNER_USER_ID=65f2d9f6e2f8db1e4f9db123

# About public-route limiter
ABOUT_PUBLIC_RATE_LIMIT_WINDOW_MS=60000
ABOUT_PUBLIC_RATE_LIMIT_MAX=120

# 5MB default
RESUME_MAX_SIZE_BYTES=5242880
```

Note: Database name is taken from `constants.js` (`DB_NAME`).

## Installation

```bash
npm install
```

## Run

```bash
# development
npm run dev

# production
npm start
```

Server starts on `http://localhost:<PORT>` and mounts APIs under `/api/v1`.

## API Base Paths

- `/api/v1/users`
- `/api/v1/post`
- `/api/v1/like`
- `/api/v1/subscriptions`
- `/api/v1/about`

## Main Routes

### User Routes (`/api/v1/users`)

- `POST /register` (multipart: `avatar`)
- `POST /login`
- `POST /logout` (auth)
- `GET /currentUser` (auth)
- `POST /refresh-token`
- `GET /profile` (auth)
- `PATCH /update-profile` (auth)
- `PATCH /forget-password` (auth)
- `PATCH /update-avatar` (auth, multipart: `avatar`)

### Post Routes (`/api/v1/post`)

- `POST /create-post` (auth, multipart: `thumbnail`)
- `GET /getAll-post`
- `GET /get-post/:postId`
- `DELETE /delete-post/:postId` (auth)
- `PUT /update-post/:postId` (auth, optional multipart: `thumbnail`)

### Like Routes (`/api/v1/like`) - auth required for all

- `POST /toggle/post/:postId`
- `POST /toggle/comment/:commentId`
- `GET /liked/posts`

### Subscription Routes (`/api/v1/subscriptions`) - auth required for all

- `GET /c/:channelId`
- `POST /c/:channelId`
- `GET /u/:subscriberId`

### About Routes (`/api/v1/about`)

- `GET /` (public)
- `PUT /` (owner/admin only)
- `POST /resume` (owner/admin only, multipart: `resume` PDF)
- `GET /resume/download` (public)

## About API Curl Examples

```bash
# Public: fetch about profile
curl -X GET http://localhost:8000/api/v1/about

# Owner/Admin: update about profile
curl -X PUT http://localhost:8000/api/v1/about \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Deepak Singh",
    "headline": "Backend Engineer",
    "summary": "I build reliable APIs and systems.",
    "location": "Bengaluru, India",
    "email": "owner@example.com",
    "phone": "+91-9999999999",
    "skills": ["Node.js", "Express", "MongoDB"],
    "experience": "5+ years building production APIs",
    "education": "B.Tech CSE"
  }'

# Owner/Admin: upload PDF resume (max 5MB)
curl -X POST http://localhost:8000/api/v1/about/resume \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "resume=@./resume.pdf;type=application/pdf"

# Public: download/redirect resume
curl -L -X GET http://localhost:8000/api/v1/about/resume/download
```

## Authentication

- Access token can be provided via:
- `Authorization: Bearer <token>` header
- `accessToken` cookie
- Login/refresh endpoints also set `accessToken` and `refreshToken` in HTTP-only cookies.

## Response Pattern

Most endpoints return a consistent shape:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success message"
}
```

## Notes

- File uploads are temporarily stored in `public/temp` before Cloudinary upload.
- CORS supports comma-separated origins via `CORS_ORIGIN`.
- `app.set("trust proxy", 1)` is enabled for deployment behind a proxy.
