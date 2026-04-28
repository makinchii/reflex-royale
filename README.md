# CS160 Term Project Starter

This is a very basic full-stack starter template using Node.js, Express, MongoDB Atlas, Mongoose, and plain HTML/CSS/JavaScript.

## Features

- Sign up with username and password
- Login with username and password
- Password hashing with bcrypt
- MongoDB Atlas storage through Mongoose
- Simple dashboard page for future game or room features
- Guest-friendly gameplay with optional logged-in account support
- Server-authoritative online rooms with chat, reconnect, and host control

## Project Structure

```text
cs160_termProject/
  package.json
  server.js
  .env.example
  README.md
  /models
    User.js
  /routes
    auth.js
  /public
    style.css
    script.js
  /views
    index.html
    signup.html
    login.html
    dashboard.html
```

## 1. Install Dependencies

```bash
npm install
```

## 2. Add Your MongoDB Atlas Connection String

Create a `.env` file in the project root and copy the variables from `.env.example`.

```env
MONGODB_URI=your_mongodb_atlas_connection_string_here
PORT=3000
SESSION_SECRET=your_session_secret_here
NODE_ENV=development
TRUST_PROXY=false
```

Paste your real MongoDB Atlas connection string into `MONGODB_URI`.

## 3. Run the Server

For normal use:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## 4. Deploy to Render

This project includes a `render.yaml` blueprint for a same-origin public deployment.

1. Create a new Render web service from the repo.
2. Add `MONGODB_URI` from MongoDB Atlas.
3. Add a strong `SESSION_SECRET`.
4. Keep `NODE_ENV=production` and `TRUST_PROXY=true`.
5. Deploy the service and use the Render URL as the public demo site.

In production, the app uses HTTPS-safe session cookies and Socket.IO on the same origin.

## 5. How the Signup/Login Flow Works

1. The landing page shows links for Sign Up and Login.
2. The signup form sends a `POST` request to `/api/auth/signup`.
3. The server checks that username and password are present.
4. The server checks whether the username already exists.
5. If the username is new, the password is hashed with bcrypt and saved to MongoDB.
6. The login form sends a `POST` request to `/api/auth/login`.
7. The server looks up the username and compares the entered password with the hashed password in MongoDB.
8. If login succeeds, the browser redirects to `/dashboard`.

## 6. Where to Check Saved Users in MongoDB Atlas

1. Open your MongoDB Atlas project.
2. Go to your cluster.
3. Open `Browse Collections`.
4. Look for the database named by your connection string.
5. Open the `users` collection to see saved user documents.

## Notes

- Sessions are stored with express-session and connect-mongo.
- Gameplay routes are guest-friendly; login is only needed for account/profile features.
- The online game uses Socket.IO and a server-authoritative room model.

## Tests

Run the core GameEngine tests with:

```bash
npm test
```

Use this after major changes to the match loop, scoring, ready flow, or timing logic.

# reaction-game
