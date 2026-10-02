import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/app.js';
import { LoginUseCase } from '../../src/modules/auth/application/login.use-case.js';
import type { IAccountRepository, ISessionRepository, IPasswordHasher } from '../../src/modules/auth/domain/auth.repository.js';
import type { AccountWithTruck, SessionDomain } from '../../src/modules/auth/domain/account.types.js';

describe('Auth Module - Unit & Integration Tests', () => {
  const mockAccounts: Record<string, AccountWithTruck> = {
    'IAA-1041': {
      account: {
        id: 'acc-1',
        username: 'IAA-1041',
        passwordHash: 'hashed_GasIbarra2025!',
        role: 'TRUCK_HELPER',
        isActive: true,
        truckId: 'truck-ceibos-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      truck: {
        id: 'truck-ceibos-1',
        licensePlate: 'IAA-1041',
        helperName: 'Luis Muenala',
      },
    },
    'INACTIVE-1': {
      account: {
        id: 'acc-inactive',
        username: 'INACTIVE-1',
        passwordHash: 'hashed_password',
        role: 'TRUCK_HELPER',
        isActive: false,
        truckId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      truck: null,
    },
  };

  const sessions: Map<string, SessionDomain> = new Map();

  const mockAccountRepo: IAccountRepository = {
    async findByUsername(username: string) {
      return mockAccounts[username.toUpperCase().trim()] || null;
    },
    async findById(id: string) {
      const found = Object.values(mockAccounts).find((a) => a.account.id === id);
      return found || null;
    },
  };

  const mockSessionRepo: ISessionRepository = {
    async createSession(accountId: string, token: string) {
      const session: SessionDomain = {
        id: `sess-${Date.now()}`,
        accountId,
        token,
        createdAt: new Date(),
      };
      sessions.set(token, session);
      return session;
    },
    async findByToken(token: string) {
      return sessions.get(token) || null;
    },
    async deleteByToken(token: string) {
      sessions.delete(token);
    },
  };

  const mockPasswordHasher: IPasswordHasher = {
    async hash(password: string) {
      return `hashed_${password}`;
    },
    async verify(hash: string, plain: string) {
      return hash === `hashed_${plain}`;
    },
  };

  describe('LoginUseCase', () => {
    const useCase = new LoginUseCase(mockAccountRepo, mockSessionRepo, mockPasswordHasher);

    it('should return error when licensePlate or password is missing', async () => {
      const res = await useCase.execute({ licensePlate: '', password: '123' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Placa y contraseña requeridas');
    });

    it('should return error when account does not exist', async () => {
      const res = await useCase.execute({ licensePlate: 'XYZ-9999', password: '123' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Credenciales inválidas');
    });

    it('should return error when password does not match', async () => {
      const res = await useCase.execute({ licensePlate: 'IAA-1041', password: 'wrong' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Credenciales inválidas');
    });

    it('should return error when account is inactive', async () => {
      const res = await useCase.execute({ licensePlate: 'INACTIVE-1', password: 'password' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Cuenta inactiva o bloqueada');
    });

    it('should login successfully and return token and truck details', async () => {
      const res = await useCase.execute({ licensePlate: 'IAA-1041', password: 'GasIbarra2025!' });
      expect(res.success).toBe(true);
      expect(res.token).toBeDefined();
      expect(res.truckId).toBe('truck-ceibos-1');
      expect(res.licensePlate).toBe('IAA-1041');
      expect(res.helperName).toBe('Luis Muenala');

      // Verify session was stored
      const stored = await mockSessionRepo.findByToken(res.token!);
      expect(stored).toBeDefined();
      expect(stored?.accountId).toBe('acc-1');
    });
  });

  describe('Fastify Auth Endpoints', () => {
    let server: FastifyInstance;

    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      const loginUseCase = new LoginUseCase(mockAccountRepo, mockSessionRepo, mockPasswordHasher);
      server = buildServer({
        accountRepo: mockAccountRepo,
        sessionRepo: mockSessionRepo,
        loginUseCase,
      });
      await server.ready();
    });

    afterAll(async () => {
      await server.close();
    });

    it('POST /api/v1/auth/login with invalid credentials returns 401', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          licensePlate: 'IAA-1041',
          password: 'wrong_password',
        },
      });

      expect(response.statusCode).toBe(401);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(false);
    });

    it('POST /api/v1/auth/login with valid credentials returns 200 and token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          licensePlate: 'IAA-1041',
          password: 'GasIbarra2025!',
        },
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(json.truckId).toBe('truck-ceibos-1');
      expect(json.licensePlate).toBe('IAA-1041');
      expect(json.helperName).toBe('Luis Muenala');
    });

    it('POST /api/v1/auth/logout deletes token', async () => {
      const loginRes = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          licensePlate: 'IAA-1041',
          password: 'GasIbarra2025!',
        },
      });
      const { token } = JSON.parse(loginRes.body);

      const logoutRes = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { token },
      });

      expect(logoutRes.statusCode).toBe(200);
      const stored = await mockSessionRepo.findByToken(token);
      expect(stored).toBeNull();
    });
  });

  describe('PrismaSessionRepository - SHA-256 Hashing for High Performance & Defense in Depth', () => {
    it('should store and query session tokens using SHA-256 hex digests', async () => {
      const { PrismaSessionRepository, hashSessionToken } = await import(
        '../../src/modules/auth/infrastructure/prisma-auth.repository.js'
      );

      const dbMap = new Map<string, any>();
      const mockPrisma: any = {
        accountSession: {
          create: async ({ data }: any) => {
            dbMap.set(data.token, { id: 'sess-1', ...data, createdAt: new Date() });
            return dbMap.get(data.token);
          },
          findUnique: async ({ where }: any) => {
            return dbMap.get(where.token) || null;
          },
          deleteMany: async ({ where }: any) => {
            dbMap.delete(where.token);
          },
        },
      };

      const sessionRepo = new PrismaSessionRepository(mockPrisma);
      const rawToken = '884c7987-9bb3-43ef-b326-64fa4118f9e0';
      const expectedHash = hashSessionToken(rawToken);

      // Verify that expected hash is 64 hex characters (256-bit)
      expect(expectedHash).toHaveLength(64);
      expect(expectedHash).not.toBe(rawToken);

      // 1. Create session
      const created = await sessionRepo.createSession('acc-1', rawToken);
      expect(created.token).toBe(expectedHash);

      // Check that the database stored the hash, NOT the raw token
      expect(dbMap.has(expectedHash)).toBe(true);
      expect(dbMap.has(rawToken)).toBe(false);

      // 2. Find by raw token (internally hashes and finds)
      const found = await sessionRepo.findByToken(rawToken);
      expect(found).not.toBeNull();
      expect(found?.accountId).toBe('acc-1');

      // 3. Delete by raw token
      await sessionRepo.deleteByToken(rawToken);
      expect(dbMap.has(expectedHash)).toBe(false);
    });
  });
});

