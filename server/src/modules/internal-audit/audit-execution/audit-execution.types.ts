import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from '../../auth/authenticated-user';

export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}
