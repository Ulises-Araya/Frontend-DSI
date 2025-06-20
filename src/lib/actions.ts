
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import {
  addShift as addShiftDB,
  getShiftsByUserId as getShiftsByUserIdDB,
  getAllShifts as getAllShiftsDB,
  updateShiftStatus as updateShiftStatusDB,
  inviteUserToShiftDB,
  acceptShiftInvitationDB,
  rejectShiftInvitationDB,
  updateShiftDetailsDB,
  cancelShiftDB as cancelShiftHelperDB
} from './shift-helpers';
import {
  getRoomsDB,
  addRoomDB,
  updateRoomDB,
  deleteRoomDB,
  findRoomById as findRoomByIdHelper
} from './room-helpers';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse, Room, UserRole } from './types';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3001/api';


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
  area: z.string().min(1, "Área es requerida"),
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
  area: z.string().min(1, "Área es requerida"),
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
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

if (globalThis.mockSession === undefined) {
  globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null, token: null };
}
if (globalThis.backendResetTokenInfo === undefined) {
  globalThis.backendResetTokenInfo = null;
}


async function fetchUserDetailsById(userId: string, token: string): Promise<User | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        console.error(`Error fetching user details: ${response.status} ${response.statusText}`);
        const errorBody = await response.text();
        console.error("Error body:", errorBody);
        return null;
    }
    const backendUser = await response.json();
    
    const frontendRole = backendUser.rol === 'usuario' ? 'user' : backendUser.rol;

    return {
      id: backendUser.id.toString(),
      dni: backendUser.dni,
      fullName: backendUser.nombre,
      email: backendUser.email,
      role: frontendRole as UserRole,
      profilePictureUrl: null, 
    };
  } catch (error) {
    console.error("fetchUserDetailsById - Exception:", error);
    return null;
  }
}

export async function loginUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  console.log(`Attempting to login. Backend URL target: ${BACKEND_BASE_URL}/auth/login`);
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, password } = validatedFields.data;

  try {
    const loginResponse = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, password }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return { type: 'error', message: loginData.error || 'Credenciales inválidas o error del servidor.' };
    }

    const { id: userId, token, rol: backendRole } = loginData;
    const frontendRole = backendRole === 'usuario' ? 'user' : backendRole;

    if (!userId || !token || !frontendRole) {
      return { type: 'error', message: 'Respuesta de login inválida desde el backend.' };
    }
    
    if (globalThis.mockSession) {
      globalThis.mockSession.currentUserId = userId.toString();
      globalThis.mockSession.token = token;
      globalThis.mockSession.currentUserRole = frontendRole;
      globalThis.mockSession.currentUserDni = dni;
    }
    
    if (frontendRole === 'admin') {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/user');
    }

  } catch (error: any) {
    console.error('Error en la comunicación con el backend durante el login:', error);
    let errorMessage = 'Error de conexión con el servidor de autenticación.';
    if (error.cause?.code === 'ECONNREFUSED') {
        errorMessage = `No se pudo conectar a ${BACKEND_BASE_URL}. Asegúrate de que el servidor backend esté corriendo.`;
    }
    return { type: 'error', message: errorMessage };
  }
}


export async function registerUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { fullName, email, dni, password } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: fullName, email, dni, password, rol: 'usuario' }),
    });
    const data = await response.json();

    if (!response.ok || response.status !== 201) {
      const fieldErrors: Record<string, string[]> = {};
      if (data.error && typeof data.error === 'string') {
        if (data.error.toLowerCase().includes('dni')) fieldErrors.dni = [data.error];
        else if (data.error.toLowerCase().includes('email')) fieldErrors.email = [data.error];
        else fieldErrors.confirmPassword = [data.error]; 
      }
      return { type: 'error', message: data.error || 'Error al registrar desde el backend.', errors: fieldErrors };
    }
    return { type: 'success', message: 'Registro exitoso. Por favor, inicia sesión.' };
  } catch (error) {
    console.error('Error en registerUser:', error);
    return { type: 'error', message: 'Error de conexión con el servidor de registro.' };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = globalThis.mockSession;
  if (!session?.currentUserId || !session.token) {
    return null;
  }
  return fetchUserDetailsById(session.currentUserId, session.token);
}

export async function logoutUser() {
  const session = globalThis.mockSession;
  if (session && session.token) {
    try {
      await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
    } catch (error) {
        console.error("Error calling backend logout, clearing session anyway.", error);
    }
  }

  if (globalThis.mockSession) {
    globalThis.mockSession.currentUserId = null;
    globalThis.mockSession.currentUserRole = null;
    globalThis.mockSession.currentUserDni = null;
    globalThis.mockSession.token = null;
  }
  globalThis.backendResetTokenInfo = null;
  redirect('/login');
}

