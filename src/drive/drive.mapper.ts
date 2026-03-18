import type { drive_v3 } from 'googleapis';

import type { DriveFile } from '../models/drive-file.model.js';

export function mapToDriveFile(raw: drive_v3.Schema$File): DriveFile {
  const id = raw.id ?? '';
  const name = raw.name ?? '(untitled)';
  const mimeType = raw.mimeType ?? 'application/octet-stream';
  const size = raw.size != null ? parseInt(raw.size, 10) : undefined;
  const modifiedAt = raw.modifiedTime != null ? new Date(raw.modifiedTime) : new Date(0);
  const parents = raw.parents ?? [];

  return { id, name, mimeType, size, modifiedAt, parents };
}
