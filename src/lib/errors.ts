/**
 * Custom error classes for consistent error handling.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super('Validation failed', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

/**
 * Convert validation errors from Zod to our format.
 */
export function formatZodErrors(zodError: unknown): Record<string, string[]> {
  if (
    typeof zodError === 'object' &&
    zodError !== null &&
    'errors' in zodError &&
    Array.isArray((zodError as any).errors)
  ) {
    const errors: Record<string, string[]> = {};
    for (const err of (zodError as any).errors) {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    }
    return errors;
  }
  return {};
}
