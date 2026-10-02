import { randomUUID } from 'node:crypto';
import type { IAccountRepository, ISessionRepository, IPasswordHasher } from '../domain/auth.repository.js';

export interface LoginInput {
  licensePlate: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  truckId?: string;
  licensePlate?: string;
  helperName?: string;
  error?: string;
}

export class LoginUseCase {
  constructor(
    private readonly accountRepo: IAccountRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const { licensePlate, password } = input;
    if (!licensePlate || !password) {
      return {
        success: false,
        error: 'Placa y contraseña requeridas',
      };
    }

    const accountWithTruck = await this.accountRepo.findByUsername(licensePlate);
    if (!accountWithTruck) {
      return {
        success: false,
        error: 'Credenciales inválidas',
      };
    }

    const { account, truck } = accountWithTruck;

    if (!account.isActive) {
      return {
        success: false,
        error: 'Cuenta inactiva o bloqueada',
      };
    }

    const isValidPassword = await this.passwordHasher.verify(account.passwordHash, password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Credenciales inválidas',
      };
    }

    const token = randomUUID();
    await this.sessionRepo.createSession(account.id, token);

    return {
      success: true,
      token,
      truckId: truck?.id ?? account.truckId ?? undefined,
      licensePlate: truck?.licensePlate ?? account.username,
      helperName: truck?.helperName ?? 'Ayudante',
    };
  }
}
