/**
 * Custom error classes for JeevaCare
 */

export class JeevaError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();
  }
}

export class ValidationError extends JeevaError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends JeevaError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends JeevaError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends JeevaError {
  constructor(message, resource = 'Resource') {
    super(message || `${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends JeevaError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

export class ResourceAlreadyExistsError extends ConflictError {
  constructor(resource) {
    super(`${resource} already exists`);
  }
}

export class RecordImmutabilityError extends JeevaError {
  constructor(message = 'This record cannot be directly modified. Use the amendment workflow instead.') {
    super(message, 400, 'RECORD_IMMUTABLE');
  }
}

export class PatientIsolationViolationError extends AuthorizationError {
  constructor() {
    super('Patient isolation violation: Cannot access another patient\'s records');
  }
}

export class FacilityIsolationViolationError extends AuthorizationError {
  constructor() {
    super('Facility isolation violation: Cannot access unauthorized facility resources');
  }
}

export class UnverifiedFacilityError extends AuthorizationError {
  constructor() {
    super('This facility has not been verified and cannot perform official clinical operations');
  }
}

export class UnverifiedProfessionalError extends AuthorizationError {
  constructor() {
    super('This professional has not been verified');
  }
}

export class RateLimitError extends JeevaError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends JeevaError {
  constructor(serviceName, message) {
    super(`${serviceName} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.serviceName = serviceName;
  }
}

export class InvalidOperationError extends JeevaError {
  constructor(message) {
    super(message, 400, 'INVALID_OPERATION');
  }
}

export class DuplicatePatientError extends ConflictError {
  constructor(message = 'A patient with similar details may already exist') {
    super(message);
    this.code = 'DUPLICATE_PATIENT';
  }
}

export class AmbiguousPatientIdentificationError extends JeevaError {
  constructor(message = 'Patient identification is ambiguous. Please provide additional information.') {
    super(message, 400, 'AMBIGUOUS_PATIENT_ID');
  }
}

/**
 * Error response formatter
 */
export const formatErrorResponse = (error) => {
  if (error instanceof JeevaError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        ...(error.details && { details: error.details }),
        timestamp: error.timestamp,
      },
    };
  }

  // For unexpected errors
  return {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date(),
    },
  };
};
