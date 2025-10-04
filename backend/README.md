# Backend Environment Configuration

The backend expects environment variables to be provided via an `.env` file. Two templates are available depending on the workflow you are using.

## Local development with `npm run dev`

1. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Update any secrets (for example `JWT_SECRET`) before starting the server.
3. Run the development server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

The `.env.example` file defaults to `localhost` hosts so it works with services you run on your machine.

## Docker Compose workflow

1. Copy `.env.docker` to `.env` if you need to customise values locally, or allow Docker Compose to read the template directly.
2. Start the stack from the repository root:
   ```bash
   docker-compose up --build
   ```

The `.env.docker` template retains the container hostnames used inside the Compose network, so the API container can reach Postgres and Bitcoin services without additional configuration.

## Key API endpoints

The Hashpay backend exposes a versioned REST API under `/v1`. The most important routes are:

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/v1/balance` | Return BTC and USD wallet balances for the authenticated user. |
| `POST` | `/v1/btc/address` | Generate or return a Bitcoin deposit address. |
| `POST` | `/v1/btc/send` | Broadcast a Bitcoin payment after applying transfer fees. |
| `POST` | `/v1/usd/send` | Transfer internal USD balance between users with fees. |
| `POST` | `/v1/convert/quote` | Fetch a conversion quote at the cached BTC/USD rate. |
| `POST` | `/v1/convert/execute` | Execute a BTC ⇄ USD conversion atomically. |
| `GET` | `/v1/transactions` | List BTC and USD transactions with pagination. |
| `POST` | `/v1/webhook/btc` | Internal webhook used by the Bitcoin watcher to update deposit confirmations. |

The OpenAPI document for all endpoints is available at `/docs/openapi.json` once the server is running.

## Git ignore rules

The repository `.gitignore` prevents committing runtime environment files (`backend/.env`). If you create a customised copy of `.env.docker`, rename it (for example `backend/.env.docker.local`) to keep it out of version control.
