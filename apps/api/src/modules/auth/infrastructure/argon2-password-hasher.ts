import argon2 from 'argon2';
import type { IPasswordHasher } from '../domain/auth.repository.js';

export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MB (OWASP recommended standard)
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}

export const argon2PasswordHasher = new Argon2PasswordHasher();
