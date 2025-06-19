
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { findUserByDni, verifyPassword, addUser, findUserByEmail, usersDB } from './auth-helpers';
import { addShift as addShiftDB, getShiftsByUserId as getShiftsByUserIdDB, getAllShifts as getAllShiftsDB, updateShiftStatus as updateShiftStatusDB, inviteUserToShiftDB } from './shift-helpers';
import type { Shift, ShiftStatus, User } from './types';

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
  date: z.string().min(1, "Fecha es requerida"),
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  endTime: z.string().min(1, "Hora de fin es requerida"),
  theme: z.string().min(1, "Temática es requerida"),
  participantCount: z.coerce.number().min(1, "Cantidad de integrantes debe ser al menos 1"),
  notes: z.string().optional(),
  area: z.string().min(1, "Área es requerida"),
  invitedUserDnis: z.string().optional(), // Comma-separated DNI strings
});


// Simulate session management (very basic)
let currentUserId: string | null = null; // THIS IS NOT SECURE FOR PRODUCTION
let currentUserRole: 'user' | 'admin' | null = null; // THIS IS NOT SECURE

export async function loginUser(prevState: any, formData: FormData) {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error' as const, message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  const { dni, password } = validatedFields.data;
  const user = findUserByDni(dni);

  if (!user || !verifyPassword(password, user.password)) {
    return { type: 'error' as const, message: 'DNI o contraseña incorrectos.' };
  }
  
  // Simulate setting session
  currentUserId = user.id;
  currentUserRole = user.role;

  if (user.role === 'admin') {
    redirect('/dashboard/admin');
  } else {
    redirect('/dashboard/user');
  }
}

export async function registerUser(prevState: any, formData: FormData) {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error' as const, message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, email, fullName, password } = validatedFields.data;

  if (findUserByDni(dni)) {
    return { type: 'error' as const, message: 'DNI ya registrado.' };
  }
  if (findUserByEmail(email)) {
    return { type: 'error' as const, message: 'Email ya registrado.' };
  }

  addUser({ dni, email, fullName, password });
  // No automatic login after registration in this mock
  return { type: 'success' as const, message: 'Registro exitoso. Por favor, inicia sesión.' };
}

export async function getCurrentUserMock(): Promise<User | null> {
  if (!currentUserId) return null;
  return usersDB.find(u => u.id === currentUserId) || null;
}

export async function logoutUser() {
  currentUserId = null;
  currentUserRole = null;
  redirect('/login');
}


export async function createShift(prevState: any, formData: FormData) {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error' as const, message: 'Usuario no autenticado.' };

  const validatedFields = CreateShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error' as const, message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const data = validatedFields.data;
  const invitedDnis = data.invitedUserDnis?.split(',').map(d => d.trim()).filter(d => d) || [];
  
  addShiftDB({ ...data, creatorId: user.id, invitedUserDnis: invitedDnis }, user);
  return { type: 'success' as const, message: 'Turno creado exitosamente.' };
}

export async function getUserShifts(): Promise<Shift[]> {
  if (!currentUserId) return [];
  return getShiftsByUserIdDB(currentUserId);
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  if (currentUserRole !== 'admin') return []; // Basic auth check
  return getAllShiftsDB();
}

export async function updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<{success: boolean, message?: string, shift?: Shift}> {
  if (currentUserRole !== 'admin') return { success: false, message: 'No autorizado' };
  const updatedShift = updateShiftStatusDB(shiftId, status);
  if (updatedShift) {
    return { success: true, shift: updatedShift };
  }
  return { success: false, message: 'Error al actualizar el turno' };
}

export async function inviteUserToShift(shiftId: string, userDniToInvite: string): Promise<{success: boolean, message?: string, shift?: Shift}> {
   const user = await getCurrentUserMock();
   if (!user) return { success: false, message: 'Usuario no autenticado.' };

   const result = inviteUserToShiftDB(shiftId, userDniToInvite);
   if ('error' in result) {
    return { success: false, message: result.error };
   }
   return { success: true, shift: result };
}
