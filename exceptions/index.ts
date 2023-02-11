class ApiError extends Error {
  status: number;
  errors: unknown[];

  constructor(status: number, message: string, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  static ServerSideError(from: string) {
    return new ApiError(500, `Something went wrong while processing: ${from}`);
  }

  static UnauthorizedError() {
    return new ApiError(401, "User is not authorized");
  }

  static BadRequest(message: string, errors = []) {
    return new ApiError(400, message, errors);
  }
}

export default ApiError;
