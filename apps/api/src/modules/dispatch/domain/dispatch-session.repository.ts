import type { DispatchSession } from './dispatch-session.entity.js';

export interface IDispatchSessionRepository {
  save(session: DispatchSession): void;
  get(orderId: string): DispatchSession | undefined;
  delete(orderId: string): void;
}
