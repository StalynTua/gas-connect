import type { Coordinates, RouteResult } from '../../shared/coordinates.types.js';
import { calculateHaversineDistance } from './domain/haversine.calculator.js';
import { OsrmHttpClient } from './infrastructure/osrm-http.client.js';

export type { Coordinates, RouteResult };
export { calculateHaversineDistance };

export class OsrmRoutingService extends OsrmHttpClient {}

export const routingService = new OsrmRoutingService();
