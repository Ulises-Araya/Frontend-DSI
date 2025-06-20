
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  dni: string;
  fullName: string;
  email: string;
  password?: string; 
  role: UserRole;
  profilePictureUrl?: string | null;
}

export type ShiftStatus = 'pending' | 'accepted' | 'cancelled';

export interface Shift {
  id: string;
  date: string; 
  startTime: string; 
  endTime: string; 
  theme: string;
  participantCount: number;
  notes?: string;
  area: string; // This will now correspond to a managed Room's name
  status: ShiftStatus;
  creatorId: string;
  creatorDni?: string; 
  creatorFullName?: string;
  invitedUserDnis: string[]; 
}

export interface Room {
  id: string;
  name: string;
}

export interface ActionResponse {
  type: 'success' | 'error';
  message: string;
  errors?: Record<string, string[] | undefined>;
  shift?: Shift;
  user?: User;
  room?: Room;
  rooms?: Room[];
}

export interface EditShiftFormProps {
  shift: Shift;
  availableRooms: Room[];
  onShiftUpdated: () => void;
  setOpen: (open: boolean) => void;
}

declare global {
  // eslint-disable-next-line no-var
  var mockPasswordResetTokens: Record<string, { token: string, expires: number }>;
  // eslint-disable-next-line no-var
  var mockLastGeneratedToken: { dni: string; token: string } | null;
}
