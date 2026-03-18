import type { INpmHttpClient } from '../interfaces/npm-http-client.interface.js';
import type { INpmRepository } from '../interfaces/npm-repository.interface.js';
import type { PackageInfo } from '../models/package-info.model.js';
import { HttpError } from '../errors/http.error.js';
import { PackageNotFoundError } from '../errors/package-not-found.error.js';

// Minimal shape of a package.json `repository` field — can be an object or shorthand string
interface NpmRepositoryField {
  type?: string;
  url?: string;
}

// Minimal shape of the /latest endpoint response we actually use
interface NpmLatestResponse {
  name: string;
  version: string;
  description?: string;
  repository?: NpmRepositoryField | string;
}

export class NpmRepository implements INpmRepository {
  constructor(private readonly client: INpmHttpClient) {}

  async getPackageInfo(packageName: string): Promise<PackageInfo> {
    let response: NpmLatestResponse;

    try {
      response = await this.client.get<NpmLatestResponse>(`/${encodeURIComponent(packageName)}/latest`);
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        throw new PackageNotFoundError(packageName);
      }
      throw err;
    }

    return {
      name: response.name,
      version: response.version,
      description: response.description ?? '',
      repositoryUrl: extractRepositoryUrl(response.repository),
    };
  }
}

function extractRepositoryUrl(field: NpmLatestResponse['repository']): string | null {
  if (field === undefined || field === null) return null;
  if (typeof field === 'string') return field;
  return field.url ?? null;
}
