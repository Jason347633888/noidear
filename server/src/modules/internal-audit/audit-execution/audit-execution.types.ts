import { Request as ExpressRequest } from 'express';

/**
 * Authenticated request interface with JWT user payload
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    role: string;
  };
}
