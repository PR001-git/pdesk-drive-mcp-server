import type { INpmHttpClient } from '../interfaces/npm-http-client.interface.js';
import { HttpError } from '../errors/http.error.js';

const NPM_REGISTRY_BASE = 'https://registry.npmjs.org';

export function createNpmClient(): INpmHttpClient {
  return {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${NPM_REGISTRY_BASE}${path}`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new HttpError(res.status, `npm registry responded ${res.status} for ${path}`);
      }

      return res.json() as Promise<T>;
    },
  };
}
