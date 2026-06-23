# Backend Prisma Setup

This backend uses Prisma 7 with pnpm, PostgreSQL, and a custom generated Prisma client path.

## Install Dependencies

Install the Prisma runtime dependencies:

```sh
pnpm add @prisma/client @prisma/adapter-pg @prisma/client-runtime-utils pg dotenv
```

Install the Prisma CLI as a dev dependency:

```sh
pnpm add -D prisma @types/pg
```

Why `@prisma/client-runtime-utils` is installed directly:

The schema generates the Prisma client into `generated/prisma` instead of only using the package from `node_modules/@prisma/client`. That generated client imports `@prisma/client-runtime-utils` at runtime, so the app root must have this package available. Without it, server startup can fail with:

```txt
Error: Cannot find module '@prisma/client-runtime-utils'
```

## Environment

Create `.env` with the database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
CLIENT_SECRET="your-jwt-secret"
```

Prisma 7 reads the datasource URL from `prisma.config.ts`, not from `schema.prisma`.

## Prisma Schema

The schema uses a custom output folder:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

After changing `prisma/schema.prisma`, regenerate the client:

```sh
pnpm prisma generate
```

Create or apply migrations during development:

```sh
pnpm prisma migrate dev --name init
```

## Export Prisma Client

The app exports one shared Prisma client from `Utils/Prisma.js`:

```js
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
```

Use that shared client in controllers:

```js
import prisma from "../Utils/Prisma.js";

const user = await prisma.user.findUnique({
  where: { email },
});
```

## Quick Checks

Check that Prisma imports correctly:

```sh
node -e 'import("./Utils/Prisma.js").then(() => console.log("prisma import ok"))'
```

Check that the database query path works:

```sh
node -e 'import prisma from "./Utils/Prisma.js"; const count = await prisma.user.count(); console.log("user count ok:", count); await prisma.$disconnect();'
```

Start the server:

```sh
node index.js
```
