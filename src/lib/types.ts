export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  dni: string;
  fullName: string;
  email: string;
  password?: string; // Should not be sent to client, but needed for registration/login server-side
  role: UserRole;
}

export type ShiftStatus = 'pending' | 'accepted' | 'cancelled';

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  theme: string;
  participantCount: number;
  notes?: string;
  area: string;
  status: ShiftStatus;
  creatorId: string;
  creatorDni?: string; 
  creatorFullName?: string;
  invitedUserDnis: string[]; // List of DNIs of invited users
}

export interface ActionResponse {
  type: 'success' | 'error';
  message: string;
  errors?: Record<string, string[] | undefined>;
  shift?: Shift;
}
