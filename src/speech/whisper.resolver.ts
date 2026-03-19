import { execFile } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { env, platform } from 'node:process';
import { promisify } from 'node:util';

import { WhisperNotInstalledError } from '../errors/whisper-not-installed.error.js';

const execFileAsync = promisify(execFile);

/**
 * Resolves the path to the Whisper CLI binary.
 *
 * Resolution order:
 *   1. WHISPER_PATH environment variable (explicit override)
 *   2. Bare "whisper" — works when already on PATH
 *   3. Known Python Scripts directories (Windows)
 *
 * Called once at startup so the server fails fast with a clear error
 * if Whisper is not installed, rather than failing on the first
 * transcription request.
 */
export async function resolveWhisperPath(): Promise<string> {
  const envPath = env['WHISPER_PATH'];

  if (envPath !== undefined && envPath !== '') {
    await assertWhisperWorks(envPath);
    return envPath;
  }

  if (await canRun('whisper')) {
    return 'whisper';
  }

  const discovered = await discoverFromPythonScripts();
  if (discovered !== undefined) {
    return discovered;
  }

  throw new WhisperNotInstalledError();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function canRun(binary: string): Promise<boolean> {
  try {
    await execFileAsync(binary, ['--help'], { timeout: 10_000 });
    return true;
  } catch (err: unknown) {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    // Binary missing vs binary exists but --help returned non-zero
    if (msg.includes('enoent') || msg.includes('spawn')) return false;
    return true;
  }
}

async function assertWhisperWorks(binary: string): Promise<void> {
  if (!(await canRun(binary))) {
    throw new WhisperNotInstalledError(
      `"${binary}" not found — ensure the whisper CLI is installed and on PATH.`
    );
  }
}

/**
 * Scans well-known Python install directories for the whisper executable.
 *
 * On Windows, pip installs scripts into a `Scripts/` folder under the
 * Python installation root. This folder is often not on PATH, especially
 * for Microsoft Store or standalone Python installs.
 *
 * Checked locations:
 *   - %LOCALAPPDATA%\Python\pythoncore-{version}\Scripts\whisper.exe
 *   - %LOCALAPPDATA%\Programs\Python\Python{version}\Scripts\whisper.exe
 *   - %APPDATA%\Python\Python{version}\Scripts\whisper.exe
 */
async function discoverFromPythonScripts(): Promise<string | undefined> {
  if (platform !== 'win32') return undefined;

  const candidates = await collectWindowsCandidates();

  for (const candidate of candidates) {
    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function collectWindowsCandidates(): Promise<string[]> {
  const localAppData = env['LOCALAPPDATA'];
  const appData = env['APPDATA'];
  const candidates: string[] = [];

  // %LOCALAPPDATA%/Python/pythoncore-*/Scripts/whisper.exe
  // This is where Microsoft Store / standalone Python installs live
  if (localAppData !== undefined) {
    const pythonDir = join(localAppData, 'Python');
    const entries = await safeReaddir(pythonDir);

    for (const entry of entries) {
      if (entry.toLowerCase().startsWith('pythoncore-') || entry.toLowerCase().startsWith('python')) {
        candidates.push(join(pythonDir, entry, 'Scripts', 'whisper.exe'));
      }
    }

    // %LOCALAPPDATA%/Programs/Python/Python*/Scripts/whisper.exe
    // Standard python.org installer location
    const programsDir = join(localAppData, 'Programs', 'Python');
    const programEntries = await safeReaddir(programsDir);

    for (const entry of programEntries) {
      if (entry.toLowerCase().startsWith('python')) {
        candidates.push(join(programsDir, entry, 'Scripts', 'whisper.exe'));
      }
    }
  }

  // %APPDATA%/Python/Python*/Scripts/whisper.exe
  // pip --user installs
  if (appData !== undefined) {
    const userPythonDir = join(appData, 'Python');
    const entries = await safeReaddir(userPythonDir);

    for (const entry of entries) {
      if (entry.toLowerCase().startsWith('python')) {
        candidates.push(join(userPythonDir, entry, 'Scripts', 'whisper.exe'));
      }
    }
  }

  return candidates;
}

async function canExecute(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
