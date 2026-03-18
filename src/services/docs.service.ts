import type { IGithubRepository } from '../interfaces/github-repository.interface.js';
import type { IDocsService } from '../interfaces/docs-service.interface.js';
import type { INpmRepository } from '../interfaces/npm-repository.interface.js';
import type { PackageDocs } from '../models/package-docs.model.js';
import { NoGithubRepoError } from '../errors/no-github-repo.error.js';

export class DocsService implements IDocsService {
  constructor(
    private readonly npmRepo: INpmRepository,
    private readonly githubRepo: IGithubRepository
  ) {}

  async getPackageDocs(packageName: string): Promise<PackageDocs> {
    const info = await this.npmRepo.getPackageInfo(packageName);

    if (info.repositoryUrl === null) {
      throw new NoGithubRepoError(packageName, 'no repository field in package.json');
    }

    const parsed = parseGithubRepo(info.repositoryUrl);

    if (parsed === null) {
      throw new NoGithubRepoError(
        packageName,
        `repository URL does not point to GitHub: ${info.repositoryUrl}`
      );
    }

    const { owner, repo } = parsed;
    const content = await this.githubRepo.getReadme(owner, repo);

    return {
      packageName: info.name,
      version: info.version,
      repoUrl: `https://github.com/${owner}/${repo}`,
      content,
    };
  }
}

interface GithubCoords {
  owner: string;
  repo: string;
}

/**
 * Extracts a GitHub owner/repo pair from the many URL formats npm packages use.
 *
 * Handles:
 *  - https://github.com/owner/repo(.git)
 *  - git+https://github.com/owner/repo.git
 *  - git://github.com/owner/repo.git
 *  - github:owner/repo
 *
 * Returns null for non-GitHub URLs (GitLab, Bitbucket, etc.).
 */
function parseGithubRepo(rawUrl: string): GithubCoords | null {
  // Full URL variants — match anything after github.com/ or github.com:
  const urlMatch = /github\.com[/:]([^/\s]+)\/([^/\s]+)/.exec(rawUrl);
  if (urlMatch !== null) {
    return normalizeCoords(urlMatch[1]!, urlMatch[2]!);
  }

  // Shorthand: "github:owner/repo"
  const shorthandMatch = /^github:([^/\s]+)\/([^/\s]+)/.exec(rawUrl);
  if (shorthandMatch !== null) {
    return normalizeCoords(shorthandMatch[1]!, shorthandMatch[2]!);
  }

  return null;
}

function normalizeCoords(owner: string, repo: string): GithubCoords {
  // Strip .git suffix and any trailing fragment/query (e.g. repo.git#v1)
  const cleanRepo = repo.replace(/\.git$/, '').replace(/[#?].*$/, '');
  return { owner, repo: cleanRepo };
}
