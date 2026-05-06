# AGENTS.md - Vantage Hosted MCP Server

## Build/Lint/Test Commands
- `npm run dev` - Start development server with Wrangler DEV config
- `npm run format` - Format code using Biome
- `npm run lint:fix` - Lint and auto-fix issues with Biome  
- `npm run type-check` - Run TypeScript type checking
- `npm run cf-typegen` - Generate Cloudflare Worker types
- `npm run inspect` - Launch MCP inspector tool

## Code Style Guidelines
- **Formatting**: Biome with 4-space indentation, 100 character line width
- **TypeScript**: Strict mode enabled, ES2021 target, bundler module resolution
- **Imports**: Use ES modules, organize imports automatically via Biome
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use try/catch blocks, throw descriptive Error objects
- **Async**: Prefer async/await over Promises, handle rejections properly
- **Types**: Avoid explicit `any`, use proper TypeScript types and interfaces
- **Architecture**: Hono framework for HTTP routing, Cloudflare Workers runtime
- **Files**: Separate concerns (auth.ts for OAuth, homepage.ts for UI, index.ts for MCP tools)

## Project Structure
This is a Cloudflare Workers project using Hono framework for a Vantage MCP server with OAuth authentication. Main dependencies: Hono, MCP SDK, OAuth4WebAPI, Axios, Zod for validation.

## Cursor Cloud specific instructions

### Services
- **Wrangler dev server** (`npm run dev`): HTTP mode on port 8787. Emulates Cloudflare Workers locally with KV and Durable Objects. OAuth is stubbed with dummy values in `wrangler-DEV.jsonc`.
- **Local stdio mode** (`npm run local`): Requires `VANTAGE_TOKEN` env var. Useful for testing MCP protocol interactions directly via stdin/stdout.

### Running the dev server
- Run `npm run cf-typegen` before `npm run type-check` if `worker-configuration.d.ts` is missing or stale (e.g. after changing wrangler config). The generated types are git-tracked but may drift.
- `npm run dev` starts Wrangler on port 8787. OAuth/Auth0 vars are set to `"local-dummy"` in `wrangler-DEV.jsonc`; set `VANTAGE_MCP_TOKEN` in that file to bypass OAuth for local testing.
- The `/sse` endpoint requires a valid token; without `VANTAGE_MCP_TOKEN` configured, requests return 401.

### Testing
- `npm test -- --run` runs all 399 Vitest tests (unit tests with mocks, no network needed).
- Pre-commit hook runs `npm run check:lint:all -- --write` (Biome check with auto-fix).

### Gotchas
- The project uses `npm` (lockfile is `package-lock.json`); do not use pnpm/yarn.
- Husky git hooks are installed via the `prepare` script during `npm install`.
- `biome.json` sets `indentWidth: 2` (not 4 as stated in the Code Style section above); follow the actual Biome config.