export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  /** Raw repository URL from the package's package.json, or null if absent. */
  repositoryUrl: string | null;
}
