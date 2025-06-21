
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

export type ShiftStatus = 'pendiente' | 'aceptado' | 'cancelado';
export type InvitationStatus = 'pendiente' | 'aceptado' | 'rechazado';

export interface ShiftInvitation {
  id: string;
  userId: string;
  userDni: string;
  status: InvitationStatus;
}

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
  invitations: ShiftInvitation[];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
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

// Backend-specific types for mapping
export interface BackendUser {
  id: number;
  dni: string;
  nombre: string;
  email: string;
  rol: 'usuario' | 'admin';
}

export interface BackendRoom {
  id: number;
  nombre: string;
  capacidad: number;
}

export interface BackendInvitation {
  id: number;
  id_turno: number;
  id_usuario: number;
  estado_invitacion: InvitationStatus;
  Usuario?: BackendUser;
}

export interface BackendShift {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tematica: string;
  cantidad_integrantes: number;
  estado: ShiftStatus;
  observaciones: string;
  id_usuario: number;
  id_sala: number;
  Usuario: BackendUser;
  Sala: BackendRoom;
  InvitadosTurnos: BackendInvitation[];
}


declare global {
  var backendResetTokenInfo: { dni: string; token: string } | null;
}
