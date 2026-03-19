<p align="center">
  <img src="https://img.shields.io/badge/MCP-Server-blueviolet?style=for-the-badge" alt="MCP Server" />
  <img src="https://img.shields.io/badge/Google%20Drive-API-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

# Drive MCP Server

> An MCP server that gives AI assistants full access to Google Drive — list, read, upload, search, delete files, transcribe meeting recordings, and fetch npm package docs.

Built with **Clean Architecture**, strict TypeScript, and the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk).

---

## Table of Contents

- [Features](#-features)
- [Available Tools](#-available-tools)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Scripts](#-scripts)
- [Tech Stack](#-tech-stack)
- [License](#-license)

---

## Features

| Category | Capability |
|---|---|
| **Drive Operations** | List, read, upload, search, and delete files via Google Drive API |
| **Transcription** | Transcribe meeting recordings locally using [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — private and cost-effective |
| **Audio Conversion** | Auto-convert unsupported formats (MP4, MKV, etc.) to MP3 via FFmpeg |
| **Package Docs** | Fetch npm package README docs by resolving their GitHub repos |
| **Auth** | OAuth 2.0 with automatic token refresh and persistence |

---

## Available Tools

<details>
<summary><strong>Google Drive</strong></summary>

| Tool | Description |
|---|---|
| `drive_list_files` | List files, optionally filtered by folder ID, MIME type, and page size |
| `drive_read_file` | Read file content by file ID |
| `drive_upload_file` | Upload a file (base64-encoded content) |
| `drive_search_files` | Search files using Drive query syntax (e.g. `name contains 'report'`) |
| `drive_delete_file` | Permanently delete a file by file ID |

</details>

<details>
<summary><strong>Recording & Transcription</strong></summary>

| Tool | Description |
|---|---|
| `drive_list_recordings` | List meeting recording files (audio/video), optionally filtered by folder |
| `drive_transcribe_recording` | Transcribe a Drive recording to plain text using local faster-whisper |
| `audio_prepare_file` | Convert unsupported audio/video formats to MP3 for transcription |

</details>

<details>
<summary><strong>Package Documentation</strong></summary>

| Tool | Description |
|---|---|
| `npm_get_package_docs` | Fetch the latest README for an npm package via its GitHub repo |

</details>

---

## Architecture

The project follows **Clean Architecture** with three concentric layers:

```
src/
├── server.ts                 # Entry point — wires everything together
├── tools/                    # Layer 1: MCP Tool Handlers (presentation)
│   └── registry/             #   Tool registration & dispatch
├── services/                 # Layer 2: Application logic (use cases)
├── drive/                    # Layer 3: Infrastructure (Google Drive adapter)
├── auth/                     # OAuth 2.0 flow & token persistence
├── speech/                   # Faster-whisper transcription engine
├── audio/                    # FFmpeg audio conversion
├── models/                   # Domain models & interfaces
├── interfaces/               # Abstractions (contracts)
├── errors/                   # Domain error classes
└── schemas/                  # Zod schemas (single source of truth for I/O)
```

<details>
<summary><strong>Layer rules</strong></summary>

- **Tools** only call **Services** — never the repository directly
- **Services** contain business logic and call repositories via interfaces
- **Repositories** are the only modules that touch external APIs (`googleapis`, Python, etc.)
- **Schemas** are imported by tools for input validation
- **Models** and **Interfaces** have zero dependencies on other layers
- No layer imports from a layer above it

</details>

<details>
<summary><strong>Design patterns used</strong></summary>

| Pattern | Where | Purpose |
|---|---|---|
| Command | `tools/` | Each MCP tool is a self-contained command with schema + handler |
| Repository | `drive/`, `speech/` | Isolates all external API calls behind interfaces |
| Adapter / Mapper | `drive/drive.mapper.ts` | Translates raw API responses into clean domain types |
| Factory | `drive/drive.client.ts` | Creates an authenticated Drive client once at startup |
| Dependency Injection | Everywhere | Constructor injection — no global singletons |

</details>

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | 18+ | ESM support required |
| **Python** | 3.8+ | Only for transcription features |
| **faster-whisper** | latest | `pip install faster-whisper` |
| **FFmpeg** | latest | Only for audio format conversion |
| **Google Cloud Project** | — | OAuth 2.0 credentials with Drive API enabled |

### Installation

```bash
# Clone the repository
git clone https://github.com/PR001-git/pdesk-drive-mcp-server.git
cd pdesk-drive-mcp-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Google OAuth credentials (see Configuration below)

# Build the project
npm run build

# Start the server
npm start
```

---

## Configuration

Create a `.env` file in the project root:

```env
# Required — Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional — Google Cloud Storage bucket (for large-file transcription)
GOOGLE_CLOUD_BUCKET=your-bucket-name

# Optional — Explicit Python path (auto-detected if omitted)
PYTHON_PATH=/usr/bin/python3
```

<details>
<summary><strong>Setting up Google OAuth credentials</strong></summary>

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add `http://localhost:3000/oauth2callback` as an authorized redirect URI
7. Copy the **Client ID** and **Client Secret** into your `.env` file
8. On first run, the server will open a browser window for OAuth consent

</details>

---

## Usage

### With Claude Desktop

Add this to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "drive": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/drive-mcp-server",
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### With MCP Inspector

```bash
npm run inspect
```

Opens the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) UI for interactive testing and debugging of all tools.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run in development mode with `ts-node` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting files |
| `npm run test:client` | Run the test client |
| `npm run inspect` | Launch MCP Inspector for debugging |

---

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MCP%20SDK-blueviolet?style=flat-square" alt="MCP SDK" />
  <img src="https://img.shields.io/badge/Google%20APIs-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google APIs" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white" alt="FFmpeg" />
</p>

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built by <a href="https://github.com/PR001-git">Pedro Reis</a>
</p>
