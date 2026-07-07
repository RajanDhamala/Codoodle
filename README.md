# Coloodle

Coloodle is a real-time group drawing game built with React, Express, and Socket.IO.

Players create or join a private room. When the host starts the game, the server picks a random word and secretly chooses one imposter. Normal players see the full word and category. The imposter only sees the category hint, then has to draw and pretend they know the word without getting caught.

The game state is stored in memory inside the Node/Express process. There is no database required for active rooms, rounds, strokes, votes, or results. Restarting the backend clears the current rooms.

## Gameplay

1. A host creates a room and shares the room code.
2. Other players join from the lobby.
3. The host starts the game after enough players connect.
4. The backend randomly selects a word and one imposter.
5. Artists receive the word and category.
6. The imposter receives only the category hint.
7. Players take turns drawing limited strokes on the shared canvas.
8. After the configured number of drawing cycles, voting starts.
9. Everyone votes for who they think the imposter is.
10. Results reveal the word, the imposter, and whether the artists caught them.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Realtime: Socket.IO client and server
- Backend: Node.js, Express
- State: in-memory Maps on the backend for rooms, users, strokes, turns, and votes
- Client profile: local browser storage for the guest username and avatar

## Project Structure

```txt
.
├── apps/
│   ├── api/    # Express + Socket.IO backend
│   └── web/    # Vite + React frontend
└── package.json
```

## Local Development

Install dependencies for each app:

```sh
cd apps/api
pnpm install

cd ../web
pnpm install
```

Configure local environment files for the API and web app before running the project. 

Run the backend:

```sh
pnpm dev:api
```

Run the frontend in another terminal:

```sh
pnpm dev:web
```

Then open the Vite URL, usually:

```txt
http://localhost:5173
```

## Useful Commands

```sh
pnpm dev:api      # start the Express + Socket.IO server
pnpm dev:web      # start the Vite React app
pnpm build:web    # type-check and build the frontend
pnpm lint:web     # run frontend linting
```

## Notes

- Active game rooms are intentionally temporary.
- The backend stores gameplay state in memory, so it is simple and fast for the prototype.
