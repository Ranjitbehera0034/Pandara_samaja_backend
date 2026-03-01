# Member Portal API Reference

Base URL: `/api/portal`

## Authentication

### Login
**POST** `/login`
Authenticate a member using their Membership No. and Mobile Number.
- **Body:** `{ "membership_no": "MEM1234567", "mobile": "9876543210" }`
- **Response:** Returns JWT token and member profile.
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1Ni...",
  "member": { ... }
}
```

### Get Profile
**GET** `/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Full profile of the logged-in member.

---

## Profile Management

### Update Profile
**PUT** `/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** JSON object with fields to update (`name`, `mobile`, `address`, `village`, etc.)
- **Response:** Updated member object.

### Upload Profile Photo
**POST** `/profile/photo`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `FormData` with file field `photo`.

---

## Community Feed

### Get Posts
**GET** `/posts?page=1&limit=20`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** List of posts with author info, likes count, and `liked_by_me` status.

### Create Post
**POST** `/posts`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `FormData`
  - `text`: (optional) Text content
  - `images`: (optional) File uploads (max 10)

### Delete Post
**DELETE** `/posts/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Note:** Can only delete your own posts.

---

## Interactions

### Toggle Like
**POST** `/posts/:id/like`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ "liked": true/false, "likes_count": 10 }`

### Add Comment
**POST** `/posts/:id/comments`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "text": "Nice post!" }`

### Get Comments
**GET** `/posts/:id/comments`
- **Headers:** `Authorization: Bearer <token>`

---

## Photo Gallery

### Get My Photos
**GET** `/photos`
- **Headers:** `Authorization: Bearer <token>`

### Upload Photos
**POST** `/photos`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `FormData` with field `photos` (multiple files).

### Delete Photo
**DELETE** `/photos/:id`

---

## Subscriptions (Follow System)

### Toggle Follow
**POST** `/subscribe/:memberId`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ "subscribed": true/false }`

### Get My Subscriptions
**GET** `/subscriptions`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** List of members I am following.

### Get Member Directory (with status)
**GET** `/members`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** List of all members, including `is_subscribed` status for each.
