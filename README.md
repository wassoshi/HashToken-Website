# HashToken Website

HashToken (HTK) is an informational and analytical website for an early
Ethereum token with a self-limiting proof-of-work minting model.

The site combines live contract data, permanent mint history, difficulty
analytics, market data, and an educational hash calculator.

## Features

- Live HashToken contract state, including supply, difficulty, and expected
  attempts.
- Permanent mint-event history stored in PostgreSQL.
- Recent-mint capture that runs before the slower historical backfill.
- Duplicate-safe, checkpointed synchronization with Ethereum.
- Miner statistics and historical activity.
- Monthly mint-activity timeline with explicit historical coverage reporting.
- Difficulty and expected-attempts forecasts.
- Live price, liquidity, volume, and market-cap data from DexScreener.
- Client-side Keccak-256 hash calculator for educational use.
- Visible synchronization status when history is catching up or a provider
  fails.

## Technology

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui,
  TanStack Query, and Wouter
- **Backend:** Node.js, Express, and TypeScript
- **Blockchain:** ethers.js v6 with multiple public Ethereum RPC providers
- **Database:** PostgreSQL through Drizzle ORM
- **Build:** Vite for the client and esbuild for the server

## Project structure

```text
client/                 React application and UI components
server/                 Express routes, Ethereum integration, and indexing
shared/                 Shared database schema and TypeScript types
attached_assets/        Images and historical reference material
storage-data.json       Preserved legacy history imported on startup
```

Important server files:

- `server/ethereum.ts` — contract reads, RPC failover, and mint-log fetching
- `server/mint-indexer.ts` — recent capture and checkpointed history sync
- `server/storage.ts` — PostgreSQL storage interface
- `server/db.ts` — database connection and safe startup schema provisioning
- `server/import-json-history.ts` — one-time/idempotent import of preserved
  JSON history
- `server/routes.ts` — API endpoints
- `server/index.ts` — application startup and periodic synchronization

## Run locally

### Requirements

- Node.js 22 or newer
- npm
- A PostgreSQL connection string in either `DATABASE_URL` or
  `NEON_DATABASE_URL`

### Install and start

```bash
npm install
npm run dev
```

The development server runs on port `5000`.

The server creates the required tables if they do not already exist.

## Validate and build

```bash
npm run check
npm run build
npm start
```

- `npm run check` runs the TypeScript compiler without emitting files.
- `npm run build` creates the client bundle in `dist/public` and the server
  bundle in `dist/index.js`.
- `npm start` runs the production bundle on port `5000`.

## Data and synchronization

PostgreSQL is the source of truth for mint history. The database uses a unique
transaction hash so repeated syncs do not create duplicate records.

The indexer maintains independent progress for:

1. **Recent blocks** — prioritizes newly mined mints so the website stays
   current.
2. **Forward backfill** — fills the gap from the existing stored checkpoint.
3. **Older history** — works backward from the earliest stored mint toward the
   contract deployment block.

Each successful block range is committed before its checkpoint advances.
Provider failures are recorded in the sync-status endpoint rather than
silently moving the checkpoint forward.

`storage-data.json` is retained as a preserved legacy snapshot. On startup,
its records are imported idempotently into PostgreSQL. It is not the ongoing
live store.

Free Ethereum RPC providers have practical limits. The indexer therefore uses
small log ranges, avoids batched requests, and captures recent mint records
without requiring expensive per-transaction lookups.

## API overview

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/contract/state` | GET | Current contract state and calculated metrics |
| `/api/contract/mint-events` | GET | Recent stored mint events |
| `/api/contract/history` | GET | Mint events within a date range |
| `/api/contract/miners` | GET | Aggregated miner counts |
| `/api/contract/timeline` | GET | Monthly indexed mint counts |
| `/api/contract/forecast` | GET | Future difficulty and expected-attempts forecast |
| `/api/contract/price` | GET | DexScreener market data |
| `/api/contract/sync-status` | GET | Indexer checkpoints, counts, and errors |

Synchronization is intentionally not exposed as a public HTTP action. It runs
on application startup and hourly in the server process, preventing anonymous
visitors from triggering expensive Ethereum RPC scans.

## Deployment notes

The application is suitable for a Node.js host with:

- A persistent PostgreSQL database
- A long-running process
- Outbound HTTPS access to Ethereum RPC providers and DexScreener

For a production build, run `npm run build` followed by `npm start`.

Do not rely on the local filesystem for new mint history. The database is what
preserves records across restarts and redeployments; the JSON file is only a
migration snapshot.

### Self-host on a VPS

The included Docker Compose stack runs the application, PostgreSQL, and Caddy.
Caddy obtains and renews the HTTPS certificate automatically.
The bootstrap script also provisions 2 GB of swap and bounded Docker logs, so
the stack can run on a small 1 GB RAM / 20 GB disk VPS.

1. Install Docker Engine and the Docker Compose plugin on an Ubuntu VPS.
2. Clone this repository and copy `.env.example` to `.env`.
3. Set `DOMAIN` to the real domain and generate `POSTGRES_PASSWORD` with
   `openssl rand -hex 32`.
4. Point the domain's `A` record to the VPS IPv4 address.
5. Run `docker compose up -d --build`.
6. Check `docker compose ps` and `docker compose logs --tail=100 app caddy`.

On a fresh Ubuntu VPS, steps 1, 2, 3, and 5 can be performed from the cloned
repository with `sudo scripts/bootstrap-ubuntu.sh your-domain.com`.

Only ports 80 and 443 are published. PostgreSQL and the Node.js service remain
inside the private Docker network. Run `scripts/backup-database.sh` from the
repository directory to create a PostgreSQL backup before upgrades.

## License

MIT