export async function createShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = CreateShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const data = validatedFields.data;

  const invitedDnisArray = data.invitedUserDnis?.split(',').map(d => d.trim()).filter(d => d && d !== user.dni) || [];
  const uniqueInvitedDnisArray = Array.from(new Set(invitedDnisArray));

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
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return getShiftsByUserIdDB(user.id);
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return [];
  return getAllShiftsDB();
}

export async function updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<ActionResponse> {
  const adminUser = await getCurrentUser();
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
   const invitingUser = await getCurrentUser();
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
  const respondingUser = await getCurrentUser();
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

export async function updateUserProfile(prevState: ActionResponse | null, formDataObj: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user || !globalThis.mockSession?.token) return { type: 'error', message: 'Usuario no autenticado.' };

  const rawFormData = Object.fromEntries(formDataObj.entries());
  const validatedFields = UpdateProfileSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  const { fullName, email } = validatedFields.data; // profilePicture y removeProfilePicture no se envían al backend

  try {
    const backendPayload = {
        nombre: fullName,
        email: email,
    };

    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${globalThis.mockSession.token}`,
        },
        body: JSON.stringify(backendPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
        const fieldErrors: Record<string, string[]> = {};
        if (responseData.error && typeof responseData.error === 'string') {
             if (responseData.error.toLowerCase().includes('email_unique') || responseData.error.toLowerCase().includes('email ya existe')) {
                fieldErrors.email = ['Este email ya está en uso.'];
            } else if (responseData.error.toLowerCase().includes('usuarios_nombre_key')) { // Asumiendo error de BD
                fieldErrors.fullName = ['Este nombre completo ya está en uso (revisar).'];
            }
        }
        return { type: 'error', message: responseData.mensaje || responseData.error || 'Error al actualizar el perfil desde el backend.', errors: fieldErrors };
    }

    const updatedFrontendUser: User = {
        ...user,
        fullName: fullName,
        email: email,
    };
    console.log(`Notification (simulated): User profile for ${updatedFrontendUser.fullName} (ID: ${user.id}) updated via backend.`);
    return { type: 'success', message: responseData.mensaje || 'Perfil actualizado exitosamente.', user: updatedFrontendUser };

  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { type: 'error', message: 'Error de conexión al actualizar el perfil.' };
  }
}

export async function changeUserPassword(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user || !globalThis.mockSession?.token) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = validatedFields.data;

  try {
    const backendPayload = {
        password: newPassword,
    };

    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${globalThis.mockSession.token}`,
        },
        body: JSON.stringify(backendPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
        const fieldErrors: Record<string, string[]> = {};
         if (responseData.error && typeof responseData.error === 'string' && responseData.error.toLowerCase().includes('contraseña actual incorrecta')) {
            fieldErrors.currentPassword = [responseData.error];
        }
        return { type: 'error', message: responseData.mensaje || responseData.error || 'Error al cambiar la contraseña desde el backend.', errors: fieldErrors };
    }

    console.log(`Notification (simulated): Password changed for user ${user.fullName} (ID: ${user.id}) via backend.`);
    return { type: 'success', message: responseData.mensaje || 'Contraseña actualizada exitosamente.' };

  } catch (error) {
    console.error('Error en changeUserPassword:', error);
    return { type: 'error', message: 'Error de conexión al cambiar la contraseña.' };
  }
}

export async function requestPasswordReset(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ForgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { type: 'error', message: data.error || 'Error al solicitar restablecimiento de contraseña.' };
    }

    if (data.resetToken) {
        globalThis.backendResetTokenInfo = { dni: dni, token: data.resetToken };
        console.log(`Notification (simulated): Password reset requested for DNI ${dni}. Real token from backend: ${data.resetToken}.`);
    } else {
        console.warn("Backend did not return a resetToken on forgot-password success.");
         return { type: 'error', message: data.mensaje || "No se pudo obtener el token de reseteo del backend." };
    }
    
    return { type: 'success', message: data.mensaje || "Si existe una cuenta con este DNI, se han proporcionado instrucciones para restablecer la contraseña." };

  } catch (error) {
    console.error('Error en requestPasswordReset:', error);
    return { type: 'error', message: 'Error de conexión con el servidor.' };
  }
}

export async function resetPasswordWithToken(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ResetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, token, newPassword } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, token, newPassword }),
    });
    const data = await response.json();

    if (!response.ok) {
      const fieldErrors: Record<string, string[]> = {};
      if (data.error?.toLowerCase().includes('token inválido o expirado')) {
        fieldErrors.token = [data.error];
      } else if (data.error?.toLowerCase().includes('dni inválido')) {
        fieldErrors.dni = [data.error];
      }
      return { type: 'error', message: data.error || 'Error al restablecer la contraseña.', errors: fieldErrors };
    }

    console.log(`Notification (simulated): Password reset successfully for DNI ${dni} using token.`);
    globalThis.backendResetTokenInfo = null; 
    redirect('/login?reset=success');

  } catch (error) {
    console.error('Error en resetPasswordWithToken:', error);
    return { type: 'error', message: 'Error de conexión con el servidor.' };
  }
}

