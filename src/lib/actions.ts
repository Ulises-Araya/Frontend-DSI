
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { 
  findUserByDni, 
  verifyPassword, 
  addUser, 
  findUserByEmail, 
  usersDB,
  updateUserDetails,
  updateUserPassword as updateUserPasswordHelper
} from './auth-helpers';
import { 
  addShift as addShiftDB, 
  getShiftsByUserId as getShiftsByUserIdDB, 
  getAllShifts as getAllShiftsDB, 
  updateShiftStatus as updateShiftStatusDB, 
  inviteUserToShiftDB,
  acceptShiftInvitationDB,
  rejectShiftInvitationDB,
  updateShiftDetailsDB,
  cancelShiftDB
} from './shift-helpers';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse } from './types';

interface ActionResponse extends BaseActionResponse {
  user?: User; // Add user to ActionResponse for profile updates
}


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
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
  area: z.string().min(3, "Área debe tener al menos 3 caracteres"),
  invitedUserDnis: z.string().optional().refine(val => { 
    if (!val || val.trim() === "") return true;
    const dnis = val.split(',').map(d => d.trim());
    return dnis.every(dni => /^\d{7,8}$/.test(dni));
  }, "Uno o más DNIs invitados no son válidos (7-8 dígitos)."),
});

const UpdateShiftSchema = z.object({
  shiftId: z.string().min(1, "ID de turno es requerido."),
  date: z.string().min(1, "Fecha es requerida"), 
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  endTime: z.string().min(1, "Hora de fin es requerida"),
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
  area: z.string().min(3, "Área debe tener al menos 3 caracteres"),
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const UpdateProfileSchema = z.object({
  fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  profilePicture: z
    .instanceof(File)
    .optional()
    .nullable()
    .refine(file => !file || file.size <= MAX_FILE_SIZE, `El tamaño máximo de la imagen es 5MB.`)
    .refine(
      file => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
  removeProfilePicture: z.string().optional(), // 'true' or undefined
});


const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual es requerida."),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmNewPassword"],
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

  const newUser = addUser({ dni, email, fullName, password });
  return { type: 'success', message: 'Registro exitoso. Por favor, inicia sesión.', user: newUser };
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
  const uniqueInvitedDnisArray = Array.from(new Set(invitedDnisArray)); 

  if (uniqueInvitedDnisArray.some(dni => !findUserByDni(dni))) {
    return { type: 'error', message: 'Uno o más DNIs invitados no corresponden a usuarios registrados.' };
  }

  const participantCount = 1 + uniqueInvitedDnisArray.length; 
  
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
  
  const message = response === 'accept' ? 'Invitación aceptada.' : 'Respuesta actualizada.';
  return { type: 'success', message, shift: result };
}

export async function updateUserProfile(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = UpdateProfileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  
  const { fullName, email, profilePicture, removeProfilePicture } = validatedFields.data;

  if (email !== user.email) {
    const existingUserWithNewEmail = findUserByEmail(email);
    if (existingUserWithNewEmail && existingUserWithNewEmail.id !== user.id) {
      return { type: 'error', message: 'El nuevo email ya está registrado por otro usuario.', errors: { email: ['Email ya en uso.'] } };
    }
  }
  
  let profilePictureUrlToUpdate: string | null | undefined = undefined;

  if (removeProfilePicture === 'true') {
    profilePictureUrlToUpdate = null;
  } else if (profilePicture) {
    // In a real app, upload the file and get a URL. For mock, use a placeholder.
    profilePictureUrlToUpdate = `https://placehold.co/100x100/7FBC8F/FFFFFF.png?text=✓&unique=${Date.now()}`; // Added unique to force refresh
  }
  // If profilePictureUrlToUpdate remains undefined, it means no change to profile picture.

  const updatedUser = updateUserDetails(user.id, { 
    fullName, 
    email, 
    ...(profilePictureUrlToUpdate !== undefined && { profilePictureUrl: profilePictureUrlToUpdate })
  });

  if (updatedUser) {
    return { type: 'success', message: 'Perfil actualizado exitosamente.', user: updatedUser };
  }
  return { type: 'error', message: 'Error al actualizar el perfil.' };
}

export async function changeUserPassword(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = validatedFields.data;

  if (!verifyPassword(currentPassword, user.password)) {
    return { type: 'error', message: 'La contraseña actual es incorrecta.', errors: { currentPassword: ['Contraseña actual incorrecta.'] } };
  }

  const success = updateUserPasswordHelper(user.id, newPassword);
  if (success) {
    return { type: 'success', message: 'Contraseña actualizada exitosamente.' };
  }
  return { type: 'error', message: 'Error al actualizar la contraseña.' };
}

export async function updateShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };
  
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = UpdateShiftSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  
  const { shiftId, ...editableData } = validatedFields.data;

  const shiftToUpdate = getAllShiftsDB().find(s => s.id === shiftId);
  if (!shiftToUpdate) return { type: 'error', message: 'Turno no encontrado.' };

  if (user.role !== 'admin' && shiftToUpdate.creatorId !== user.id) {
    return { type: 'error', message: 'No tienes permiso para editar este turno.' };
  }
   // Admins can edit cancelled shifts. Users can only edit if pending/accepted.
  if (user.role === 'user' && shiftToUpdate.creatorId === user.id && shiftToUpdate.status === 'cancelled') {
    return { type: 'error', message: 'No puedes editar un turno cancelado.' };
  }
  
  const result = updateShiftDetailsDB(shiftId, {
    date: editableData.date,
    startTime: editableData.startTime,
    endTime: editableData.endTime,
    theme: editableData.theme,
    notes: editableData.notes,
    area: editableData.area,
  });

  if ('error' in result) {
    return { type: 'error', message: result.error };
  }
  return { type: 'success', message: 'Turno actualizado exitosamente.', shift: result };
}

export async function cancelShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const shiftId = formData.get('shiftId') as string;
  if (!shiftId) return { type: 'error', message: 'ID de turno no proporcionado.' };
  
  const shiftToCancel = getAllShiftsDB().find(s => s.id === shiftId);
  if (!shiftToCancel) return { type: 'error', message: 'Turno no encontrado.' };

  if (user.role === 'admin') {
     // Admins use status change, this action is for user-initiated cancellations.
     return { type: 'error', message: 'Los administradores deben usar el cambio de estado para cancelar.' };
  }

  if (shiftToCancel.creatorId !== user.id) {
    return { type: 'error', message: 'No tienes permiso para cancelar este turno.' };
  }

  if (shiftToCancel.status === 'cancelled') {
    return { type: 'error', message: 'El turno ya está cancelado.' };
  }
  
  const cancelledShift = cancelShiftDB(shiftId);
  if (cancelledShift) {
    return { type: 'success', message: 'Turno cancelado exitosamente.', shift: cancelledShift };
  }
  return { type: 'error', message: 'Error al cancelar el turno.' };
}
