
import type { Shift, ShiftStatus, User } from './types';
import { usersDB } from './auth-helpers';

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
    participantCount: 3, 
    notes: 'Definir alcance y tecnologías.', 
    area: 'Laboratorio 3', 
    status: 'pending', 
    creatorId: '2', // Regular User
    creatorDni: '12345678',
    creatorFullName: 'Regular User',
    invitedUserDnis: [] // Initially no one, can be modified by inviteUserToShiftDB
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
    invitedUserDnis: ['12345678'] // Regular User DNI
  }
];

export function getShiftsByUserId(userId: string): Shift[] {
  const user = usersDB.find(u => u.id === userId);
  if (!user) return [];
  
  // Fetch all shifts and populate creator details
  const allShiftsWithDetails = shiftsDB.map(shift => {
    const creator = usersDB.find(u => u.id === shift.creatorId);
    return {
      ...shift,
      creatorDni: creator?.dni || shift.creatorDni, // Keep existing if creator not found (e.g., for new shifts)
      creatorFullName: creator?.fullName || shift.creatorFullName, // Keep existing
    };
  });

  return allShiftsWithDetails.filter(shift => 
    shift.creatorId === userId || shift.invitedUserDnis.includes(user.dni)
  );
}

export function getAllShifts(): Shift[] {
  return shiftsDB.map(shift => {
    const creator = usersDB.find(u => u.id === shift.creatorId);
    return {
      ...shift,
      creatorDni: creator?.dni || shift.creatorDni,
      creatorFullName: creator?.fullName || shift.creatorFullName,
    };
  });
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
  return shift;
}

export function updateShiftStatus(shiftId: string, status: ShiftStatus): Shift | undefined {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex > -1) {
    shiftsDB[shiftIndex].status = status;
    // Ensure creator details are present if not already
    const creator = usersDB.find(u => u.id === shiftsDB[shiftIndex].creatorId);
    shiftsDB[shiftIndex].creatorDni = creator?.dni || shiftsDB[shiftIndex].creatorDni;
    shiftsDB[shiftIndex].creatorFullName = creator?.fullName || shiftsDB[shiftIndex].creatorFullName;
    return shiftsDB[shiftIndex];
  }
  return undefined;
}

export function inviteUserToShiftDB(shiftId: string, userDni: string): Shift | { error: string } {
  const shiftIndex = shiftsDB.findIndex(s => s.id === shiftId);
  if (shiftIndex === -1) return { error: 'Shift not found' };

  const userToInvite = usersDB.find(u => u.dni === userDni);
  if (!userToInvite) return { error: 'User to invite not found' };
  
  if (shiftsDB[shiftIndex].invitedUserDnis.includes(userDni)) {
    return { error: 'User already invited' };
  }
  if (shiftsDB[shiftIndex].creatorDni === userDni) {
    return { error: 'Cannot invite creator' };
  }

  shiftsDB[shiftIndex].invitedUserDnis.push(userDni);
  // Ensure creator details are present if not already
  const creator = usersDB.find(u => u.id === shiftsDB[shiftIndex].creatorId);
  shiftsDB[shiftIndex].creatorDni = creator?.dni || shiftsDB[shiftIndex].creatorDni;
  shiftsDB[shiftIndex].creatorFullName = creator?.fullName || shiftsDB[shiftIndex].creatorFullName;
  return shiftsDB[shiftIndex];
}

