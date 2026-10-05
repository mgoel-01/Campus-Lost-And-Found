# Campus Lost & Found

A website where students post items they have found on campus, and anyone who lost
something can search for it and send a claim request to get it back.

Built with **MongoDB, Express, React and Node.js (MERN)**.

---

## What it does

- **Post an item** you found (or report something you lost) with a photo, category,
  location and date.
- **Search and filter** everything that has been posted - by keyword, category,
  found/lost, and whether it is still open.
- **Claim an item**: describe a detail that proves it is yours and send the request
  to whoever posted it.
- **Approve or reject** requests on your own posts. Approving marks the item as
  returned and automatically rejects the other pending requests for it.
- **Accounts**: sign up / log in. Passwords are hashed, sessions use JWT tokens.
- **Privacy**: a poster's email and phone are only visible to logged-in users, so
  contact details are not exposed to the open internet.

---

## Running the project

You need [Node.js](https://nodejs.org) and MongoDB installed. MongoDB is already
running as a Windows service on this machine, so you can skip straight to step 1.

### 1. Start the backend (API)

```bash
cd server
npm install       # only needed the first time
npm run seed      # optional: fills the database with sample items
npm run dev
```

The API runs at **http://localhost:5000**.

### 2. Start the frontend (website)

Open a **second terminal**:

```bash
cd client
npm install       # only needed the first time
npm run dev
```

The website runs at **http://localhost:5173**. Open that link in your browser.

### Demo logins (created by `npm run seed`)

| Email               | Password    |
| ------------------- | ----------- |
| aarav@campus.edu    | password123 |
| priya@campus.edu    | password123 |
| rahul@campus.edu    | password123 |

---

## Running the automated tests

```bash
cd server
npm test
```

This runs 45 system test cases (TC-01 to TC-45) in
[server/tests/api.test.js](server/tests/api.test.js). They start the real API and use a
separate database, `campus-lost-found-test`, which is wiped before and after, so your
demo data is never touched. MongoDB must be running.

---

## Assignment documents

Everything for the five team roles is in [docs/](docs/):

| File                            | Student | Contents                                          |
| ------------------------------- | ------- | ------------------------------------------------- |
| `1_Requirements_Analysis.docx`  | 1       | Problem, stakeholders, FR / NFR, feasibility, use cases |
| `2_System_Design_UML.docx`      | 2       | Five UML diagrams with explanations, DB + API design |
| `3_Development_Report.docx`     | 3       | Stack, architecture, code walkthrough, demo screenshots |
| `4_Testing_Report.docx`         | 4       | Test plan, 45 + 10 test cases, results, defects   |
| `5_SRS_Document.docx`           | 5       | Full SRS in IEEE 830 structure                    |
| `6_Presentation.pptx`           | all     | 20-minute deck with speaker notes                 |
| `diagrams/`                     | -       | The UML diagrams as PNG images                    |
| `screenshots/`                  | -       | Screenshots of the running app (also usable as UI-test evidence) |

---

## How the two halves talk to each other

The React app calls `/api/...`. During development Vite forwards (proxies) those
requests to the Express server on port 5000 - that is set up in
[client/vite.config.js](client/vite.config.js). This means you never have to write
`http://localhost:5000` inside the React code, and there are no CORS problems.

When a user logs in, the server sends back a **JWT token**. The React app stores it
in `localStorage` and attaches it to every later request as an
`Authorization: Bearer <token>` header - see [client/src/api.js](client/src/api.js).

---

## Project structure

```
SE PROJECT/
├── server/                     Backend - Express REST API
│   ├── .env                    Port, database URL, JWT secret (not committed)
│   ├── uploads/                Uploaded item photos
│   ├── tests/api.test.js       Automated system tests (npm test)
│   └── src/
│       ├── index.js            Connects to MongoDB and starts the server
│       ├── app.js              The Express app: middleware and routes
│       ├── config/db.js        MongoDB connection
│       ├── models/             Database schemas: User, Item, Claim
│       ├── middleware/         Login check, file upload, error handling
│       ├── routes/             API endpoints: auth, items, claims
│       └── seed.js             Fills the database with sample data
│
└── client/                     Frontend - React (Vite)
    ├── vite.config.js          Dev server + API proxy
    └── src/
        ├── main.jsx            App entry point
        ├── App.jsx             All the page routes
        ├── api.js              Axios setup, attaches the login token
        ├── context/            Logged-in user state shared across pages
        ├── components/         Navbar, ItemCard, ProtectedRoute
        └── pages/              Home, ItemDetail, ReportItem, Login,
                                Register, MyPosts, Requests
```

---

## Database design

**User** - name, email (unique), password (hashed with bcrypt), phone, role

**Item** - type (`found` / `lost`), title, description, category, location, date,
imageUrl, status (`open` / `resolved`), postedBy → User, resolvedWith → User

**Claim** - item → Item, claimant → User, message, status
(`pending` / `approved` / `rejected`).
A unique index on (item, claimant) stops the same person claiming an item twice.

---

## API endpoints

| Method | Endpoint               | Who can use it     | What it does                          |
| ------ | ---------------------- | ------------------ | ------------------------------------- |
| POST   | `/api/auth/register`   | Anyone             | Create an account                     |
| POST   | `/api/auth/login`      | Anyone             | Log in, returns a token               |
| GET    | `/api/auth/me`         | Logged in          | Details of the current user           |
| GET    | `/api/items`           | Anyone             | List/search items (q, category, type, status, page) |
| GET    | `/api/items/:id`       | Anyone             | One item (contact hidden if logged out) |
| GET    | `/api/items/mine`      | Logged in          | Items you posted                      |
| GET    | `/api/items/stats`     | Anyone             | Counts shown on the home page         |
| GET    | `/api/items/categories`| Anyone             | The category list                     |
| POST   | `/api/items`           | Logged in          | Post an item (photo optional)         |
| PATCH  | `/api/items/:id`       | Owner / admin      | Edit or mark as returned              |
| DELETE | `/api/items/:id`       | Owner / admin      | Delete a post and its claims          |
| POST   | `/api/claims`          | Logged in          | Send a claim request                  |
| GET    | `/api/claims/sent`     | Logged in          | Requests you sent                     |
| GET    | `/api/claims/received` | Logged in          | Requests on your posts                |
| PATCH  | `/api/claims/:id`      | Item owner         | Approve or reject a request           |

---

## Security notes (worth mentioning in your report)

- Passwords are never stored as plain text - `bcrypt` hashes them before saving,
  and the password field is excluded from queries by default.
- Every write endpoint checks ownership, so one student cannot edit or delete
  another student's post.
- Photo uploads are limited to image files under 5 MB, and each file is renamed to a
  random UUID so a malicious filename cannot overwrite anything.
- Search text is escaped before being turned into a regular expression, which
  prevents regex injection.
- The JWT secret lives in `.env`, which is excluded from git by `.gitignore`.

---

## Possible future improvements

- Email notification when someone claims your item
- Campus-email-only sign up (restrict to your college domain)
- Admin dashboard to remove spam posts
- Image similarity search to match lost and found items automatically
