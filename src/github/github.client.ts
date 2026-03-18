import type { IGithubHttpClient } from '../interfaces/github-http-client.interface.js';
import { HttpError } from '../errors/http.error.js';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Creates a typed HTTP client scoped to the GitHub REST API.
 *
 * Reads GITHUB_TOKEN from the environment if present. Without a token the
 * GitHub API allows 60 requests/hr per IP; with a token it allows 5 000/hr.
 */
export function createGithubClient(): IGithubHttpClient {
  const token = process.env['GITHUB_TOKEN'];

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'drive-mcp-server',
  };

  if (token !== undefined && token.length > 0) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${GITHUB_API_BASE}${path}`, { headers });

      if (!res.ok) {
        throw new HttpError(res.status, `GitHub API responded ${res.status} for ${path}`);
      }

      return res.json() as Promise<T>;
    },
  };
}
