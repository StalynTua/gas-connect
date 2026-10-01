import type { IRoutingPort } from './domain/routing.port.js';
import { OsrmHttpClient } from './infrastructure/osrm-http.client.js';

export type { IRoutingPort };
export { OsrmHttpClient };

export interface RoutingModuleDeps {
  routingClient?: IRoutingPort;
}

export function createRoutingModule(deps: RoutingModuleDeps = {}) {
  const routingClient =
    deps.routingClient ?? new OsrmHttpClient(process.env.OSRM_URL || 'http://localhost:5001');

  return { routingClient };
}
