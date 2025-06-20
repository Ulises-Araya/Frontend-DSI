
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
  updateUserPassword as updateUserPasswordHelper,
  generateAndStoreMockResetToken,
  verifyAndConsumeMockResetToken,
  updateUserPasswordByDni
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
import {
  getRoomsDB,
  addRoomDB,
  updateRoomDB,
  deleteRoomDB,
  findRoomById
} from './room-helpers';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse, Room } from './types';

interface ActionResponse extends BaseActionResponse {
  user?: User; 
  room?: Room;
  rooms?: Room[];
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
  area: z.string().min(1, "Área es requerida"), // Area must be selected
  invitedUserDnis: z.string().optional().refine(val => { 
    if (!val || val.trim() === "") return true;
    const dnis = val.split(',').map(d => d.trim());
    return dnis.every(dni => /^\d{7,8}$/.test(dni));
  }, "Uno o más DNIs invitados no son válidos (7-8 dígitos)."),
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});


const UpdateShiftSchema = z.object({
  shiftId: z.string().min(1, "ID de turno es requerido."),
  date: z.string().min(1, "Fecha es requerida"), 
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  endTime: z.string().min(1, "Hora de fin es requerida"),
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
  area: z.string().min(1, "Área es requerida"), // Area must be selected
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
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
  removeProfilePicture: z.string().optional(), 
});


const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual es requerida."),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmNewPassword"],
});

const ForgotPasswordSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
});

const ResetPasswordSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  token: z.string().min(1, "Token es requerido"),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmNewPassword"],
});

const RoomNameSchema = z.object({
  name: z.string().min(3, "Nombre de la sala debe tener al menos 3 caracteres.").max(50, "Nombre de la sala no puede exceder los 50 caracteres."),
});

const UpdateRoomNameSchema = RoomNameSchema.extend({
  id: z.string().min(1, "ID de sala es requerido."),
});


interface MockSession {
  currentUserId: string | null;
  currentUserRole: 'user' | 'admin' | null;
  currentUserDni: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mockSession: MockSession | undefined;
  // eslint-disable-next-line no-var
  var mockPasswordResetTokens: Record<string, { token: string, expires: number }> | undefined;
  // eslint-disable-next-line no-var
  var mockLastGeneratedToken: { dni: string; token: string } | null | undefined;

}

if (globalThis.mockSession === undefined) {
  globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null };
}
if (globalThis.mockPasswordResetTokens === undefined) {
  globalThis.mockPasswordResetTokens = {};
}
if (globalThis.mockLastGeneratedToken === undefined) {
  globalThis.mockLastGeneratedToken = null;
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
  console.log(`Notification (simulated): New user registered - DNI: ${dni}, Email: ${email}`);
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

  console.log(`Notification (simulated): Shift "${newShift.theme}" created by ${user.fullName}. Area: ${newShift.area}`);
  if (uniqueInvitedDnisArray.length > 0) {
    console.log(`Notification (simulated): Inform invited users (${uniqueInvitedDnisArray.join(', ')}) about new shift invitation for "${newShift.theme}".`);
  }

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
  const adminUser = await getCurrentUserMock();
  if (adminUser?.role !== 'admin') return { type: 'error', message: 'No autorizado' };
  
  const updatedShift = updateShiftStatusDB(shiftId, status);
  if (updatedShift) {
    console.log(`Notification (simulated): Status of shift "${updatedShift.theme}" (ID: ${shiftId}) changed to "${status}" by admin ${adminUser.fullName}.`);
    console.log(`Notification (simulated): Inform creator (${updatedShift.creatorFullName}) and invited users (${updatedShift.invitedUserDnis.join(', ') || 'none'}) about status change.`);
    return { type: 'success', message: 'Estado actualizado', shift: updatedShift };
  }
  return { type: 'error', message: 'Error al actualizar el turno' };
}

export async function inviteUserToShift(shiftId: string, userDniToInvite: string): Promise<ActionResponse> {
   const invitingUser = await getCurrentUserMock();
   if (!invitingUser) return { type: 'error', message: 'Usuario no autenticado.' };

   const result = inviteUserToShiftDB(shiftId, userDniToInvite);
   if ('error' in result) {
    return { type: 'error', message: result.error };
   }
   console.log(`Notification (simulated): User DNI ${userDniToInvite} invited to shift "${result.theme}" (ID: ${shiftId}) by ${invitingUser.fullName}.`);
   console.log(`Notification (simulated): Send invitation to user DNI ${userDniToInvite}.`);
   return { type: 'success', message: 'Usuario invitado.', shift: result };
}