export async function updateShiftDetails(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = UpdateShiftSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const data = validatedFields.data;

  const updatedShift = updateShiftDetailsDB(data.shiftId, data);

  if ('error' in updatedShift) {
    return { type: 'error', message: updatedShift.error };
  }

  console.log(`Notification (simulated): Shift "${updatedShift.theme}" (ID: ${data.shiftId}) updated by ${user.fullName}.`);
  return { type: 'success', message: 'Turno actualizado exitosamente.', shift: updatedShift };
}

export async function cancelShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { type: 'error', message: 'Usuario no autenticado.' };
  }

  const shiftId = formData.get('shiftId') as string;
  if (!shiftId) {
    return { type: 'error', message: 'ID de turno es requerido.' };
  }

  const cancelledShift = cancelShiftHelperDB(shiftId);

  if (cancelledShift) {
    console.log(`Notification (simulated): Shift "${cancelledShift.theme}" (ID: ${shiftId}) cancelled by user ${user.fullName}.`);
    if (cancelledShift.creatorId !== user.id) {
        console.log(`Notification (simulated): Inform creator ${cancelledShift.creatorFullName} about cancellation.`);
    }
    if (cancelledShift.invitedUserDnis && cancelledShift.invitedUserDnis.length > 0) {
        console.log(`Notification (simulated): Inform invited users (${cancelledShift.invitedUserDnis.join(', ')}) about cancellation.`);
    }
    return { type: 'success', message: 'Turno cancelado exitosamente.', shift: cancelledShift };
  } else {
    return { type: 'error', message: 'No se pudo cancelar el turno o el turno no fue encontrado.' };
  }
}


export async function getManagedRooms(): Promise<Room[]> {
  return getRoomsDB();
}

export async function addManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const validatedFields = RoomNameSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { name } = validatedFields.data;
  const result = await addRoomDB(name);

  if ('error' in result) {
    return { type: 'error', message: result.error, errors: { name: [result.error] } };
  }
  console.log(`Admin ${user.fullName} added new room: ${result.name}`);
  return { type: 'success', message: 'Sala agregada exitosamente.', room: result };
}

export async function updateManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const validatedFields = UpdateRoomNameSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { id, name } = validatedFields.data;
  const result = await updateRoomDB(id, name);

  if ('error' in result) {
    return { type: 'error', message: result.error, errors: { name: [result.error] } };
  }
  console.log(`Admin ${user.fullName} updated room ID ${id} to name: ${result.name}`);
  return { type: 'success', message: 'Sala actualizada exitosamente.', room: result };
}

export async function deleteManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return { type: 'error', message: 'No autorizado.' };

  const id = formData.get('id') as string;
  if (!id) return { type: 'error', message: 'ID de sala es requerido.' };

  const roomToDelete = await findRoomByIdHelper(id);
  if (!roomToDelete) return { type: 'error', message: 'Sala no encontrada.' };

  const success = await deleteRoomDB(id);
  if (success) {
    console.log(`Admin ${user.fullName} deleted room: ${roomToDelete.name} (ID: ${id})`);
    const shiftsUsingRoom = (await getAllShiftsDB()).filter(shift => shift.area === roomToDelete.name && (shift.status === 'pending' || shift.status === 'accepted')).length;
    if (shiftsUsingRoom > 0) {
        console.warn(`Warning: Room "${roomToDelete.name}" was deleted but is still associated with ${shiftsUsingRoom} active/pending shift(s). Their 'area' field will retain this name unless manually updated.`);
    }
    return { type: 'success', message: 'Sala eliminada exitosamente.' };
  }
  return { type: 'error', message: 'Error al eliminar la sala.' };
}

export async function findUserByDni(dni: string): Promise<User | null> {
    const session = globalThis.mockSession;
    if (!session?.token) {
      return null;
    }
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/usuarios/dni/${dni}`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        if (!response.ok) {
            return null;
        }
        const backendUser = await response.json();
        return {
            id: backendUser.id.toString(),
            dni: backendUser.dni,
            fullName: backendUser.nombre,
            email: backendUser.email,
            role: backendUser.rol as UserRole,
            profilePictureUrl: null, 
        };
    } catch (error) {
        console.error(`Error en findUserByDni para DNI ${dni}:`, error);
        return null;
    }
}

    