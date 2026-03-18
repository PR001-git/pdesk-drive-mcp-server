# CLAUDE.md — Drive MCP Server

## Project Overview

A **Model Context Protocol (MCP) server** that exposes Google Drive operations as MCP tools. AI assistants connect to this server to list, read, upload, search, and manage files on Google Drive via OAuth 2.0.

**Stack:** TypeScript (strict ESM) · MCP SDK · Google APIs · Zod · Node.js

---

## Architecture

This project follows **Clean Architecture** organized into three concentric layers:

```
src/
├── server.ts                    # Entry point — wires everything together
│
├── tools/                       # Layer 1: MCP Tool Handlers (presentation)
│   ├── index.ts                 #   Barrel — registers all tools on the MCP server
│   ├── list-files.tool.ts       #   One tool per file
│   ├── read-file.tool.ts
│   ├── upload-file.tool.ts
│   ├── search-files.tool.ts
│   └── delete-file.tool.ts
│
├── services/                    # Layer 2: Application logic (use cases)
│   └── drive.service.ts         #   One service class per file
│
├── drive/                       # Layer 3: Infrastructure (Google Drive adapter)
│   ├── drive.client.ts          #   Authenticated Drive client factory
│   ├── drive.repository.ts      #   All raw Drive API calls (implements IDriveRepository)
│   └── drive.mapper.ts          #   Maps Drive API responses → domain models
│
├── auth/                        # OAuth 2.0 flow
│   ├── oauth.client.ts          #   OAuth2 client setup
│   └── token.store.ts           #   Token persistence (implements ITokenStore)
│
├── models/                      # Domain models & interfaces — ONE per file
│   ├── drive-file.model.ts      #   DriveFile class/interface
│   ├── drive-folder.model.ts    #   DriveFolder class/interface
│   ├── upload-params.model.ts   #   UploadParams interface
│   ├── list-params.model.ts     #   ListFilesParams interface
│   ├── search-params.model.ts   #   SearchParams interface
│   └── tool-definition.model.ts #   ToolDefinition interface (MCP tool contract)
│
├── interfaces/                  # Abstractions (contracts) — ONE per file
│   ├── drive-repository.interface.ts  #   IDriveRepository
│   ├── drive-service.interface.ts     #   IDriveService
│   └── token-store.interface.ts       #   ITokenStore
│
├── errors/                      # Domain error classes — ONE per file
│   ├── drive-auth.error.ts      #   DriveAuthError
│   ├── file-not-found.error.ts  #   FileNotFoundError
│   └── upload.error.ts          #   UploadError
│
└── schemas/                     # Zod schemas — single source of truth for I/O
    ├── list-files.schema.ts     #   One schema file per tool input
    ├── read-file.schema.ts
    ├── upload-file.schema.ts
    ├── search-files.schema.ts
    └── delete-file.schema.ts
```

### Layer Rules

- **Tools** (`tools/`) only call **Services**, never the Drive repository directly.
- **Services** (`services/`) contain business logic; they call the Repository via its interface.
- **Repository** (`drive/drive.repository.ts`) is the only place that calls `googleapis`.
- **Schemas** (`schemas/`) are imported by tools (input validation) and mappers (response shaping).
- **Models** (`models/`) and **Interfaces** (`interfaces/`) have no dependencies on other src layers.
- No layer imports from a layer above it.

---

## Design Patterns

### Command Pattern — MCP Tools
Each MCP tool is a self-contained command with an input schema and a handler. Define every tool as a standalone module that exports a `ToolDefinition` interface:

```typescript
// tools/list-files.ts
import type { ToolDefinition } from '../types/index.js';
import { ListFilesInputSchema } from '../schemas/tool-inputs.js';

export const listFilesTool: ToolDefinition = {
  name: 'drive_list_files',
  description: 'List files in Google Drive, optionally filtered by folder or MIME type.',
  inputSchema: ListFilesInputSchema,
  handler: async (input) => {
    const parsed = ListFilesInputSchema.parse(input);
    // call service...
  },
};
```

Register all tools in `tools/index.ts` — `server.ts` imports only from there.

### Repository Pattern — Drive API Isolation
All `googleapis` calls live exclusively in `drive/drive.repository.ts`. No other module touches the Drive SDK directly. The repository implements `IDriveRepository` (defined in `interfaces/`), which is what the service depends on — never the concrete class.

```typescript
// interfaces/drive-repository.interface.ts
export interface IDriveRepository {
  listFiles(params: ListFilesParams): Promise<DriveFile[]>;
  getFileContent(fileId: string): Promise<Buffer>;
  uploadFile(params: UploadParams): Promise<DriveFile>;
}

// drive/drive.repository.ts
export class DriveRepository implements IDriveRepository {
  constructor(private readonly client: drive_v3.Drive) {}
  // ... only place googleapis is called
}
```

### Adapter / Mapper Pattern — API Response Translation
`drive/mappers.ts` converts raw `googleapis` response objects into clean domain types. Consumers of the repository never see raw API shapes.

### Factory Pattern — Authenticated Client
`drive/client.ts` exports a single async factory function `createDriveClient(tokenStore)` that handles authentication and returns a ready-to-use Drive client. Called once at startup; the result is injected into the repository.

### Dependency Injection (Constructor Injection)
Services and repositories receive dependencies via constructor parameters. No global singletons except for the single Drive client instance created at startup.

```typescript
export class DriveService {
  constructor(private readonly repo: DriveRepository) {}
}
```

---

## Clean Code Guidelines




### File Organisation — One Concept Per File

**This is a hard rule.** Each file exports exactly one primary concept (class, interface, or type alias). No exceptions.

