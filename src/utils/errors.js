class AppError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}

const notFound = (msg = 'Not Found') => new AppError(msg, 404);
const badRequest = (msg = 'Bad Request') => new AppError(msg, 400);
const unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401);
const forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
const conflict = (msg = 'Conflict') => new AppError(msg, 409);

module.exports = { AppError, notFound, badRequest, unauthorized, forbidden, conflict };