export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class GitHubError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, "GITHUB_ERROR", statusCode);
    this.name = "GitHubError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class AIError extends AppError {
  constructor(message: string = "AI analysis failed") {
    super(message, "AI_ERROR", 502);
    this.name = "AIError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

export function formatErrorResponse(error: unknown): {
  error: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes("rate limit")) {
      return {
        error: "GitHub rate limit exceeded. Try again later.",
        code: "RATE_LIMIT",
        statusCode: 429,
      };
    }
    if (error.message.includes("Not Found") || error.message.includes("404")) {
      return {
        error: "Repository not found or is private",
        code: "NOT_FOUND",
        statusCode: 404,
      };
    }

    return {
      error: error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  return {
    error: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}
