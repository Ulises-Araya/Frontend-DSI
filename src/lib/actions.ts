
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { findUserByDni, verifyPassword, addUser, findUserByEmail, usersDB } from './auth-helpers';
import { 
  addShift as addShiftDB, 
  getShiftsByUserId as getShiftsByUserIdDB, 
  getAllShifts as getAllShiftsDB, 
  updateShiftStatus as updateShiftStatusDB, 
  inviteUserToShiftDB,
  acceptShiftInvitationDB,
  rejectShiftInvitationDB
} from './shift-helpers';
import type { Shift, ShiftStatus, User, ActionResponse } from './types';

const LoginSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

const RegisterSchema = z.object({
  fullName: z.string().min(1, "Nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  dni: z.string().min(1, "DNI es requerido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const CreateShiftSchema = z.object({
  date: z.string().min(1, "Fecha es requerida"), // Assuming YYYY-MM-DD from FormData
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  endTime: z.string().min(1, "Hora de fin es requerida"),
  theme: z.string().min(1, "Temática es requerida"),
  notes: z.string().optional(),
  area: z.string().min(1, "Área es requerida"),
  invitedUserDnis: z.string().optional().refine(val => { // Comma-separated DNI string
    if (!val || val.trim() === "") return true;
    const dnis = val.split(',').map(d => d.trim());
    return dnis.every(dni => /^\d{7,8}$/.test(dni));
  }, "Uno o más DNIs invitados no son válidos (7-8 dígitos)."),
});

interface MockSession {
  currentUserId: string | null;
  currentUserRole: 'user' | 'admin' | null;
  currentUserDni: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mockSession: MockSession | undefined;
}

if (globalThis.mockSession === undefined) {
  globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null };
}

export async function loginUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  const { dni, password } = validatedFields.data;
  const user = findUserByDni(dni);

  if (!user || !verifyPassword(password, user.password)) {
    return { type: 'error', message: 'DNI o contraseña incorrectos.' };
  }
  
  globalThis.mockSession = {
      currentUserId: user.id,
      currentUserRole: user.role,
      currentUserDni: user.dni
  };

  if (user.role === 'admin') {
    redirect('/dashboard/admin');
  } else {
    redirect('/dashboard/user');
  }
}

export async function registerUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, email, fullName, password } = validatedFields.data;

  if (findUserByDni(dni)) {
    return { type: 'error', message: 'DNI ya registrado.' };
  }
  if (findUserByEmail(email)) {
    return { type: 'error', message: 'Email ya registrado.' };
  }

  addUser({ dni, email, fullName, password });
  return { type: 'success', message: 'Registro exitoso. Por favor, inicia sesión.' };
}

export async function getCurrentUserMock(): Promise<User | null> {
  const session = globalThis.mockSession;
  if (!session?.currentUserId) return null;
  return usersDB.find(u => u.id === session.currentUserId) || null;
}

export async function logoutUser() {
  globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null };
  redirect('/login');
}


export async function createShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = CreateShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const data = validatedFields.data;
  
  const invitedDnisArray = data.invitedUserDnis?.split(',').map(d => d.trim()).filter(d => d && d !== user.dni) || [];
  const uniqueInvitedDnisArray = Array.from(new Set(invitedDnisArray)); // Ensure unique DNIs

  if (uniqueInvitedDnisArray.some(dni => !findUserByDni(dni))) {
    return { type: 'error', message: 'Uno o más DNIs invitados no corresponden a usuarios registrados.' };
  }

  const participantCount = 1 + uniqueInvitedDnisArray.length; // Creator + unique invited users
  
  const newShift = addShiftDB({ 
    ...data, 
    creatorId: user.id, 
    invitedUserDnis: uniqueInvitedDnisArray,
    participantCount: participantCount 
  }, user);
  return { type: 'success', message: 'Turno creado exitosamente.', shift: newShift };
}

export async function getUserShifts(): Promise<Shift[]> {
  const user = await getCurrentUserMock();
  if (!user?.id) return [];
  return getShiftsByUserIdDB(user.id);
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') return [];
  return getAllShiftsDB();
}

export async function updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado' };
  const updatedShift = updateShiftStatusDB(shiftId, status);
  if (updatedShift) {
    return { type: 'success', message: 'Estado actualizado', shift: updatedShift };
  }
  return { type: 'error', message: 'Error al actualizar el turno' };
}

export async function inviteUserToShift(shiftId: string, userDniToInvite: string): Promise<ActionResponse> {
   const user = await getCurrentUserMock();
   if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

   const result = inviteUserToShiftDB(shiftId, userDniToInvite);
   if ('error' in result) {
    return { type: 'error', message: result.error };
   }
   return { type: 'success', message: 'Usuario invitado.', shift: result };
}

export async function respondToShiftInvitation(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user || !user.dni) return { type: 'error', message: 'Usuario no autenticado o DNI no encontrado.' };

  const shiftId = formData.get('shiftId') as string;
  const response = formData.get('response') as 'accept' | 'reject';

  if (!shiftId || !response) {
    return { type: 'error', message: 'Faltan datos para responder a la invitación.' };
  }

  let result;
  if (response === 'accept') {
    result = acceptShiftInvitationDB(shiftId, user.dni);
  } else {
    result = rejectShiftInvitationDB(shiftId, user.dni);
  }

  if ('error' in result) {
    return { type: 'error', message: result.error };
  }
  
  const message = response === 'accept' ? 'Invitación aceptada.' : 'Invitación rechazada.';
  return { type: 'success', message, shift: result };
}
