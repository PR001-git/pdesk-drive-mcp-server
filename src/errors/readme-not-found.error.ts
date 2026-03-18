export class ReadmeNotFoundError extends Error {
  constructor(owner: string, repo: string) {
    super(`No README found in GitHub repository: ${owner}/${repo}`);
    this.name = 'ReadmeNotFoundError';
  }
}
