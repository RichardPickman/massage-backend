class ApiError extends Error {
    status;
    message;
    // Optional machine-readable code for the responses the client translates.
    // The message stays the human/API contract; this is only for the UI.
    code?: string;

    constructor(status: number, message: string, code?: string) {
        super();

        this.status = status;
        this.message = message;
        this.code = code;
    }

    static badRequest(message: string, code?: string) {
        return new ApiError(404, message, code)
    }

    static internal(message: string, code?: string) {
        return new ApiError(500, message, code)
    }

    static forbidden(message: string, code?: string) {
        return new ApiError(403, message, code)
    }

    static tooManyRequests(message: string, code?: string) {
        return new ApiError(429, message, code)
    }
}

export default ApiError;
