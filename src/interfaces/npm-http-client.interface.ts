export interface INpmHttpClient {
  get<T>(path: string): Promise<T>;
}
