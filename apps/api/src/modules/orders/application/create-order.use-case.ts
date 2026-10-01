import type { CreateOrderParams, IOrderRepository } from '../domain/order.repository.js';

export class CreateOrderUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(dto: CreateOrderParams): Promise<void> {
    return this.orderRepo.createOrUpdate(dto);
  }
}
