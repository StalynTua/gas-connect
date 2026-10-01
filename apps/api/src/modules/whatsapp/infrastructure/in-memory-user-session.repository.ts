import type { UserSession } from '../domain/dialog-state.entity.js';
import type { IUserSessionRepository } from '../domain/user-session.repository.js';

export class InMemoryUserSessionRepository implements IUserSessionRepository {
  private readonly sessions = new Map<string, UserSession>();

  getSession(phoneNumber: string): UserSession {
    let session = this.sessions.get(phoneNumber);
    if (!session) {
      session = {
        phoneNumber,
        currentStep: 'IDLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(phoneNumber, session);
    }
    return session;
  }

  resetSession(phoneNumber: string): void {
    this.sessions.delete(phoneNumber);
  }
}

export const inMemoryUserSessionRepository = new InMemoryUserSessionRepository();
