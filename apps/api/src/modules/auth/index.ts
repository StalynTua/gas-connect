import type { FastifyInstance } from 'fastify';
import type { IAccountRepository, ISessionRepository, IPasswordHasher } from './domain/auth.repository.js';
import { prismaAccountRepository, prismaSessionRepository } from './infrastructure/prisma-auth.repository.js';
import { argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { LoginUseCase } from './application/login.use-case.js';
import { registerAuthRoutes, AuthRouteDeps } from './presentation/auth.controller.js';

export type { IAccountRepository, ISessionRepository, IPasswordHasher, AuthRouteDeps };
export * from './domain/account.types.js';
export {
  LoginUseCase,
  registerAuthRoutes,
  prismaAccountRepository,
  prismaSessionRepository,
  argon2PasswordHasher,
};

export interface AuthModuleDeps {
  accountRepo?: IAccountRepository;
  sessionRepo?: ISessionRepository;
  passwordHasher?: IPasswordHasher;
  loginUseCase?: LoginUseCase;
}

export function createAuthModule(deps: AuthModuleDeps = {}) {
  const accountRepo = deps.accountRepo ?? prismaAccountRepository;
  const sessionRepo = deps.sessionRepo ?? prismaSessionRepository;
  const passwordHasher = deps.passwordHasher ?? argon2PasswordHasher;
  const loginUseCase = deps.loginUseCase ?? new LoginUseCase(accountRepo, sessionRepo, passwordHasher);

  return {
    accountRepo,
    sessionRepo,
    passwordHasher,
    useCases: {
      loginUseCase,
    },
    registerRoutes(server: FastifyInstance) {
      registerAuthRoutes(server, {
        loginUseCase,
        sessionRepo,
      });
    },
  };
}
