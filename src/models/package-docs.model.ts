export interface PackageDocs {
  packageName: string;
  version: string;
  /** Canonical GitHub URL of the source repository. */
  repoUrl: string;
  /** Raw README content in Markdown. */
  content: string;
}
