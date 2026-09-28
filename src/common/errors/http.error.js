export default class HttpError extends Error {
  constructor(status, message, errorType = 'server_error', module = 'common', errors = []) {
    super(message);
    this.status = status;
    this.errorType = errorType;
    this.module = module;
    this.errors = errors;
  }
}
