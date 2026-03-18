export class PackageNotFoundError extends Error {
  constructor(packageName: string) {
    super(`Package not found on npm registry: ${packageName}`);
    this.name = 'PackageNotFoundError';
  }
}
