import { ApiError } from '../api/mockApi.js';

export function getErrorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return 'Network problem: the request could not be completed. Please check your connection and try again.';
}
