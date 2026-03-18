import type { PackageDocs } from '../models/package-docs.model.js';

export interface IDocsService {
  getPackageDocs(packageName: string): Promise<PackageDocs>;
}
