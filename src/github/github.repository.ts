import type { IGithubHttpClient } from '../interfaces/github-http-client.interface.js';
import type { IGithubRepository } from '../interfaces/github-repository.interface.js';
import { HttpError } from '../errors/http.error.js';
import { ReadmeNotFoundError } from '../errors/readme-not-found.error.js';

// Shape returned by GET /repos/{owner}/{repo}/readme
interface GithubReadmeResponse {
  content: string;   // Base64-encoded file content
  encoding: string;  // Should always be "base64"
  name: string;
}

export class GithubRepository implements IGithubRepository {
  constructor(private readonly client: IGithubHttpClient) {}

  async getReadme(owner: string, repo: string): Promise<string> {
    let response: GithubReadmeResponse;

    try {
      response = await this.client.get<GithubReadmeResponse>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`
      );
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        throw new ReadmeNotFoundError(owner, repo);
      }
      throw err;
    }

    if (response.encoding !== 'base64') {
      // GitHub has only ever returned base64; this guards against unexpected changes
      throw new Error(`Unexpected README encoding from GitHub: ${response.encoding}`);
    }

    // GitHub pads the base64 string with newlines — strip them before decoding
    return Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  }
}
