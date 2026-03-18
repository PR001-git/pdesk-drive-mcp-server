export class NoGithubRepoError extends Error {
  constructor(packageName: string, reason: string) {
    super(`Package "${packageName}" has no usable GitHub repository: ${reason}`);
    this.name = 'NoGithubRepoError';
  }
}
