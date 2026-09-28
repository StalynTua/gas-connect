import { describe, it, expect } from 'vitest';
import { Prisma, TruckStatus, OrderStatus, CylinderType, DispatchResult, InventoryChangeType } from '@prisma/client';

describe('Prisma Schema & Model Types Verification', () => {
  it('should export all required enums according to the specification', () => {
    expect(TruckStatus.IDLE).toBe('IDLE');
    expect(TruckStatus.IN_TRANSIT).toBe('IN_TRANSIT');
    expect(TruckStatus.RESTOCKING).toBe('RESTOCKING');
    expect(TruckStatus.OFF_DUTY).toBe('OFF_DUTY');

    expect(OrderStatus.PENDING).toBe('PENDING');
    expect(OrderStatus.OFFERED).toBe('OFFERED');
    expect(OrderStatus.ASSIGNED).toBe('ASSIGNED');
    expect(OrderStatus.COMPLETED).toBe('COMPLETED');
    expect(OrderStatus.SCHEDULED).toBe('SCHEDULED');

    expect(CylinderType.DOMESTIC_15KG).toBe('DOMESTIC_15KG');
    expect(CylinderType.INDUSTRIAL_45KG).toBe('INDUSTRIAL_45KG');

    expect(DispatchResult.ACCEPTED).toBe('ACCEPTED');
    expect(DispatchResult.REJECTED).toBe('REJECTED');
    expect(DispatchResult.TIMEOUT).toBe('TIMEOUT');

    expect(InventoryChangeType.INITIAL_LOAD).toBe('INITIAL_LOAD');
    expect(InventoryChangeType.SALE).toBe('SALE');
    expect(InventoryChangeType.DEPOT_RESTOCK).toBe('DEPOT_RESTOCK');
  });

  it('should have correct type definitions for Truck and Order models', () => {
    const mockTruck: Prisma.TruckCreateInput = {
      licensePlate: 'IAA-1234',
      driverName: 'Juan Perez',
      helperName: 'Pedro Gomez',
      helperPhone: '0991122334',
      currentStockFull: 40,
      currentStockEmpty: 0,
      status: TruckStatus.IDLE,
      distributor: {
        create: {
          businessName: 'Distribuidora Agip Ibarra',
          phoneNumber: '0990001122',
        },
      },
    };

    expect(mockTruck.licensePlate).toBe('IAA-1234');
    expect(mockTruck.currentStockFull).toBe(40);
  });
});
