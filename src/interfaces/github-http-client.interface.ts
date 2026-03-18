export interface IGithubHttpClient {
  get<T>(path: string): Promise<T>;
}
