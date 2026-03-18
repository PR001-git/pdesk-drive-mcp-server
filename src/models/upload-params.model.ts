export interface UploadParams {
  name: string;
  content: Buffer;
  mimeType: string;
  folderId: string | undefined;
}
