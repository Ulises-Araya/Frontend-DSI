
export type UserRole = 'user' | 'admin';

export interface User {
  id: string; // En el backend es INTEGER, pero se manejará como string en el frontend.
  dni: string;
  fullName: string; // Corresponde a 'nombre' en el backend
  email: string;
  password?: string; // Solo para envío, no se almacena en frontend post-login
  role: UserRole;     // Corresponde a 'rol' en el backend
  profilePictureUrl?: string | null; // Frontend-only concept for now
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
  user?: User; // Puede contener datos del usuario actualizados o logueados
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
  // eslint-disable-next-line no-var
  var mockSession: { 
    currentUserId: string | null; 
    currentUserRole: UserRole | null; 
    currentUserDni: string | null;
    token?: string | null; // Para almacenar el JWT
  } | undefined;
}
