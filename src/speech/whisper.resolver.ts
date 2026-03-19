import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { WhisperNotInstalledError } from '../errors/whisper-not-installed.error.js';

const execFileAsync = promisify(execFile);

export interface PythonPaths {
  pythonPath: string;
  runnerPath: string;
}

/**
 * Resolves the Python interpreter and verifies that faster-whisper is importable.
 *
 * Resolution order for the interpreter:
 *   1. PYTHON_PATH environment variable (explicit override)
 *   2. "python" on PATH
 *   3. "python3" on PATH
 *   4. "py" on PATH (Windows launcher)
 *
 * Called once at startup so the server fails fast with a clear error
 * if faster-whisper is not installed.
 */
export async function resolvePythonPath(): Promise<PythonPaths> {
  const runnerPath = resolveRunnerPath();

  const envPath = env['PYTHON_PATH'];
  if (envPath !== undefined && envPath !== '') {
    await assertFasterWhisperImportable(envPath);
    return { pythonPath: envPath, runnerPath };
  }

  const candidates = ['python', 'python3', 'py'];

  for (const candidate of candidates) {
    if (await canRunPython(candidate)) {
      await assertFasterWhisperImportable(candidate);
      return { pythonPath: candidate, runnerPath };
    }
  }

  throw new WhisperNotInstalledError(
    'No Python interpreter found on PATH. Install Python and run: pip install faster-whisper'
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveRunnerPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return join(dirname(thisFile), 'faster_whisper_runner.py');
}

async function canRunPython(binary: string): Promise<boolean> {
  try {
    await execFileAsync(binary, ['--version'], { timeout: 10_000 });
    return true;
  } catch (err: unknown) {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    if (msg.includes('enoent') || msg.includes('spawn')) return false;
    // Binary exists but returned non-zero — still usable
    return true;
  }
}

async function assertFasterWhisperImportable(pythonBinary: string): Promise<void> {
  try {
    await execFileAsync(
      pythonBinary,
      ['-c', 'import faster_whisper'],
      { timeout: 15_000 }
    );
  } catch {
    throw new WhisperNotInstalledError(
      'faster-whisper not found — run: pip install faster-whisper'
    );
  }
}
