export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
