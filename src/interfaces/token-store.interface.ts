import type { Credentials } from 'google-auth-library';

export interface ITokenStore {
  load(): Promise<Credentials | null>;
  save(credentials: Credentials): Promise<void>;
}
