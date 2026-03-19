# Migrate transcription backend from `openai-whisper` to `faster-whisper`

## Context

The project is a TypeScript MCP server (strict ESM, Node.js). The speech layer lives in two files:

**`src/speech/whisper.resolver.ts`**
Resolves the `whisper` CLI binary path at startup (checks env var, PATH, Windows Python Scripts dirs).

**`src/speech/speech.repository.ts`** — `WhisperRepository implements ISpeechRepository`
- Writes the audio Buffer to a temp file
- Calls the `whisper` CLI via `execFile` with flags:
  `--language`, `--output_format txt`, `--output_dir`, `--model tiny`, `--device cpu`
- Reads the `.txt` output file Whisper writes to `outputDir`
- Reports time-based progress every 5 s via `ProgressCallback`
- 30-minute process timeout
- Throws `TranscriptionFailedError` on all failures

`ISpeechRepository` (unchanged):

```ts
export interface ISpeechRepository {
  transcribe(params: TranscribeParams): Promise<string>;
}
```

`TranscribeParams` (unchanged):

```ts
export interface TranscribeParams {
  audio: Buffer;
  mimeType: string;
  languageCode: string;         // BCP-47 e.g. "en-US" — strip to "en" before use
  onProgress?: ProgressCallback;
}

export type ProgressCallback = (progress: number, total: number, message: string) => void;
```

`server.ts` wires everything:

```ts
const whisperPath = await resolveWhisperPath();
const speechRepository = new WhisperRepository(whisperPath);
```

---

## What to do

`faster-whisper` is a Python **library** with no official CLI binary.
The cleanest approach is:

### 1. Create `src/speech/faster_whisper_runner.py`

A minimal Python script that:
- Accepts positional CLI args: `<model> <device> <language> <audio_file_path>`
- Runs `faster-whisper` and **prints the full transcript to stdout** (concatenated segment texts)
- Exits non-zero on error, prints error to stderr

### 2. Rewrite `src/speech/whisper.resolver.ts` → `resolvePythonPath()`

- Resolves the Python interpreter (`python`, `python3`, `py` on PATH; Windows fallbacks)
- Verifies `faster_whisper` is importable: `python -c "import faster_whisper"`
- Throws `WhisperNotInstalledError` with message:
  `"faster-whisper not found — run: pip install faster-whisper"`
- Returns `{ pythonPath: string, runnerPath: string }` where `runnerPath` is the absolute path to `faster_whisper_runner.py`

### 3. Rewrite `src/speech/speech.repository.ts` → `FasterWhisperRepository implements ISpeechRepository`

- Constructor: `constructor(private readonly pythonPath: string, private readonly runnerPath: string)`
- Write audio to temp file (same pattern as before)
- Spawn: `python faster_whisper_runner.py tiny cpu <language> <inputPath>`
- Capture **stdout** directly as the transcript — no output file needed, no `outputDir`
- Keep the same progress reporting (5 s interval timer) and 30-minute timeout
- Keep the same error classification (spawn error, timeout, non-zero exit)
- Clean up temp input file in `finally`

### 4. Update `server.ts`

```ts
const { pythonPath, runnerPath } = await resolvePythonPath();
const speechRepository = new FasterWhisperRepository(pythonPath, runnerPath);
```

---

## Constraints

- Follow the project's Clean Architecture rules exactly: one concept per file, named exports only, `.js` extensions in imports, `import type` for type-only imports, no `any`.
- The `ISpeechRepository` interface and `TranscribeParams` model must not change.
- `MIME_TO_EXT`, `toWhisperLanguage`, `fileExtensionForMime` helpers can be carried over unchanged.
- The error message for missing binary must update to reference `pip install faster-whisper`.
- Do not add new npm dependencies — only the Python side changes.
- Run `npm run typecheck` after making changes and fix any errors.
