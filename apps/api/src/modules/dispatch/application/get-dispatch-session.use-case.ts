import type { DispatchSession } from '../domain/dispatch-session.entity.js';
import type { IDispatchSessionRepository } from '../domain/dispatch-session.repository.js';

export class GetDispatchSessionUseCase {
  constructor(private readonly sessionRepo: IDispatchSessionRepository) {}

  async execute(orderId: string): Promise<DispatchSession | undefined> {
    return this.sessionRepo.get(orderId);
  }
}
