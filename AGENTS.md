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