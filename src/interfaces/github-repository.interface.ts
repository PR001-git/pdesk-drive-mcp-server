export interface IGithubRepository {
  /** Returns the raw README markdown for the given owner/repo. */
  getReadme(owner: string, repo: string): Promise<string>;
}
