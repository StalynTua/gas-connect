import { z, ZodError, ZodSchema } from 'zod';

// ==========================================
// 1. Common & Coordinates
// ==========================================
export * from './coordinates.js';

// ==========================================
// 2. Telemetry Domain
// ==========================================
export * from './telemetry.contract.js';

// ==========================================
// 3. Dispatch Domain
// ==========================================
export * from './dispatch.contract.js';

// ==========================================
// 4. Order Domain
// ==========================================
export * from './order.contract.js';

// ==========================================
// 5. Fleet Domain
// ==========================================
export * from './fleet.contract.js';

// ==========================================
// 6. Generic Contract Validation Helpers
// ==========================================
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: ZodError;
  errorMessage: string;
  fieldErrors: Record<string, string[]>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Valida datos de entrada de forma segura y devuelve un resultado tipado
 */
export function validateContract<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = result.error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[]>;
  const messages = [
    ...flattened.formErrors,
    ...Object.entries(fieldErrors).flatMap(([field, errors]) =>
      errors ? errors.map((msg) => `${field}: ${msg}`) : []
    ),
  ];

  return {
    success: false,
    error: result.error,
    errorMessage: messages.join('; ') || 'Validation error',
    fieldErrors,
  };
}

/**
 * Valida datos y lanza un error explicativo con contexto si la validación falla
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown, contextName = 'Contract'): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `${e.path.join('.') || 'root'}: ${e.message}`)
      .join(', ');
    throw new Error(`[${contextName}] Validation failed: ${errorDetails}`);
  }
  return result.data;
}

// Re-export zod instance and types for consumers
export { z, ZodError, ZodSchema };
