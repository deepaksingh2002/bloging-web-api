# College Blog API Documentation

![API Version](https://img.shields.io/badge/API%20Version-v1-blue)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Node](https://img.shields.io/badge/Node-18%2B-brightgreen)

A comprehensive, production-ready REST API for a blogging platform built with **Node.js**, **Express.js**, and **MongoDB**. This API provides robust endpoints for managing posts, user authentication, interactions (likes), and channel subscriptions with enterprise-grade error handling and security features.

**Base URL:** `https://college-blog-qlqp.onrender.com/api/v1`

**API Version:** v1.0.0

**Last Updated:** January 3, 2026

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [API Overview](#api-overview)
3. [Authentication](#authentication)
4. [Posts](#posts)
5. [Users](#users)
6. [Likes](#likes)
7. [Subscriptions](#subscriptions)
8. [Error Handling](#error-handling)
9. [Response Format](#response-format)
10. [Rate Limiting & Pagination](#rate-limiting--pagination)
11. [Security Best Practices](#security-best-practices)
12. [Testing Guide](#testing-guide)
13. [Troubleshooting](#troubleshooting)
14. [Changelog](#changelog)

---

## Quick Start

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/deepaksingh2002/bloging-web-api.git

cd college-blog-api

# Install dependencies
npm install

# Start development server
npm run dev

# API will be available at http://localhost:5000/api/v1
```

### First Request Example

```javascript
// Get all posts
const response = await fetch('https://college-blog-qlqp.onrender.com/api/v1/post/getAll-post', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

---

## API Overview

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Post Management** | CRUD operations with rich content support | ✅ Active |
| **User Authentication** | JWT-based auth with refresh tokens | ✅ Active |
| **Social Features** | Like posts/comments, subscribe to creators | ✅ Active |
| **File Uploads** | Avatar and thumbnail image support | ✅ Active |
| **Pagination** | Built-in pagination for all list endpoints | ✅ Active |
| **Rate Limiting** | Request throttling to prevent abuse | ✅ Active |
| **Error Handling** | Comprehensive error messages and codes | ✅ Active |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Database** | MongoDB 5.0+ |
| **Authentication** | JWT (jsonwebtoken) |
| **File Storage** | Cloudinary |
| **Validation** | Joi / Express-validator |
| **Deployment** | Render.com |

---

## Authentication

The API uses JWT (JSON Web Tokens) for stateless authentication. This approach provides scalability and security for distributed systems.

### How JWT Works

1. User logs in with credentials → Server returns `accessToken` and `refreshToken`
2. Include `accessToken` in `Authorization` header for protected endpoints
3. When `accessToken` expires → Use `refreshToken` to get new token
4. Server validates token and grants access to protected resources

### Headers Required for Protected Routes

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
```

### Token Details

| Property | Value |
|----------|-------|
| **Access Token Expiry** | 1 hour (3600 seconds) |
| **Refresh Token Expiry** | 7 days |
| **Algorithm** | HS256 |
| **Storage** | HTTP-only cookies (recommended) |

### Implementation Example (JavaScript/Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://college-blog-qlqp.onrender.com/api/v1'
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/users/refresh-token', { refreshToken });
      
      localStorage.setItem('accessToken', response.data.data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
      
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Posts

Base URL: `/post`

Manage blog posts with full CRUD operations, rich content support, and metadata.

### Get All Posts

**Endpoint:** `GET /getAll-post`

**Description:** Retrieve all blog posts with advanced filtering, sorting, and pagination.

**Authentication:** Optional (public access, enhanced filtering with auth)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 10 | Posts per page (max: 50) |
| `userId` | string | No | - | Filter by author ID |
| `search` | string | No | - | Search posts by title/content |
| `tags` | string | No | - | Filter by tags (comma-separated) |
| `sortBy` | string | No | createdAt | Sort field (createdAt, title, likesCount) |
| `order` | string | No | desc | Sort order (asc, desc) |
| `published` | boolean | No | true | Filter by publication status |

**Success Response (200):**

```json
{
    "statusCode": 200,
    "data": [
        {
            "_id": "69g391a84a9bc8caf4aa7fa4a",
            "title": "Updated title",
            "thumbnail": "http://res.cloudinary.com/image/upload/ddnn0xegmmbhh80pkpvk.webp",
            "owner": {
                "_id": "692927fa617be8cd51bc3b23",
                "username": "testuser1234"
            },
            "createdAt": "2025-12-10T07:00:20.625Z"
        },
        {
            "_id": "6924d50g02c924cfc602d12g87",
            "title": "Basics of JavaScript",
            "thumbnail": "http://res.cloudinary.com/image/upload/pzeofbwj8tt3nxxhgr9j.jpg",
            "owner": {
                "_id": "6923fc01f4d99g6bd21fa2214",
                "username": "testuser123"
            },
            "createdAt": "2025-11-24T21:58:24.484Z"
        }
    ],
    "message": "Posts fetched successfully",
    "success": true
}
```

**Example Requests:**

```bash
# Get posts with pagination
curl -X GET "https://college-blog-qlqp.onrender.com/api/v1/post/getAll-post?page=1&limit=10"

# Search posts
curl -X GET "https://college-blog-qlqp.onrender.com/api/v1/post/getAll-post?search=javascript&tags=nodejs"

# Get posts by specific author
curl -X GET "https://college-blog-qlqp.onrender.com/api/v1/post/getAll-post?userId=507f1f77bcf86cd799439012"

# Sort by likes
curl -X GET "https://college-blog-qlqp.onrender.com/api/v1/post/getAll-post?sortBy=likesCount&order=desc"
```

---

### Create Post

**Endpoint:** `POST /create-post`

**Description:** Create a new blog post with rich content, tags, and media.

**Authentication:** Required ✓

**Request Body:**

```json
{
  "title": "Advanced JavaScript Patterns",
  "description": "Explore closure, currying, and other advanced JS patterns",
  "content": "# Advanced JavaScript Patterns\n\n## Closures\nClosures are functions that have access to variables...",
  "tags": ["javascript", "advanced", "patterns"],
  "thumbnail": "https://cloudinary.com/image.jpg",
  "isPublished": true
}
```

**Request Field Validation:**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `title` | string | Yes | 10-200 characters, unique per author |
| `description` | string | No | Max 500 characters |
| `content` | string | Yes | Min 50 characters, supports Markdown |
| `tags` | array | No | Max 10 tags, each 2-30 characters |
| `thumbnail` | string | No | Valid URL to image |
| `isPublished` | boolean | No | Default: false (draft mode) |

**Success Response (201):**

```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Advanced JavaScript Patterns",
    "content": "# Advanced JavaScript Patterns\n\n## Closures\n...",
    "author": "507f1f77bcf86cd799439012",
    "tags": ["javascript", "advanced", "patterns"],
    "likesCount": 0,
    "commentsCount": 0,
    "viewsCount": 0,
    "isPublished": true,
    "createdAt": "2025-01-03T12:00:00Z"
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

**Error Response (400) - Validation Failed:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "title": "Title must be between 10 and 200 characters",
    "content": "Content must be at least 50 characters"
  }
}
```

**cURL Example:**

```bash
curl -X POST https://college-blog-qlqp.onrender.com/api/v1/post/create-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token" \
  -d '{
    "title": "Advanced JavaScript Patterns",
    "description": "Explore closure, currying, and other advanced JS patterns",
    "content": "# Advanced JavaScript...",
    "tags": ["javascript", "advanced"],
    "isPublished": true
  }'
```

---

### Get Single Post

**Endpoint:** `GET /get-post/:postId`

**Description:** Retrieve detailed information about a specific post.

**Authentication:** Optional

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | string | MongoDB ObjectId of the post |

**Success Response (200):**

```json
{
    "statusCode": 200,
    "data": {
        "_id": "69391a84a9bc8caf4aa7fa4a9",
        "title": "Updated title",
        "thumbnail": "http://res.cloudinary.com/image/upload/ddnn0xegmmbhh80pkpvk.webp",
        "content": "Python is one of the most popular programming languages. It’s simple to use, packed with features and supported by a wide range of libraries and frameworks. Its clean syntax makes it beginner-friendly.\n\nA high-level language, used in data science, automation, AI, web development and more.\nKnown for its readability, which means code is easier to write, understand and maintain.\nBacked by strong library support, we don’t have to build everything from scratch.",
        "catagry": "Technology",
        "views": 0,
        "isPublished": true,
        "owner": {
            "_id": "692927fa617be8cd5f1bc3b23",
            "username": "testuser1234"
        },
        "createdAt": "2025-12-10T07:00:20.625Z",
        "updatedAt": "2026-01-02T18:40:37.127Z",
        "__v": 0
    },
    "message": "Post fetched successfully",
    "success": true
}
```

---

### Update Post

**Endpoint:** `PUT /update-post/:postId`

**Description:** Update post content, metadata, or publication status.

**Authentication:** Required ✓ (Author only)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | string | MongoDB ObjectId of the post |

**Request Body:** (All fields optional - partial updates supported)

```json
{
  "title": "Advanced JavaScript Patterns - Updated",
  "description": "Updated description...",
  "content": "Updated content...",
  "tags": ["javascript", "advanced", "patterns", "closures"],
  "thumbnail": "https://cloudinary.com/new-thumbnail.jpg",
  "isPublished": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Advanced JavaScript Patterns - Updated",
    "updatedAt": "2025-01-03T12:30:00Z"
  },
  "timestamp": "2025-01-03T12:30:00Z"
}
```

**Error Response (403) - Unauthorized:**

```json
{
  "success": false,
  "message": "You are not authorized to update this post",
  "errorCode": "UNAUTHORIZED"
}
```

---

### Delete Post

**Endpoint:** `DELETE /delete-post/:postId`

**Description:** Permanently delete a blog post.

**Authentication:** Required ✓ (Author only)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | string | MongoDB ObjectId of the post |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Post deleted successfully",
  "data": {
    "deletedPostId": "507f1f77bcf86cd799439011"
  },
  "timestamp": "2025-01-03T12:30:00Z"
}
```

---

## Users

Base URL: `/users`

Handle user authentication, profile management, and account operations.

### Register User

**Endpoint:** `POST /register`

**Description:** Create a new user account with email verification.

**Authentication:** Not required

**Request Body:**

```json
{
  "fullName": "testuser1",
  "email": "testuser1@gmail.com",
  "password": "**************",
}
```

**Field Validation:**

| Field | Type | Validation |
|-------|------|-----------|
| `fullName` | string | 2-100 characters |
| `email` | string | Valid email format, unique |
| `password` | string | Min 8 chars, must include: uppercase, lowercase, number, special char |


**Success Response (201):**

```json
{
    "statusCode": 201,
    "data": {
        "_id": "695824a27ada76ca5e2eb0a8",
        "username": "testuser1",
        "email": "testuser1@gmail.com",
        "fullName": "Test User1",
        "createdAt": "2026-01-02T20:03:46.321Z",
        "updatedAt": "2026-01-02T20:03:46.321Z",
        "__v": 0
    },
    "message": "User registered successfully",
    "success": true
}
```

**Error Response (409) - Conflict:**

```json
{
  "success": false,
  "message": "Email already registered with another account",
  "errorCode": "EMAIL_EXISTS"
}
```

---

### Login User

**Endpoint:** `POST /login`

**Description:** Authenticate user and receive JWT tokens.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "testuser1@gmail.com",
  "password": "**************"
}
```

**Success Response (200):**

```json
{
    "statusCode": 200,
    "data": {
        "user": {
            "_id": "695824a27ada76ca5e2eb0a8",
            "username": "testuser1",
            "email": "testuser1@gmail.com",
            "fullName": "Test User1",
            "createdAt": "2026-01-02T20:03:46.321Z",
            "updatedAt": "2026-01-02T20:07:16.957Z",
            "__v": 0
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.."
    },
    "message": "Logged in successfully",
    "success": true
}
```

---

### Logout User

**Endpoint:** `POST /logout`

**Description:** Invalidate user session and revoke refresh token.

**Authentication:** Required ✓

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Get Current User

**Endpoint:** `GET /currentUser`

**Description:** Retrieve authenticated user's profile and statistics.

**Authentication:** Required ✓

**Success Response (200):**

```json
{
    "statusCode": 200,
    "data": {
        "_id": "695824a27ada76ca5e2eb0a8",
        "username": "testuser1",
        "email": "testuser1@gmail.com",
        "fullName": "Test User1",
        "createdAt": "2026-01-02T20:03:46.321Z",
        "updatedAt": "2026-01-02T20:07:16.957Z",
        "__v": 0
    },
    "message": "Current user fetched successfully",
    "success": true
}
```

---

### Refresh Token

**Endpoint:** `POST /refresh-token`

**Description:** Generate new access token using refresh token.

**Authentication:** Not required (uses refresh token)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "tokenExpiry": 3600,
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Get User Profile

**Endpoint:** `GET /profile`

**Description:** Retrieve authenticated user's detailed profile.

**Authentication:** Required ✓

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "john_doe",
    "fullName": "John Doe",
    "email": "john@college.edu",
    "avatar": "https://cloudinary.com/avatar.jpg",
    "bio": "Passionate about web development",
    "coverImage": "https://cloudinary.com/cover.jpg",
    "postsCount": 12,
    "followersCount": 45,
    "followingCount": 30,
    "recentPosts": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "My Latest Post",
        "createdAt": "2025-01-03T12:00:00Z"
      }
    ],
    "createdAt": "2025-01-01T10:00:00Z"
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Update User Profile

**Endpoint:** `PUT /update-profile`

**Description:** Update user profile information.

**Authentication:** Required ✓

**Request Body:** (All fields optional)

```json
{
  "fullName": "John Doe Updated",
  "bio": "Updated bio with achievements and interests",
  "coverImage": "https://cloudinary.com/new-cover.jpg",
  "username": "john_doe_pro"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "john_doe_pro",
    "fullName": "John Doe Updated",
    "bio": "Updated bio with achievements and interests"
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Update Avatar

**Endpoint:** `PUT /update-avatar`

**Description:** Upload new avatar image.

**Authentication:** Required ✓

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `avatar` | file | Yes | JPG, PNG, WebP (max 5MB) |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatar": "https://cloudinary.com/avatars/507f1f77bcf86cd799439012.jpg",
    "updatedAt": "2025-01-03T12:30:00Z"
  },
  "timestamp": "2025-01-03T12:30:00Z"
}
```

**cURL Example:**

```bash
curl -X PUT https://college-blog-qlqp.onrender.com/api/v1/users/update-avatar \
  -H "Authorization: Bearer your_access_token" \
  -F "avatar=@/path/to/avatar.jpg"
```

---

### Forget Password

**Endpoint:** `POST /forget-password`

**Description:** Request password reset link via email.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "john@college.edu"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset link sent to your email",
  "data": {
    "resetTokenExpiry": 1800
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

## Likes

Base URL: `/like`

Manage user interactions through likes on posts and comments.

### Toggle Post Like

**Endpoint:** `POST /toggle/post/:postId`

**Description:** Like or unlike a post (toggle functionality).

**Authentication:** Required ✓

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | string | MongoDB ObjectId of post |

**Success Response (200) - Liked:**

```json
{
  "success": true,
  "message": "Post liked successfully",
  "data": {
    "postId": "507f1f77bcf86cd799439011",
    "isLiked": true,
    "totalLikes": 43
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

**Success Response (200) - Unliked:**

```json
{
  "success": true,
  "message": "Post unliked successfully",
  "data": {
    "postId": "507f1f77bcf86cd799439011",
    "isLiked": false,
    "totalLikes": 42
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Toggle Comment Like

**Endpoint:** `POST /toggle/comment/:commentId`

**Description:** Like or unlike a comment.

**Authentication:** Required ✓

**Success Response (200):**

```json
{
  "success": true,
  "message": "Comment liked successfully",
  "data": {
    "commentId": "507f1f77bcf86cd799439013",
    "isLiked": true,
    "totalLikes": 5
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Get Liked Posts

**Endpoint:** `GET /liked/posts`

**Description:** Retrieve all posts liked by current user.

**Authentication:** Required ✓

**Query Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `page` | integer | No | 1 |
| `limit` | integer | No | 10 |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Amazing Post",
      "description": "Post description...",
      "author": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "john_doe",
        "avatar": "https://cloudinary.com/avatar.jpg"
      },
      "likesCount": 42,
      "thumbnail": "https://cloudinary.com/thumb.jpg",
      "createdAt": "2025-01-01T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

## Subscriptions

Base URL: `/subscriptions`

Manage subscriptions to content creators and channels.

### Subscribe/Unsubscribe to Channel

**Endpoint:** `POST /c/:channelId`

**Description:** Subscribe or unsubscribe from a creator's channel (toggle).

**Authentication:** Required ✓

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `channelId` | string | MongoDB ObjectId of creator |

**Success Response (200) - Subscribed:**

```json
{
  "success": true,
  "message": "Subscribed to channel successfully",
  "data": {
    "channelId": "507f1f77bcf86cd799439012",
    "isSubscribed": true,
    "subscriberCount": 101
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

**Success Response (200) - Unsubscribed:**

```json
{
  "success": true,
  "message": "Unsubscribed from channel successfully",
  "data": {
    "channelId": "507f1f77bcf86cd799439012",
    "isSubscribed": false,
    "subscriberCount": 100
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

### Get User Subscriptions

**Endpoint:** `GET /u/:subscriberId`

**Description:** Retrieve list of channels a user is subscribed to.

**Authentication:** Required ✓

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `subscriberId` | string | MongoDB ObjectId of user |

**Query Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `page` | integer | No | 1 |
| `limit` | integer | No | 10 |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "username": "popular_creator",
      "fullName": "Popular Creator",
      "avatar": "https://cloudinary.com/avatar.jpg",
      "bio": "Tech content creator and educator",
      "subscriberCount": 5000,
      "postCount": 45,
      "isSubscribedByCurrentUser": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Scenario |
|--------|---------|----------|
| `200` | OK | Request successful |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Missing/invalid fields |
| `401` | Unauthorized | Missing/invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable | Validation failed |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal error |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errorCode": "ERROR_CODE_CONSTANT",
  "details": {
    "field_name": "Specific error for this field"
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

### Common Error Codes

| Code | Meaning | Status |
|------|---------|--------|
| `VALIDATION_ERROR` | Input validation failed | 422 |
| `UNAUTHORIZED` | Auth token invalid/missing | 401 |
| `FORBIDDEN` | User lacks permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

---

## Response Format

### Standard Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response payload
  },
  "timestamp": "2025-01-03T12:00:00Z"
}
```

### Response Headers

```
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-ID: uuid-v4-request-identifier
X-Response-Time: 125ms
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1609459200
```

---

## Rate Limiting & Pagination

### Rate Limiting

**Limits:** 100 requests per 15 minutes per IP address

**Headers in Response:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1609459200
```

**Error Response (429):**

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300
}
```

### Pagination

All list endpoints support pagination with consistent parameters:

```bash
# Request
GET /api/v1/post/getAll-post?page=2&limit=20

# Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Security Best Practices

### For Developers

1. **Always use HTTPS** - Never send tokens over HTTP
2. **Store tokens securely** - Use httpOnly cookies, not localStorage
3. **Validate input** - Never trust client data
4. **Use environment variables** - Never hardcode secrets
5. **Implement CORS** - Restrict to trusted origins
6. **Hash passwords** - Use bcrypt (min 10 rounds)
7. **Expire tokens** - Implement short-lived access tokens
8. **Sanitize output** - Prevent XSS attacks

### For Users

1. **Never share tokens** - Tokens grant access to your account
2. **Use strong passwords** - Min 8 chars with mixed case + numbers + symbols
3. **Logout when done** - Especially on shared devices
4. **Update regularly** - Keep credentials current and unique
5. **Report suspicious activity** - Contact support immediately

### CORS Configuration

```javascript
const corsOptions = {
  origin: ['https://full-stack-bloging-web.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

---

## Testing Guide

### Using Postman

1. **Import Collection:**
   - Download: `college-blog-api.postman_collection.json`
   - Import in Postman → Collections

2. **Set Environment Variables:**
   ```json
   {
     "baseUrl": "https://college-blog-qlqp.onrender.com/api/v1",
     "accessToken": "{{token_from_login}}",
     "postId": "{{post_id}}"
   }
   ```

3. **Run Tests:**
   - Postman → Run Collection → Select Environment

### Using cURL

```bash
#!/bin/bash

# Register
REGISTER=$(curl -X POST https://college-blog-qlqp.onrender.com/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User"
  }')

# Login
LOGIN=$(curl -X POST https://college-blog-qlqp.onrender.com/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }')

TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')

# Create Post
curl -X POST https://college-blog-qlqp.onrender.com/api/v1/post/create-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Post",
    "content": "This is a test post with minimum required fields",
    "tags": ["test"],
    "isPublished": true
  }'
```

### Using JavaScript/Fetch

```javascript
// Helper function
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(
    `https://college-blog-qlqp.onrender.com/api/v1${endpoint}`,
    { ...options, headers }
  );
  
  return response.json();
};

// Usage examples
(async () => {
  // Register
  const register = await api('/users/register', {
    method: 'POST',
    body: JSON.stringify({
      username: 'test_user',
      email: 'test@example.com',
      password: 'TestPass123!',
      fullName: 'Test User'
    })
  });
  
  // Login
  const login = await api('/users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'TestPass123!'
    })
  });
  
  localStorage.setItem('accessToken', login.data.accessToken);
  
  // Get all posts
  const posts = await api('/post/getAll-post?page=1&limit=10');
  console.log(posts);
  
  // Create post
  const newPost = await api('/post/create-post', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Post',
      content: 'Test content...',
      isPublished: true
    })
  });
  console.log(newPost);
})();
```

---

## Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Expired token | Refresh using `/refresh-token` endpoint |
| 403 Forbidden | Insufficient permissions | Ensure you're the post author or admin |
| 404 Not Found | Invalid ID format | Verify ObjectId format is correct |
| 422 Validation Error | Invalid input data | Check field types and constraints |
| 429 Too Many Requests | Rate limit exceeded | Wait 15 minutes before retrying |

### Debug Tips

1. **Check headers:** Ensure Authorization header is correctly formatted
2. **Verify tokens:** Decode JWT at jwt.io to inspect claims
3. **Validate JSON:** Use JSON validator before sending requests
4. **Check timestamps:** Ensure token hasn't expired (check exp claim)
5. **Monitor rate limits:** Track X-RateLimit-* headers
6. **View error details:** Check `errorCode` and `details` fields

### Getting Help

- **Documentation:** Review this file completely
- **GitHub Issues:** Create issue with details and error logs
- **Discord Community:** Ask questions in community server
- **Email Support:** Contact development team

---

## Changelog

### Version 1.0.0 (January 3, 2026)

**Features:**
- ✅ Post management (CRUD operations)
- ✅ User authentication (JWT-based)
- ✅ Social features (likes, subscriptions)
- ✅ File upload support (Cloudinary)
- ✅ Pagination and filtering
- ✅ Rate limiting
- ✅ Comprehensive error handling

**Improvements:**
- ✅ RESTful endpoint design
- ✅ Consistent response format
- ✅ Input validation
- ✅ Token refresh mechanism
- ✅ CORS support

**Documentation:**
- ✅ Complete API reference
- ✅ Code examples (multiple languages)
- ✅ Error handling guide
- ✅ Security best practices
- ✅ Testing guide

---

## Quick Links

- **GitHub Repository:** [college-blog](https://github.com/deepaksingh2002/bloging-web-api)
- **Live API:** https://college-blog-qlqp.onrender.com/api/v1
- **Environment:** Production (Render.com)
- **Database:** MongoDB Atlas

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Contact & Support

| Channel | Info |
|---------|------|
| **Email** | deepakksingh1202@gmail.com |
| **GitHub** |[github.com/deepaksingh2002](https://github.com/deepaksingh2002) |
| **LinkedIn** | [www.linkedin.com/in/deepaksingh2002](https://www.linkedin.com/in/deepaksingh2002) |


---

**Last Updated:** January 3, 2026 | **Maintained By:** Deepak Singh | **API Status:** 🟢 Operational

