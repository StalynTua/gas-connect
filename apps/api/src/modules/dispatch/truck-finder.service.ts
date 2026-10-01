import { prisma } from '../../lib/prisma.js';
import { routingService, Coordinates } from '../routing/osrm.service.js';
import type { CandidateTruck, CandidateQueryOptions } from './domain/candidate-truck.entity.js';
import { PrismaTruckCandidateRepository } from './infrastructure/prisma-truck-candidate.repository.js';

export type { CandidateTruck, CandidateQueryOptions };

export class TruckFinderService extends PrismaTruckCandidateRepository {
  constructor() {
    super(prisma, routingService);
  }
}

export const truckFinderService = new TruckFinderService();
