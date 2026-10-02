import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import type { IAccountRepository, ISessionRepository } from '../domain/auth.repository.js';
import type { AccountWithTruck, SessionDomain } from '../domain/account.types.js';

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class PrismaAccountRepository implements IAccountRepository {

  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findByUsername(username: string): Promise<AccountWithTruck | null> {
    const normalized = username.trim().toUpperCase();
    const account = await this.prisma.account.findFirst({
      where: {
        OR: [
          { username: normalized },
          { username: username.trim() },
        ],
      },
      include: {
        truck: true,
      },
    });

    if (!account) return null;

    return {
      account: {
        id: account.id,
        username: account.username,
        passwordHash: account.passwordHash,
        role: account.role as any,
        isActive: account.isActive,
        truckId: account.truckId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      truck: account.truck
        ? {
            id: account.truck.id,
            licensePlate: account.truck.licensePlate,
            helperName: account.truck.helperName,
          }
        : null,
    };
  }

  async findById(id: string): Promise<AccountWithTruck | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        truck: true,
      },
    });

    if (!account) return null;

    return {
      account: {
        id: account.id,
        username: account.username,
        passwordHash: account.passwordHash,
        role: account.role as any,
        isActive: account.isActive,
        truckId: account.truckId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      truck: account.truck
        ? {
            id: account.truck.id,
            licensePlate: account.truck.licensePlate,
            helperName: account.truck.helperName,
          }
        : null,
    };
  }
}

export class PrismaSessionRepository implements ISessionRepository {

  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createSession(accountId: string, token: string): Promise<SessionDomain> {
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.accountSession.create({
      data: {
        accountId,
        token: tokenHash,
      },
    });

    return {
      id: session.id,
      token: session.token,
      accountId: session.accountId,
      createdAt: session.createdAt,
    };
  }

  async findByToken(token: string): Promise<SessionDomain | null> {
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.accountSession.findUnique({
      where: { token: tokenHash },
    });

    if (!session) return null;

    return {
      id: session.id,
      token: session.token,
      accountId: session.accountId,
      createdAt: session.createdAt,
    };
  }

  async deleteByToken(token: string): Promise<void> {
    const tokenHash = hashSessionToken(token);
    await this.prisma.accountSession.deleteMany({
      where: { token: tokenHash },
    });
  }
}

export const prismaAccountRepository = new PrismaAccountRepository();
export const prismaSessionRepository = new PrismaSessionRepository();

