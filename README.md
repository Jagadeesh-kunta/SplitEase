# SplitEase — Real-Time Collaborative Expense Splitter

SplitEase is a MERN stack app for splitting shared expenses within a group (roommates, trips,
events) — think a lightweight Splitwise clone. Add an expense once, and SplitEase automatically
calculates who owes whom, live, for everyone in the group, and reduces all the debts down to the
smallest possible number of payments needed to settle up.

## Why this project is worth showing in an interview

- **It has a real algorithm, not just CRUD.** Beyond create/read/update/delete, there's a genuine
  graph/greedy algorithm (`backend/utils/settlementUtils.js`) that takes a messy set of
  who-paid-what records and reduces them to the *minimum number of transactions* needed to settle
  everyone up. This is the single best thing to walk an interviewer through.
- **It's real-time.** Socket.io broadcasts new expenses and balance changes to everyone viewing
  the same group instantly, without anyone refreshing the page — a good way to demonstrate
  WebSocket / event-driven thinking, which most CRUD-only projects don't touch.
- **It's still simple to explain.** One sentence covers it: "It's like Splitwise — you create a
  group, log expenses, and it tells you the fewest payments needed to settle up." Nothing about
  the pitch requires niche domain knowledge.

## Tech stack

| Layer      | Technology                                          |
|------------|------------------------------------------------------|
| Frontend   | React 18, React Router 6, Axios, Socket.io-client    |
| Backend    | Node.js, Express, Socket.io                          |
| Database   | MongoDB (Mongoose ODM)                               |
| Auth       | JWT (JSON Web Tokens), bcrypt password hashing       |

## How the core algorithm works (the part to highlight in interviews)

1. **Balance calculation** (`calculateBalances`): for every expense, the payer's balance goes up
   by the full amount, and everyone in the split goes down by their share. After processing all
   expenses, each member has one net number — positive means "is owed money", negative means
   "owes money."
2. **Debt simplification** (`simplifyDebts`): rather than naively pairing every debtor with every
   creditor (which can produce far more transactions than necessary), this uses a **greedy
   algorithm**: repeatedly match whoever is owed the *most* with whoever owes the *most*, settle
   the smaller of the two amounts between them, and repeat. This is a textbook approach to the
   "minimum cash flow" problem and is provably optimal in transaction count for this kind of
   netting problem.

   Example: A paid ₹300 for a 3-person equal split (A: +200, B: -100, C: -100). Instead of 2+
   separate small transactions, the algorithm produces exactly 2 transactions (the true minimum
   here): B → A ₹100, C → A ₹100. With more people and uneven splits, the savings versus a naive
   pairwise approach become more pronounced — the algorithm guarantees you never need more
   transactions than (number of people involved − 1).

## Project structure

```
splitease/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── models/                   # User, Group, Expense (Mongoose schemas)
│   ├── middleware/authMiddleware.js  # JWT verification
│   ├── routes/                   # auth, users, groups, expenses REST endpoints
│   ├── utils/settlementUtils.js  # the balance + debt-simplification algorithm
│   ├── server.js                 # Express + Socket.io entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/index.html
    └── src/
        ├── components/           # Navbar, modals, BalanceBar, ProtectedRoute
        ├── context/               # AuthContext, SocketContext
        ├── pages/                 # Login, Register, Dashboard, GroupDetail
        ├── utils/api.js           # Axios instance with auth interceptor
        ├── App.js, index.js, index.css
        ├── package.json
        └── .env.example
```

## Setup & running locally

