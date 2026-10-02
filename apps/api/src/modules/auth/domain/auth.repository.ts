import type { AccountWithTruck, SessionDomain } from './account.types.js';

export interface IAccountRepository {
  findByUsername(username: string): Promise<AccountWithTruck | null>;
  findById(id: string): Promise<AccountWithTruck | null>;
}

export interface ISessionRepository {
  createSession(accountId: string, token: string): Promise<SessionDomain>;
  findByToken(token: string): Promise<SessionDomain | null>;
  deleteByToken(token: string): Promise<void>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
