FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

RUN addgroup -g 1001 -S prod && adduser -S -u 1001 -G prod test

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY --chown=test:prod . .
#COPY . .
#RUN chown -R test:prod /app

EXPOSE 8000

CMD ["pnpm", "start"]