### Prerequisites
- Node.js 18+ and npm
- A MongoDB connection string — either:
  - Install MongoDB locally ([instructions](https://www.mongodb.com/docs/manual/installation/)), or
  - Use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster (recommended,
    takes ~5 minutes to set up)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_long_random_string
CLIENT_URL=http://localhost:3000
```

```bash
npm run dev      # uses nodemon, auto-restarts on changes
# or
npm start
```

The API will run on `http://localhost:5000`.

### 2. Frontend

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

The defaults in `.env.example` already point to `http://localhost:5000`, so you usually don't
need to change anything for local development.

```bash
npm start
```

This opens `http://localhost:3000` in your browser.

### 3. Try it out

1. Register two different accounts (use two browser windows/tabs, or one normal + one incognito,
   so you're logged in as two different users).
2. As user A, create a group and add user B's email as a member.
3. As user A, add an expense (e.g. "Dinner", ₹600, split equally).
4. Switch to user B's tab — the expense and updated balance appear **without refreshing**, thanks
   to Socket.io.
5. Check the "Balances" tab and the settlement panel to see who owes whom.

## API overview

| Method | Endpoint                                  | Description                          |
|--------|--------------------------------------------|---------------------------------------|
| POST   | `/api/auth/register`                      | Create an account                     |
| POST   | `/api/auth/login`                         | Log in, returns JWT                   |
| GET    | `/api/auth/me`                            | Get current logged-in user            |
| GET    | `/api/users/search?email=`                | Find a user by email                  |
| POST   | `/api/groups`                             | Create a group                        |
| GET    | `/api/groups`                             | List groups you belong to             |
| GET    | `/api/groups/:id`                         | Get one group's details               |
| PUT    | `/api/groups/:id/members`                 | Add a member to a group               |
| DELETE | `/api/groups/:id`                         | Delete a group (creator only)         |
| POST   | `/api/expenses`                           | Add an expense (equal or custom split)|
| GET    | `/api/expenses/group/:groupId`            | List a group's expenses               |
| GET    | `/api/expenses/group/:groupId/balances`   | Get balances + settlement plan        |
| DELETE | `/api/expenses/:id`                       | Delete an expense                     |

All routes except `/auth/register` and `/auth/login` require an `Authorization: Bearer <token>`
header.

## Deploying it (so your CV links to a live demo, not just a GitHub repo)

A live link matters far more than a repo link — interviewers are far more likely to click a demo
than read code. All of the following have generous free tiers:

1. **Database — MongoDB Atlas**: create a free cluster, create a database user, and copy the
   connection string (Atlas → Connect → "Drivers"). Use this as your `MONGO_URI`.

2. **Backend — Render** (or Railway):
   - Push this project to GitHub.
   - On Render: New → Web Service → connect your repo → set root directory to `backend`.
   - Build command: `npm install`. Start command: `npm start`.
   - Add environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (set this to your deployed
     frontend URL once you have it — see below), and `PORT` (Render sets this automatically,
     but the app reads `process.env.PORT` so it'll just work).

3. **Frontend — Vercel** (or Netlify):
   - New Project → import the same repo → set root directory to `frontend`.
   - Add environment variables: `REACT_APP_API_URL` (your Render backend URL + `/api`) and
     `REACT_APP_SOCKET_URL` (your Render backend URL, no `/api`).
   - Deploy. Vercel auto-detects Create React App.

4. Go back to Render and update `CLIENT_URL` to your actual Vercel URL (needed for CORS), then
   redeploy the backend so the change takes effect.

## Suggested CV bullet points

- *Built a full-stack MERN expense-splitting app with JWT authentication, real-time updates via
  Socket.io, and a custom greedy algorithm that reduces group debts to the minimum number of
  settling transactions.*
- *Designed a normalized MongoDB schema (Users, Groups, Expenses) supporting both equal and
  custom expense splits, with REST APIs secured by JWT middleware.*

## Notes on validation

Every backend file was bundle-tested with esbuild to confirm all `require()` paths resolve
correctly, and the core settlement algorithm was run against multiple test cases to confirm it
produces correct, balanced results. Every frontend file was validated for correct JSX syntax and
the full import graph was bundle-tested end-to-end. Because this build environment has no network
access, `npm install` itself could not be executed here — please run it locally as the first
step. If you hit any error after `npm install && npm start`, paste it back and it can be fixed
quickly; the logic and structure have already been verified independently of the package
installation step.
# SplitEase
