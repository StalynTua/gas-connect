import type { FleetTruckSummary, TruckStatus } from './fleet-truck.entity.js';
import type { FleetDashboardMetrics, ActivityEvent } from './fleet-metrics.entity.js';

export interface IFleetRepository {
  getFleetStatus(): Promise<FleetTruckSummary[]>;
  updateTruckStatus(truckId: string, status: TruckStatus): Promise<boolean>;
  updateTruckPosition(truckId: string, lat: number, lng: number, stock?: number): Promise<boolean>;
  getActivityEvents(): Promise<ActivityEvent[]>;
  getDashboardMetrics(): Promise<FleetDashboardMetrics>;
}