export async function respondToShiftInvitation(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const respondingUser = await getCurrentUserMock();
  if (!respondingUser || !respondingUser.dni) return { type: 'error', message: 'Usuario no autenticado o DNI no encontrado.' };

  const shiftId = formData.get('shiftId') as string;
  const response = formData.get('response') as 'accept' | 'reject';

  if (!shiftId || !response) {
    return { type: 'error', message: 'Faltan datos para responder a la invitación.' };
  }

  let result;
  if (response === 'accept') {
    result = acceptShiftInvitationDB(shiftId, respondingUser.dni);
  } else {
    result = rejectShiftInvitationDB(shiftId, respondingUser.dni);
  }

  if ('error' in result) {
    return { type: 'error', message: result.error };
  }
  
  const shiftDetails = result; 
  const actionText = response === 'accept' ? 'accepted' : 'declined/left';
  console.log(`Notification (simulated): User ${respondingUser.fullName} ${actionText} invitation to shift "${shiftDetails.theme}" (ID: ${shiftId}).`);
  console.log(`Notification (simulated): Inform creator (${shiftDetails.creatorFullName}) about this response.`);
  
  const successMessage = response === 'accept' ? 'Invitación aceptada.' : 'Respuesta actualizada.';
  return { type: 'success', message: successMessage, shift: shiftDetails };
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
    profilePictureUrlToUpdate = `https://placehold.co/100x100/7FBC8F/FFFFFF.png?text=✓&unique=${Date.now()}`; 
  }

  const updatedUser = updateUserDetails(user.id, { 
    fullName, 
    email, 
    ...(profilePictureUrlToUpdate !== undefined && { profilePictureUrl: profilePictureUrlToUpdate })
  });

  if (updatedUser) {
    console.log(`Notification (simulated): User profile for ${updatedUser.fullName} (ID: ${user.id}) updated.`);
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
    console.log(`Notification (simulated): Password changed for user ${user.fullName} (ID: ${user.id}).`);
    return { type: 'success', message: 'Contraseña actualizada exitosamente.' };
  }
  return { type: 'error', message: 'Error al actualizar la contraseña.' };
}

export async function updateShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const currentUser = await getCurrentUserMock();
  if (!currentUser) return { type: 'error', message: 'Usuario no autenticado.' };
  
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = UpdateShiftSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  
  const { shiftId, ...editableData } = validatedFields.data;

  const shiftToUpdate = getAllShiftsDB().find(s => s.id === shiftId);
  if (!shiftToUpdate) return { type: 'error', message: 'Turno no encontrado.' };

  const isCreator = shiftToUpdate.creatorId === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  if (!isAdmin && !isCreator) {
    return { type: 'error', message: 'No tienes permiso para editar este turno.' };
  }
 
  if (!isAdmin && isCreator && shiftToUpdate.status === 'cancelled') {
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

  const updatedShift = result;
  console.log(`Notification (simulated): Shift "${updatedShift.theme}" (ID: ${shiftId}) updated by ${currentUser.fullName}. Area: ${updatedShift.area}`);
  
  const partiesToNotify = new Set<string>();
  if (updatedShift.creatorDni && updatedShift.creatorDni !== currentUser.dni) {
      partiesToNotify.add(`Creator DNI: ${updatedShift.creatorDni}`);
  }
  updatedShift.invitedUserDnis.forEach(dni => {
    if (dni !== currentUser.dni) partiesToNotify.add(`Invited DNI: ${dni}`);
  });
  
  if (partiesToNotify.size > 0) {
    console.log(`Notification (simulated): Inform involved parties (${Array.from(partiesToNotify).join(', ')}) about the update to shift "${updatedShift.theme}".`);
  }

  return { type: 'success', message: 'Turno actualizado exitosamente.', shift: updatedShift };
}

export async function cancelShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  if (user.role === 'admin') {
    return { type: 'error', message: 'Los administradores deben usar el cambio de estado para cancelar.' };
  }

  const shiftId = formData.get('shiftId') as string;
  if (!shiftId) return { type: 'error', message: 'ID de turno no proporcionado.' };
  
  const shiftToCancel = getAllShiftsDB().find(s => s.id === shiftId);
  if (!shiftToCancel) return { type: 'error', message: 'Turno no encontrado.' };


  if (shiftToCancel.creatorId !== user.id) {
    return { type: 'error', message: 'No tienes permiso para cancelar este turno.' };
  }

  if (shiftToCancel.status === 'cancelled') {
    return { type: 'error', message: 'El turno ya está cancelado.' };
  }
  
  const cancelledShift = cancelShiftDB(shiftId);
  if (cancelledShift) {
    console.log(`Notification (simulated): Shift "${cancelledShift.theme}" (ID: ${shiftId}) cancelled by creator ${user.fullName}.`);
    if (cancelledShift.invitedUserDnis.length > 0) {
        console.log(`Notification (simulated): Inform invited users (${cancelledShift.invitedUserDnis.join(', ')}) about the cancellation of shift "${cancelledShift.theme}".`);
    }
    return { type: 'success', message: 'Turno cancelado exitosamente.', shift: cancelledShift };
  }
  return { type: 'error', message: 'Error al cancelar el turno.' };
}

