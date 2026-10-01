import type { Coordinates } from '../../../shared/coordinates.types.js';
import type { CandidateTruck, CandidateQueryOptions } from './candidate-truck.entity.js';

export interface ITruckCandidateRepository {
  findCandidates(
    deliveryLocation: Coordinates,
    options: CandidateQueryOptions
  ): Promise<CandidateTruck[]>;
}
