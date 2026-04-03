# WalletDash

WalletDash is a multi-user wallet and bank-account dashboard built with Next.js 16, React 19, and MongoDB.

## Setup

Create `.env.local` in the project root:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=bankapp
```

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Authentication uses HTTP-only session cookies.
- MongoDB stores users, sessions, wallets, bank accounts, transactions, and customer data.
- New users start with a clean account instead of seeded wallets or bank accounts.

## Project Structure

```text
app/                  Next.js routes, pages, layouts, and route handlers
features/             Frontend feature modules
  auth/               Login and registration UI
  dashboard/          Dashboard cards, charts, and account sections
  layout/             Shared shell components like the navbar
  settings/           Account settings UI
  wallet/             Wallet context and wallet-related modals
server/               Backend-only application code
  auth/               Authentication and session logic
  customers/          Customer listing and export services
  db/                 MongoDB connection setup
  wallet/             Wallet, bank account, and transaction services
shared/               Shared domain types used by frontend and backend
app/api/              HTTP endpoints that call the server layer
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
