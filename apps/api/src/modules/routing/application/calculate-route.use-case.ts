import type { Coordinates, RouteResult } from '../../../shared/coordinates.types.js';
import type { IRoutingPort } from '../domain/routing.port.js';

export interface CalculateRouteDto {
  from: Coordinates;
  to: Coordinates;
}

export class CalculateRouteUseCase {
  constructor(private readonly routingPort: IRoutingPort) {}

  async execute(dto: CalculateRouteDto): Promise<RouteResult> {
    return this.routingPort.calculateRoute(dto.from, dto.to);
  }
}
