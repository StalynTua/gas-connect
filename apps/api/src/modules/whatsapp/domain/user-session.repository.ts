import type { UserSession } from './dialog-state.entity.js';

export interface IUserSessionRepository {
  getSession(phoneNumber: string): UserSession;
  resetSession(phoneNumber: string): void;
}
