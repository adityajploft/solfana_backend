import HttpError from '../errors/http.error.js';

export const handlePrismaError = (error) => {


  if (error.name === 'PrismaClientValidationError') {
    return new HttpError(
      400,
      'INVALID_INPUT',
      error.message, 
      'common'
    );
  }

  // Foreign key constraint failed
  if (error.code === 'P2003') {
    return new HttpError(
      400,
      'INVALID_REFERENCE_DATA',
      'foreign key error',
      'common'
    );
  }

  // Unique constraint failed
  if (error.code === 'P2002') {
    return new HttpError(
      400,
      'UNIQUE_CONSTRAINT_VIOLATION',
      'unique constraint error',
      'common'
    );
  }

  // Record not found
  if (error.code === 'P2025') {
    return new HttpError(
      404,
      'RECORD_NOT_FOUND',
      'Record not found',
      'common'
    );
  }

  // Fallback
  return new HttpError(
    500,
    'DATABASE_ERROR',
    'database error',
    'common'
  );
};