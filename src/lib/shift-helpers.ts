
import type { Shift, ShiftStatus, User } from './types';
// import { usersDB, findUserByDni } from './auth-helpers'; // Removed this line

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
  // The mock shiftsDB now consistently includes creatorDni and creatorFullName.
  // This function can ensure defaults if they were somehow missing.
  return {
    ...shift,
    creatorDni: shift.creatorDni || 'DNI Desconocido',
    creatorFullName: shift.creatorFullName || 'Nombre Desconocido',
  };
};


export function getShiftsByUserId(userId: string): Shift[] {
  // Need to find the user's DNI to filter invited shifts if the backend doesn't do this.
  // For now, this part relies on the frontend's knowledge of the user's DNI passed to it.
  // This function might need more info or adjustment if integrated with a backend for shifts.
  // Assuming user object with DNI is available or passed if necessary.
  const userDni = globalThis.mockSession?.currentUserDni; // Example of getting current user's DNI

  return shiftsDB
    .map(populateCreatorDetails)
    .filter(shift => 
      shift.creatorId === userId || (userDni && shift.invitedUserDnis.includes(userDni))
    );
}

export function getAllShifts(): Shift[] {
  return shiftsDB.map(populateCreatorDetails);
}

export function addShift(newShiftData: Omit<Shift, 'id' | 'status' | 'creatorFullName' | 'creatorDni'>, creator: User): Shift {
  const shift: Shift = {
    ...newShiftData,
    id: `s${shiftsDB.length + 1}${Date.now()}`, // Ensure more unique ID
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

  // In a real scenario, we'd check if userDniToInvite exists in the backend.
  // For this mock, we assume the DNI is valid if provided.
  
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
  // No change to participant count or invitedUserDnis list on accept, user is already in.
  return populateCreatorDetails(shift);
}

export function rejectShiftInvitationDB(shiftId: string, rejectingUserDni: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Shift not found' };

  const shift = shiftsDB[shiftIndex];
  // Check if user was actually invited before attempting to remove
  if (!shift.invitedUserDnis.includes(rejectingUserDni)) {
     // If the user is not on the list, it might mean they already declined or were removed.
     // Depending on desired behavior, this could be an error or a silent success.
     // For now, let's just return the shift as is, or you could return an error:
     // return { error: 'User not found in invitation list.' };
  }


  shift.invitedUserDnis = shift.invitedUserDnis.filter(dni => dni !== rejectingUserDni);
  shift.participantCount = 1 + shift.invitedUserDnis.length;
  return populateCreatorDetails(shift);
}

export function updateShiftDetailsDB(
  shiftId: string, 
  data: Pick<Shift, 'date' | 'startTime' | 'endTime' | 'theme' | 'notes' | 'area'>
): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Turno no encontrado.' };

  const currentShift = shiftsDB[shiftIndex];
  
  shiftsDB[shiftIndex] = {
    ...currentShift,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    theme: data.theme,
    notes: data.notes,
    area: data.area,
  };
  return populateCreatorDetails(shiftsDB[shiftIndex]);
}

export function cancelShiftDB(shiftId: string): Shift | undefined {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex > -1) {
    shiftsDB[shiftIndex].status = 'cancelled';
    return populateCreatorDetails(shiftsDB[shiftIndex]);
  }
  return undefined;
}
