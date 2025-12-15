import { UserRole, UserStatus } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