| What | Folder | File suffix |
|---|---|---|
| Domain model (data shape) | `models/` | `.model.ts` |
| Contract / abstraction | `interfaces/` | `.interface.ts` |
| Domain error class | `errors/` | `.error.ts` |
| Zod validation schema | `schemas/` | `.schema.ts` |
| MCP tool handler | `tools/` | `.tool.ts` |
| Service class | `services/` | `.service.ts` |

Examples:

```
models/drive-file.model.ts        → exports DriveFile
interfaces/drive-repository.interface.ts → exports IDriveRepository
errors/file-not-found.error.ts    → exports FileNotFoundError
schemas/list-files.schema.ts      → exports ListFilesInputSchema (+ inferred type)
```

**Barrel files** (`index.ts`) are allowed only inside each folder to re-export — they must contain zero logic.

```typescript
// models/index.ts  ← barrel, re-exports only
export type { DriveFile } from './drive-file.model.js';
export type { DriveFolder } from './drive-folder.model.js';
export type { UploadParams } from './upload-params.model.js';
```

### Naming
- **Files:** `kebab-case.ts`
- **Classes/Interfaces/Types:** `PascalCase`
- **Functions/variables:** `camelCase`
- **Constants:** `SCREAMING_SNAKE_CASE` (only for true module-level constants)
- **MCP tool names:** `snake_case` prefixed with `drive_` (e.g. `drive_list_files`)
- Name functions as verbs (`listFiles`, `uploadFile`), types as nouns (`DriveFile`, `UploadParams`)

### Functions
- Single responsibility — one function does one thing.
- Maximum ~20 lines; extract helpers if longer.
- Prefer `async/await` over raw Promise chains.
- No side effects in pure business logic functions.

### Types & Validation
- **All MCP tool inputs** must be validated with a Zod schema before use.
- **Never use `any`** — use `unknown` and narrow, or define a proper type.
- Use `interface` for object shapes (models, params, contracts) — they are extendable and show up clearly in IDE tooltips.
- Use `type` only for unions, intersections, or aliasing primitives.
- Use `exactOptionalPropertyTypes` — don't pass `undefined` where a property is optional.
- Derive TypeScript types from Zod schemas with `z.infer<>` — never duplicate a type you already have a schema for.

```typescript
// models/drive-file.model.ts
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedAt: Date;
  parents: string[];
}

// schemas/list-files.schema.ts
import { z } from 'zod';

export const ListFilesInputSchema = z.object({
  folderId: z.string().optional(),
  mimeType: z.string().optional(),
  pageSize: z.number().int().min(1).max(1000).default(50),
});

export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;
```

### Error Handling
- Throw only typed errors: create domain-specific error classes (e.g. `DriveAuthError`, `FileNotFoundError`).
- Catch errors at the tool handler boundary — never let raw `googleapis` errors surface as MCP responses.
- Always return meaningful error messages to the MCP client with the correct `isError: true` flag.

```typescript
// tools/read-file.ts
try {
  const content = await service.getFileContent(input.fileId);
  return { content: [{ type: 'text', text: content }] };
} catch (err) {
  const message = err instanceof FileNotFoundError
    ? `File ${input.fileId} not found.`
    : 'An unexpected error occurred.';
  return { content: [{ type: 'text', text: message }], isError: true };
}
```

### Modules & Imports
- Use **named exports** everywhere. Default exports are forbidden.
- Always include `.js` extension in imports (required for Node ESM).
- Group imports: external packages → internal absolute → relative. Separate with blank lines.
- Use `import type` for type-only imports (`verbatimModuleSyntax` enforces this).

### Comments
- No comments that restate what the code already says.
- Comment the **why**, not the **what**.
- JSDoc only on public API surfaces (exported functions/classes).

---

## MCP Tool Conventions

Every tool must follow this contract:

| Field | Rule |
|---|---|
| `name` | `drive_<verb>_<noun>` in `snake_case` |
| `description` | One sentence. Start with a verb. Mention what it returns. |
| `inputSchema` | Defined with Zod; exported from `schemas/tool-inputs.ts` |
| `handler` | Validates input → calls service → formats MCP `CallToolResult` |

Return content as `{ type: 'text', text: '...' }` items. For file content, serialize to base64 for binary, plain UTF-8 for text. Never return raw API response objects.

---

## Authentication Flow

1. On startup, `auth/token-store.ts` checks for a stored OAuth token.
2. If absent, the server initiates the OAuth flow and logs a browser URL to stdout.
3. After consent, tokens are persisted by `token-store.ts`.
4. The authenticated client is created once via `drive/client.ts` and injected throughout.

Token files must **never** be committed. Add `tokens.json` and `.credentials/` to `.gitignore`.

---

## TypeScript Rules

- `strict: true` is non-negotiable — never disable individual strict checks.
- `noUncheckedIndexedAccess` is enabled — always guard array/object index access.
- `isolatedModules: true` — no `const enum`, no namespace merging across files.
- Run `npm run typecheck` before committing.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run in development with `ts-node` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | Type-check without emitting |

---

## What to Avoid

- Do not import `googleapis` outside of `drive/repository.ts`.
- Do not catch errors silently (empty `catch` blocks).
- Do not use `process.exit()` — let the MCP SDK handle server lifecycle.
- Do not log sensitive data (tokens, file contents) to stdout/stderr.
- Do not add MCP tools that mix concerns (one tool = one Drive operation).

## TOP Rule: Explain Decisions and Trade-offs

When implementing any solution, you must:

1. Explain what you are doing  
Clearly describe the approach you are taking and how it works.

2. Outline alternative approaches  
Present other viable ways to solve the same problem, even if briefly.

3. Justify your choice  
Explain why the selected approach is preferred over the alternatives, considering factors such as simplicity, scalability, maintainability, performance, and alignment with the project architecture.
