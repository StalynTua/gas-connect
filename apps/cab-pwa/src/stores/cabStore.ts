/**
 * Facade de compatibilidad hacia la arquitectura DDD.
 * Re-exporta el store desde la capa de aplicación y los tipos desde domain.
 */
export { useCabStore, buildCabStore } from '../application/cab-store.js';
export type { CabStoreState, ActiveOffer, CabState } from '../domain/cab-state.types.js';
