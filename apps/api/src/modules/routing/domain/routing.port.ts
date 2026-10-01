import type { Coordinates, RouteResult } from '../../../shared/coordinates.types.js';

export interface IRoutingPort {
  calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteResult>;
  calculateTableMatrix(origins: Coordinates[], destination: Coordinates): Promise<RouteResult[]>;
}
