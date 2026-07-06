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



