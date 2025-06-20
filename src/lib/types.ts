
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
  area: string; 
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
  // var mockPasswordResetTokens: Record<string, { token: string, expires: number }>; // Ya no se usa
  // eslint-disable-next-line no-var
  // var mockLastGeneratedToken: { dni: string; token: string } | null; // Reemplazado por backendResetTokenInfo
  // eslint-disable-next-line no-var
  var backendResetTokenInfo: { dni: string; token: string } | null; // Para pasar el token real del backend a la UI
  // eslint-disable-next-line no-var
  var mockSession: { 
    currentUserId: string | null; 
    currentUserRole: UserRole | null; 
    currentUserDni: string | null;
    token?: string | null; 
  } | undefined;
}
