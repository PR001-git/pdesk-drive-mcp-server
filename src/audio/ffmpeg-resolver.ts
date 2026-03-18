import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { env, platform } from 'node:process';

import { FfmpegNotInstalledError } from '../errors/ffmpeg-not-installed.error.js';

export interface FfmpegPaths {
  ffmpeg: string;
  ffprobe: string;
}

/**
 * Resolves absolute paths to ffmpeg and ffprobe binaries.
 *
 * Resolution order:
 *   1. Environment variables FFMPEG_PATH / FFPROBE_PATH (explicit override)
 *   2. Bare binary names — works when already on PATH
 *   3. Known install locations (currently: winget on Windows)
 *
 * Calling this once at startup and injecting the result into
 * AudioPreparationService avoids repeated filesystem probing on every
 * conversion and gives a clear early error if the binaries are missing.
 */
export async function resolveFfmpegPaths(): Promise<FfmpegPaths> {
  // 1. Explicit env-var override
  const envFfmpeg = env['FFMPEG_PATH'];
  const envFfprobe = env['FFPROBE_PATH'];

  if (envFfmpeg !== undefined && envFfprobe !== undefined) {
    await assertExecutable(envFfmpeg, 'FFMPEG_PATH');
    await assertExecutable(envFfprobe, 'FFPROBE_PATH');
    return { ffmpeg: envFfmpeg, ffprobe: envFfprobe };
  }

  // 2. Bare names — rely on the OS PATH
  if (await canExecute('ffmpeg') && await canExecute('ffprobe')) {
    return { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };
  }

  // 3. Probe known install locations
  const discovered = await discoverFromKnownLocations();
  if (discovered !== undefined) {
    return discovered;
  }

  throw new FfmpegNotInstalledError();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertExecutable(filePath: string, label: string): Promise<void> {
  try {
    await access(filePath, constants.X_OK);
  } catch {
    throw new FfmpegNotInstalledError(
      `${label} points to "${filePath}" but the file is not executable or does not exist.`
    );
  }
}

async function canExecute(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scans well-known package-manager install directories for ffmpeg binaries.
 * Currently supports:
 *   - winget (Windows): %LOCALAPPDATA%/Microsoft/WinGet/Packages/Gyan.FFmpeg_*
 */
async function discoverFromKnownLocations(): Promise<FfmpegPaths | undefined> {
  if (platform !== 'win32') return undefined;

  const localAppData = env['LOCALAPPDATA'];
  if (localAppData === undefined) return undefined;

  const packagesDir = join(localAppData, 'Microsoft', 'WinGet', 'Packages');

  let entries: string[];
  try {
    entries = await readdir(packagesDir);
  } catch {
    return undefined;
  }

  // winget installs Gyan.FFmpeg under a directory whose name starts with
  // "Gyan.FFmpeg_" — the suffix varies by source/version.
  const ffmpegPkg = entries.find((e) => e.startsWith('Gyan.FFmpeg_'));
  if (ffmpegPkg === undefined) return undefined;

  // Inside the package there is a versioned folder (e.g. "ffmpeg-8.1-full_build")
  // containing a "bin" directory.
  const pkgDir = join(packagesDir, ffmpegPkg);
  let subDirs: string[];
  try {
    subDirs = await readdir(pkgDir);
  } catch {
    return undefined;
  }

  const buildDir = subDirs.find((d) => d.startsWith('ffmpeg-'));
  if (buildDir === undefined) return undefined;

  const binDir = join(pkgDir, buildDir, 'bin');
  const ffmpeg = join(binDir, 'ffmpeg.exe');
  const ffprobe = join(binDir, 'ffprobe.exe');

  if (await canExecute(ffmpeg) && await canExecute(ffprobe)) {
    return { ffmpeg, ffprobe };
  }

  return undefined;
}