export async function requestPasswordReset(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ForgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni } = validatedFields.data;
  const user = findUserByDni(dni);

  if (!user) {
    return { type: 'success', message: "Si existe una cuenta con este DNI, se ha enviado un (simulado) enlace para restablecer la contraseña." };
  }

  const token = generateAndStoreMockResetToken(dni);
  if (!token) {
    return { type: 'error', message: "No se pudo generar el token de restablecimiento. Inténtalo de nuevo." };
  }
  
  globalThis.mockLastGeneratedToken = { dni: user.dni, token };
  console.log(`Notification (simulated): Password reset requested for DNI ${dni}. Mock token: ${token}. (Simulated email sent to ${user.email})`);

  return { type: 'success', message: "Si existe una cuenta con este DNI, se ha enviado un (simulado) enlace para restablecer la contraseña." };
}

export async function resetPasswordWithToken(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ResetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, token, newPassword } = validatedFields.data;

  if (!verifyAndConsumeMockResetToken(dni, token)) {
    return { type: 'error', message: "Token inválido o expirado. Por favor, solicita un nuevo restablecimiento de contraseña.", errors: { token: ["Token inválido o expirado."] }};
  }

  const success = updateUserPasswordByDni(dni, newPassword);
  if (success) {
    const user = findUserByDni(dni);
    console.log(`Notification (simulated): Password successfully reset for DNI ${dni}. (Simulated confirmation email sent to ${user?.email})`);
    redirect('/login?reset=success');
  }
  return { type: 'error', message: "No se pudo restablecer la contraseña. Inténtalo de nuevo." };
}

// Room Management Actions
export async function getManagedRooms(): Promise<Room[]> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') {
    // Non-admins should not call this, but if they do, return empty or throw error
    // For now, let's allow any authenticated user to fetch rooms for the Select components in shift forms.
    // The creation/edit/delete of rooms will be strictly admin-only.
  }
  return getRoomsDB();
}

export async function addManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const validatedFields = RoomNameSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { name } = validatedFields.data;
  const result = addRoomDB(name);

  if ('error' in result) {
    return { type: 'error', message: result.error, errors: { name: [result.error] } };
  }
  console.log(`Admin ${user.fullName} added new room: ${result.name}`);
  return { type: 'success', message: 'Sala agregada exitosamente.', room: result };
}

export async function updateManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const validatedFields = UpdateRoomNameSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { id, name } = validatedFields.data;
  const result = updateRoomDB(id, name);

  if ('error' in result) {
    return { type: 'error', message: result.error, errors: { name: [result.error] } };
  }
  console.log(`Admin ${user.fullName} updated room ID ${id} to name: ${result.name}`);
  return { type: 'success', message: 'Sala actualizada exitosamente.', room: result };
}

export async function deleteManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUserMock();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const id = formData.get('id') as string;
  if (!id) return { type: 'error', message: 'ID de sala es requerido.' };

  const roomToDelete = findRoomById(id);
  if (!roomToDelete) return { type: 'error', message: 'Sala no encontrada.' };

  const success = deleteRoomDB(id);
  if (success) {
    console.log(`Admin ${user.fullName} deleted room: ${roomToDelete.name} (ID: ${id})`);
    // Consider: Add logic to check if room is in use by active/future shifts.
    // For now, we just log.
    const shiftsUsingRoom = getAllShiftsDB().filter(shift => shift.area === roomToDelete.name && (shift.status === 'pending' || shift.status === 'accepted')).length;
    if (shiftsUsingRoom > 0) {
        console.warn(`Warning: Room "${roomToDelete.name}" was deleted but is still associated with ${shiftsUsingRoom} active/pending shift(s). Their 'area' field will retain this name unless manually updated.`);
    }
    return { type: 'success', message: 'Sala eliminada exitosamente.' };
  }
  return { type: 'error', message: 'Error al eliminar la sala.' };
}
