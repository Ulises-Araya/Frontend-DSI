
import type { Shift, ShiftStatus, User } from './types';
import { usersDB, findUserByDni } from './auth-helpers';

// In-memory store for shifts
export let shiftsDB: Shift[] = [
  { 
    id: 's1', 
    date: '2024-08-15', 
    startTime: '10:00', 
    endTime: '11:00', 
    theme: 'Consulta de Algoritmos', 
    participantCount: 1, 
    notes: 'Repasar parcial.', 
    area: 'Sala Virtual A', 
    status: 'accepted', 
    creatorId: '2', // Regular User
    creatorDni: '12345678',
    creatorFullName: 'Regular User',
    invitedUserDnis: [] 
  },
  { 
    id: 's2', 
    date: '2024-08-16', 
    startTime: '14:00', 
    endTime: '15:30', 
    theme: 'Proyecto Final - Software', 
    participantCount: 1, 
    notes: 'Definir alcance y tecnologías.', 
    area: 'Laboratorio 3', 
    status: 'pending', 
    creatorId: '2', // Regular User
    creatorDni: '12345678',
    creatorFullName: 'Regular User',
    invitedUserDnis: []
  },
  {
    id: 's3',
    date: '2024-08-20',
    startTime: '09:00',
    endTime: '10:30',
    theme: 'Revisión de Prácticas Avanzadas',
    participantCount: 2,
    notes: 'Traer dudas específicas sobre concurrencia.',
    area: 'Aula Magna',
    status: 'pending',
    creatorId: '1', // Admin User
    creatorDni: 'admin',
    creatorFullName: 'Admin User',
    invitedUserDnis: ['12345678'] // Regular User DNI invited
  }
];

// Helper to ensure creator details are populated
const populateCreatorDetails = (shift: Shift): Shift => {
  if (!shift.creatorFullName || !shift.creatorDni) {
    const creator = usersDB.find(u => u.id === shift.creatorId);
    return {
      ...shift,
      creatorDni: creator?.dni || shift.creatorDni || 'N/A',
      creatorFullName: creator?.fullName || shift.creatorFullName || 'Desconocido',
    };
  }
  return shift;
};


export function getShiftsByUserId(userId: string): Shift[] {
  const user = usersDB.find(u => u.id === userId);
  if (!user) return [];
  
  return shiftsDB
    .map(populateCreatorDetails)
    .filter(shift => 
      shift.creatorId === userId || shift.invitedUserDnis.includes(user.dni)
    );
}

export function getAllShifts(): Shift[] {
  return shiftsDB.map(populateCreatorDetails);
}

export function addShift(newShiftData: Omit<Shift, 'id' | 'status' | 'creatorFullName' | 'creatorDni'>, creator: User): Shift {
  const shift: Shift = {
    ...newShiftData,
    id: `s${shiftsDB.length + 1}`,
    status: 'pending',
    creatorDni: creator.dni,
    creatorFullName: creator.fullName,
  };
  shiftsDB.push(shift);
  return populateCreatorDetails(shift);
}

export function updateShiftStatus(shiftId: string, status: ShiftStatus): Shift | undefined {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex > -1) {
    shiftsDB[shiftIndex].status = status;
    return populateCreatorDetails(shiftsDB[shiftIndex]);
  }
  return undefined;
}

export function inviteUserToShiftDB(shiftId: string, userDniToInvite: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Shift not found' };

  const userToInvite = usersDB.find(u => u.dni === userDniToInvite);
  if (!userToInvite) return { error: 'User to invite not found' };
  
  if (shiftsDB[shiftIndex].invitedUserDnis.includes(userDniToInvite)) {
    return { error: 'User already invited' };
  }
  if (shiftsDB[shiftIndex].creatorDni === userDniToInvite) {
    return { error: 'Cannot invite creator' };
  }

  shiftsDB[shiftIndex].invitedUserDnis.push(userDniToInvite);
  shiftsDB[shiftIndex].participantCount = 1 + shiftsDB[shiftIndex].invitedUserDnis.length;
  return populateCreatorDetails(shiftsDB[shiftIndex]);
}

export function acceptShiftInvitationDB(shiftId: string, acceptingUserDni: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Shift not found' };
  
  const shift = shiftsDB[shiftIndex];
  if (!shift.invitedUserDnis.includes(acceptingUserDni)) {
    return { error: 'User was not invited to this shift or has already responded.' };
  }
  return populateCreatorDetails(shift);
}

export function rejectShiftInvitationDB(shiftId: string, rejectingUserDni: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Shift not found' };

  const shift = shiftsDB[shiftIndex];
  if (!shift.invitedUserDnis.includes(rejectingUserDni)) {
    return { error: 'User was not invited to this shift or has already responded.' };
  }

  shift.invitedUserDnis = shift.invitedUserDnis.filter(dni => dni !== rejectingUserDni);
  shift.participantCount = 1 + shift.invitedUserDnis.length;
  return populateCreatorDetails(shift);
}

export function cancelShiftDB(shiftId: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Turno no encontrado.' };
  shiftsDB[shiftIndex].status = 'cancelled';
  // Conceptual: Notify involved users
  return populateCreatorDetails(shiftsDB[shiftIndex]);
}

export function updateShiftDetailsDB(
  shiftId: string, 
  data: Omit<Shift, 'id' | 'creatorId' | 'creatorDni' | 'creatorFullName' | 'status' | 'participantCount'>
): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Turno no encontrado.' };

  const currentShift = shiftsDB[shiftIndex];
  
  const invitedDnisArray = data.invitedUserDnis.map(d => d.trim()).filter(d => d && d !== currentShift.creatorDni);
  const uniqueInvitedDnisArray = Array.from(new Set(invitedDnisArray)); 

  if (uniqueInvitedDnisArray.some(dni => !findUserByDni(dni))) {
    return { error: 'Uno o más DNIs invitados no corresponden a usuarios registrados.' };
  }

  shiftsDB[shiftIndex] = {
    ...currentShift,
    ...data,
    invitedUserDnis: uniqueInvitedDnisArray,
    participantCount: 1 + uniqueInvitedDnisArray.length,
    // Status is not changed by this function directly, only by updateShiftStatus or cancelShiftDB
  };
  // Conceptual: Notify involved users if admin made the change
  return populateCreatorDetails(shiftsDB[shiftIndex]);
}
