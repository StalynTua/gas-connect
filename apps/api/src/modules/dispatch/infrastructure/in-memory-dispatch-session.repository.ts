import type { DispatchSession } from '../domain/dispatch-session.entity.js';
import type { IDispatchSessionRepository } from '../domain/dispatch-session.repository.js';

export class InMemoryDispatchSessionRepository implements IDispatchSessionRepository {
  private readonly sessions = new Map<string, DispatchSession>();

  save(session: DispatchSession): void {
    this.sessions.set(session.orderId, session);
  }

  get(orderId: string): DispatchSession | undefined {
    return this.sessions.get(orderId);
  }

  delete(orderId: string): void {
    const session = this.sessions.get(orderId);
    if (session?.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
    }
    this.sessions.delete(orderId);
  }
}

export const inMemoryDispatchSessionRepository = new InMemoryDispatchSessionRepository();
