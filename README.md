# HASH Backend & Infrastructure

Production-ready backend for the HASH Bitcoin wallet, including supporting Docker services.

## Features

- **Secure Express API** with Helmet, global rate limiting, strict validation, and JWT auth.
- **Bitcoin Core integration** via JSON-RPC client with transaction logging.
- **PostgreSQL persistence** with migration tooling.
- **Automated CI/CD** using GitHub Actions for linting, building, testing, and container publishing.
- **Docker Compose orchestration** for Postgres, Bitcoin Core (testnet), and the API service.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker & Docker Compose (for containerized workflows)

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in `backend/` based on `.env.example`.

| Variable | Description |
| --- | --- |
| `PORT` | Port the API listens on. |
| `DB_HOST` | PostgreSQL host name. |
| `DB_USER` | PostgreSQL username. |
| `DB_PASS` | PostgreSQL password. |
| `DB_NAME` | PostgreSQL database name. |
| `DB_PORT` | PostgreSQL port. |
| `BTC_RPC_HOST` | Bitcoin Core RPC host. |
| `BTC_RPC_PORT` | Bitcoin Core RPC port. |
| `BTC_RPC_USER` | Bitcoin Core RPC username. |
| `BTC_RPC_PASS` | Bitcoin Core RPC password. |
| `JWT_SECRET` | Secret used to sign authentication tokens. |
| `MAX_WITHDRAW_BTC` | Maximum BTC an account may withdraw per transaction. |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window (milliseconds). |
| `RATE_LIMIT_MAX` | Max requests per IP within the limiter window. |
| `ENFORCE_HTTPS` | Set to `true` in production to require HTTPS behind a proxy. |

### Development Scripts

All commands run from the `backend/` directory:

```bash
npm run lint   # ESLint checks
npm run build  # TypeScript compile
npm run test   # Unit tests via the custom harness
npm run dev    # Hot-reload development server
```

### Database Migrations

```bash
npm run migrate
```

Ensure your Postgres connection variables are configured before running migrations.

### Docker Workflow

To build and run the complete stack locally:

```bash
docker-compose up --build
```

This starts Postgres, Bitcoin Core (testnet), and the API service. The API is available at `http://localhost:3000`.

### CI/CD

GitHub Actions automatically:

1. Install dependencies.
2. Run `npm run lint`, `npm run build`, and `npm run test`.
3. When changes are pushed to `main`, build and publish a Docker image to GitHub Container Registry (`ghcr.io/<owner>/<repo>:latest`).

### Security Hardening Highlights

- Helmet-configured HTTP headers.
- Global in-memory rate limiting middleware.
- Schema-driven validation for every endpoint.
- Input sanitization prior to database usage.
- HTTPS enforcement when deployed behind a reverse proxy.
- Hot wallet withdrawal limits enforced per transaction.

## Testing

A lightweight TypeScript harness exercises critical controllers and middleware. Run all tests with:

```bash
npm run test
```

The suite prints a summary of passing assertions to stdout.
