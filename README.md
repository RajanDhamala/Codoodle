# Game

Full-stack game application organized as a monorepo.

## Structure

```txt
.
├── apps/
│   ├── api/    # Express, Socket.IO, Prisma backend
│   └── web/    # Vite React frontend
├── .github/    # CI workflows
└── docker-compose.yml
```

## Local Development

Install dependencies inside each app:

```sh
cd apps/api && pnpm install
cd ../web && pnpm install
```

Run the backend:

```sh
cd apps/api
pnpm dev
```

Run the frontend:

```sh
cd apps/web
pnpm dev
```

## Docker

```sh
docker-compose up --build
```

The frontend is served on `http://localhost:5173` and proxies API/WebSocket traffic to the backend service.

## GitHub Secrets

Create these repository secrets in GitHub Actions before relying on the Docker Compose workflow:

```txt
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
JWT_SECRET
CLIENT_URL
```

For local Docker runs, copy `.env.example` to `.env` and replace the placeholder values.
