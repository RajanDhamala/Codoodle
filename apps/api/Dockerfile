FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.25.0

RUN addgroup -g 1001 -S prod \
  && adduser -S -u 1001 -G prod test

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY --chown=test:prod . .

RUN chown -R test:prod /app

USER test

EXPOSE 3000

CMD ["pnpm", "start"]
