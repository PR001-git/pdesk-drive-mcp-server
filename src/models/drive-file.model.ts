export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | undefined;
  modifiedAt: Date;
  parents: string[];
}
