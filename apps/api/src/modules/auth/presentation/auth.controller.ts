import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { LoginUseCase } from '../application/login.use-case.js';
import type { ISessionRepository } from '../domain/auth.repository.js';

export interface AuthRouteDeps {
  loginUseCase: LoginUseCase;
  sessionRepo: ISessionRepository;
}

interface LoginBody {
  licensePlate?: string;
  username?: string;
  password?: string;
}

interface LogoutBody {
  token?: string;
}

export function registerAuthRoutes(server: FastifyInstance, deps: AuthRouteDeps) {
  server.post(
    '/api/v1/auth/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { licensePlate, username, password } = request.body || {};
      const identifier = licensePlate || username;

      if (!identifier || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Placa y contraseña son requeridas',
        });
      }

      const result = await deps.loginUseCase.execute({
        licensePlate: identifier,
        password,
      });

      if (!result.success) {
        return reply.status(401).send({
          success: false,
          error: result.error || 'Credenciales inválidas',
        });
      }

      return reply.status(200).send({
        success: true,
        token: result.token,
        truckId: result.truckId,
        licensePlate: result.licensePlate,
        helperName: result.helperName,
      });
    }
  );

  server.post(
    '/api/v1/auth/logout',
    async (request: FastifyRequest<{ Body: LogoutBody }>, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const token = request.body?.token || headerToken;

      if (token) {
        await deps.sessionRepo.deleteByToken(token);
      }

      return reply.status(200).send({
        success: true,
        message: 'Sesión cerrada correctamente',
      });
    }
  );
}
