import type { PackageInfo } from '../models/package-info.model.js';

export interface INpmRepository {
  getPackageInfo(packageName: string): Promise<PackageInfo>;
}
