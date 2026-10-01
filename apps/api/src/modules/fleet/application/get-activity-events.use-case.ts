import type { ActivityEvent } from '../domain/fleet-metrics.entity.js';
import type { IFleetRepository } from '../domain/fleet.repository.js';

export class GetActivityEventsUseCase {
  constructor(private readonly fleetRepo: IFleetRepository) {}

  async execute(): Promise<ActivityEvent[]> {
    return this.fleetRepo.getActivityEvents();
  }
}
