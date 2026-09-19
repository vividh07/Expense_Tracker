# Expense_Tracker

Everyday expense tracker built with the **MERN** stack (MongoDB, Express, React, Node).  
Track spends and income in ₹, manage banks & cash, budgets, transfers, recurring bills, reports, and a glass UI — with PWA / offline support.

Designed so you can run **everything on your own laptop**: database, API, and website — and open it from **anywhere** with Cloudflare Tunnel.

---

## Features

- Email/password + Google sign-in  
- Per-user data isolation (JWT)  
- Wallets: cash + multiple banks with opening balances  
- Expenses, income, transfers  
- Edit / delete with balance rollback  
- Categories + optional monthly budgets + overspend popup  
- Recurring rules (rent / EMI)  
- Home insights & period reports  
- Quick-add expense & income from Home  
- History search & filters (type, category, wallet, dates)  
- Light (white glass) / dark (black glass) themes  
- Responsive layout + PWA install / offline shell  

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React (Vite), React Router, Recharts, Framer Motion, PWA |
| Backend | Node.js, Express |
| Database | MongoDB (local on your laptop) |
| Auth | bcrypt + JWT (+ optional Google OAuth) |

---

## Project structure

```
/
├── client/          # React app (Vite)
├── server/          # Express API (+ serves built frontend)
├── package.json     # root scripts: install, build, start, host
└── README.md
```

---

## Prerequisites

- **Node.js 18+**  
- **MongoDB Community** installed and running on this PC  
  - Windows: [MongoDB Community download](https://www.mongodb.com/try/download/community)  
  - Default URI: `mongodb://127.0.0.1:27017`  
- (Optional) **Cloudflare account** — to expose the app to the internet  
- (Optional) Google Cloud OAuth client — for Google login  

---

## Quick start (this laptop only)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the API

```bash
cd server
copy .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expense-tracker
JWT_SECRET=pick_a_long_random_secret
CLIENT_URL=http://localhost:5000
NODE_ENV=production
GOOGLE_CLIENT_ID=
```

Leave `USE_MEMORY_DB` unset — that mode does **not** save data to disk.

### 3. Configure the frontend build (same-origin API)

Create `client/.env.production`:

```env
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=
```

`/api` means the browser talks to the **same host** that serves the website (your Express server / tunnel URL). Perfect for laptop hosting.

### 4. Build frontend + start server

From the **repo root**:

```bash
npm run host
```

Or step by step:

```bash
npm run build
npm start
```

Open: **http://localhost:5000**

- API: `http://localhost:5000/api/health`  
- Data files live in your local MongoDB data directory (on this laptop’s disk)

---

## Development (hot reload)

Use two terminals:

```bash
# Terminal 1 — API
npm run dev:server

# Terminal 2 — Vite UI
cd client
copy .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm run dev
```

Open the Vite URL (usually http://localhost:5173).

---

## Access from anywhere (Cloudflare Tunnel)

Your laptop stays the only server. Cloudflare gives you a public HTTPS URL that forwards to `localhost:5000`.

### A. One-command quick tunnel (fastest test)

1. Start the app: `npm run host`  
2. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)  
3. Run:

```bash
cloudflared tunnel --url http://localhost:5000
```

4. Copy the `https://….trycloudflare.com` URL  
5. Set in `server/.env`:

```env
CLIENT_URL=https://YOUR-SUBDOMAIN.trycloudflare.com
NODE_ENV=production
```

6. Restart `npm start`  
7. Open that HTTPS link on your phone (mobile data) to verify  

> Free quick-tunnel URLs change every time you restart cloudflared. Fine for testing.

### B. Named tunnel (stable URL — recommended)

1. Create a free Cloudflare account  
2. `cloudflared tunnel login`  
3. `cloudflared tunnel create expense-tracker`  
4. Route a hostname (your domain or a Cloudflare-managed name) to `http://localhost:5000`  
5. Set `CLIENT_URL` to that permanent `https://…` URL  
6. Run the tunnel as a Windows service so it starts with the PC  

Official guide: [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

### Why Tunnel (not port-forward)?

- Works from any network  
- HTTPS without managing certificates  
- No open router ports  
- Works behind many ISP “CGNAT” setups  

---

## Keep the site online

| Requirement | Why |
| --- | --- |
| Laptop powered on | Host is this machine |
| Sleep / hibernate off | Sleep stops Node + Mongo + Tunnel |
| MongoDB service running | Database |
| `npm start` (or Windows service) | API + website |
| `cloudflared` running | Public access |
| Backups of Mongo data | Your only storage |

**Backup tip:** periodically copy your MongoDB `dbPath` folder (see MongoDB config / `mongod.cfg`) to an external drive.

---

## Environment reference

### `server/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `5000`) |
| `MONGODB_URI` | Local Mongo connection string |
| `JWT_SECRET` | Sign auth tokens (use a long random value) |
| `CLIENT_URL` | Public site URL (localhost or Tunnel HTTPS URL) |
| `GOOGLE_CLIENT_ID` | Optional Google login |
| `NODE_ENV` | `production` when hosting |
| `USE_MEMORY_DB` | `1` = temporary in-memory DB (dev only, **no disk**) |

### `client/.env` / `.env.production`

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Dev: `http://localhost:5000/api` · Prod host: `/api` |
| `VITE_GOOGLE_CLIENT_ID` | Same Google client id as server (optional) |

---

## Google sign-in (optional)

1. Google Cloud Console → OAuth Web client  
2. Authorized JavaScript origins: `http://localhost:5000` and your Tunnel `https://…` URL  
3. Set `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`  
4. Rebuild client (`npm run build`) after changing Vite env  

---

## Scripts (repo root)

| Command | What it does |
| --- | --- |
| `npm run install:all` | Install server + client deps |
| `npm run build` | Build React → `client/dist` |
| `npm start` | Start Express (API + static UI if built) |
| `npm run host` | Build then start |
| `npm run dev:server` | API with nodemon |
| `npm run dev:client` | Vite dev server |

---

## Security notes (home hosting)

- Never expose MongoDB port (`27017`) to the internet — only Node should talk to it locally  
- Use a strong `JWT_SECRET`  
- Prefer Cloudflare Tunnel over opening ports on your router  
- Keep Windows updated; don’t run unknown tools alongside the server  

---

