import type { FleetTruckSummary, TruckStatus } from './domain/fleet-truck.entity.js';
import type { FleetDashboardMetrics, ActivityEvent } from './domain/fleet-metrics.entity.js';
import { prismaFleetRepository } from './infrastructure/prisma-fleet.repository.js';
import type { IFleetRepository } from './domain/fleet.repository.js';

export type { FleetTruckSummary, FleetDashboardMetrics };

export class FleetService {
  constructor(private readonly repo: IFleetRepository = prismaFleetRepository) {}

  async getFleetStatus(): Promise<FleetTruckSummary[]> {
    return this.repo.getFleetStatus();
  }

  async updateTruckStatus(truckId: string, status: TruckStatus): Promise<boolean> {
    return this.repo.updateTruckStatus(truckId, status);
  }

  async updateTruckPosition(truckId: string, lat: number, lng: number, stock?: number): Promise<boolean> {
    return this.repo.updateTruckPosition(truckId, lat, lng, stock);
  }

  async getActivityEvents(): Promise<ActivityEvent[]> {
    return this.repo.getActivityEvents();
  }

  async getDashboardMetrics(): Promise<FleetDashboardMetrics> {
    return this.repo.getDashboardMetrics();
  }
}

export const fleetService = new FleetService(prismaFleetRepository);
