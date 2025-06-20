
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { 
  generateAndStoreMockResetToken,
  verifyAndConsumeMockResetToken
} from './auth-helpers'; // auth-helpers ahora solo tiene mocks de reset
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
  findRoomById as findRoomByIdHelper // Renombrado para evitar conflicto de nombres
} from './room-helpers';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse, Room, UserRole } from './types';

// Define la URL base de tu backend. Deberías configurarla en tus variables de entorno.
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3001';


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
  currentPassword: z.string().min(1, "Contraseña actual es requerida."), // Se mantiene para validación de UI, pero no se usa para verificar contra este backend
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

// Simulación de sesión en memoria con JWT
if (globalThis.mockSession === undefined) {
  globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null, token: null };
}

export async function loginUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, password } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { type: 'error', message: data.error || 'Error al iniciar sesión desde el backend.' };
    }
    
    // Guardar token e ID de usuario en la sesión simulada
    if (globalThis.mockSession) {
      globalThis.mockSession.currentUserId = data.id.toString(); // El backend devuelve id como INTEGER
      globalThis.mockSession.token = data.token;
      // Para obtener rol y dni, necesitaríamos otra llamada o que el login los devuelva
      // Por ahora, vamos a obtener los detalles del usuario con otra llamada
      const userDetails = await fetchUserDetailsById(data.id.toString(), data.token);
      if (userDetails) {
        globalThis.mockSession.currentUserRole = userDetails.role;
        globalThis.mockSession.currentUserDni = userDetails.dni;
      } else {
         // No se pudo obtener detalles, limpiar sesión parcial
         globalThis.mockSession = { currentUserId: null, currentUserRole: null, currentUserDni: null, token: null };
         return { type: 'error', message: 'Login exitoso pero no se pudieron obtener detalles del usuario.' };
      }
    }
    
    if (globalThis.mockSession?.currentUserRole === 'admin') {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/user');
    }
  } catch (error) {
    console.error('Error en loginUser:', error);
    return { type: 'error', message: 'Error de conexión con el servidor de autenticación.' };
  }
}

async function fetchUserDetailsById(userId: string, token: string): Promise<User | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${userId}`, { // Asumiendo que tu ruta es /usuarios/:id
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const backendUser = await response.json();
    return {
      id: backendUser.id.toString(),
      dni: backendUser.dni,
      fullName: backendUser.nombre, // Mapeo
      email: backendUser.email,
      role: backendUser.rol as UserRole, // Mapeo
      profilePictureUrl: null, // El backend no maneja esto
    };
  } catch (error) {
    console.error("Error fetching user details by ID:", error);
    return null;
  }
}


export async function registerUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  // const { dni, email, fullName, password } = validatedFields.data;
  // Actualmente, no tienes un endpoint de registro público en el backend proporcionado.
  // Esta función necesitaría llamar a un endpoint POST /usuarios (o similar) que tu backend debería exponer.
  console.warn("registerUser: No se ha implementado la llamada al endpoint de registro del backend. El backend debe proporcionar esta funcionalidad.");
  return { 
    type: 'error', 
    message: 'La funcionalidad de registro no está completamente integrada con el backend. Por favor, contacta al administrador.' 
  };
  // Ejemplo de cómo sería si tuvieras un endpoint POST /usuarios:
  /*
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios`, { // Asumiendo un endpoint POST /usuarios
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: fullName, email, dni, password, rol: 'usuario' }), // 'rol' podría ser opcional si el backend lo asigna por defecto
    });
    const data = await response.json();
    if (!response.ok) {
      return { type: 'error', message: data.error || 'Error al registrar desde el backend.' };
    }
    return { type: 'success', message: 'Registro exitoso. Por favor, inicia sesión.', user: data }; // Asumiendo que el backend devuelve el usuario creado
  } catch (error) {
    console.error('Error en registerUser:', error);
    return { type: 'error', message: 'Error de conexión con el servidor de registro.' };
  }
  */
}

export async function getCurrentUser(): Promise<User | null> {
  const session = globalThis.mockSession;
  if (!session?.currentUserId || !session.token) {
    console.log("getCurrentUser: No hay ID de usuario o token en sesión.");
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${session.currentUserId}`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    if (response.status === 401 || response.status === 403) { // Token inválido o expirado
      console.log("getCurrentUser: Token inválido o expirado. Limpiando sesión.");
      await logoutUser(); // Limpiar sesión y redirigir
      return null;
    }
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`getCurrentUser: Error del backend - Status: ${response.status}, Body: ${errorData}`);
      return null;
    }

    const backendUser = await response.json();
    // Mapear campos del backend a la interfaz User del frontend
    const frontendUser: User = {
      id: backendUser.id.toString(),
      dni: backendUser.dni,
      fullName: backendUser.nombre, 
      email: backendUser.email,
      role: backendUser.rol as UserRole,
      profilePictureUrl: session.currentUserId === "1" ? null : session.currentUserId === "2" ? null : null // Mantener la lógica de profilePictureUrl del frontend por ahora
    };
     // Actualizar DNI y Rol en la sesión si es necesario (por si cambiaron)
    if (globalThis.mockSession) {
        globalThis.mockSession.currentUserDni = frontendUser.dni;
        globalThis.mockSession.currentUserRole = frontendUser.role;
    }
    return frontendUser;
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return null;
  }
}

export async function logoutUser() {
  if (globalThis.mockSession) {
    globalThis.mockSession.currentUserId = null;
    globalThis.mockSession.currentUserRole = null;
    globalThis.mockSession.currentUserDni = null;
    globalThis.mockSession.token = null;
  }
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
  
  // La lógica de validación de DNIs invitados debe ahora verificar contra el backend si es necesario,
  // o asumir que el frontend ya lo hizo (por ejemplo, si hay un buscador de usuarios).
  // Por simplicidad, mantendremos la validación de formato del DNI aquí.
  const invitedDnisArray = data.invitedUserDnis?.split(',').map(d => d.trim()).filter(d => d && d !== user.dni) || [];
  const uniqueInvitedDnisArray = Array.from(new Set(invitedDnisArray)); 

  // Aquí podrías añadir una llamada al backend GET /dni/:dni para cada DNI invitado para verificar existencia.
  // Por ahora, se omite para simplificar.
  // if (uniqueInvitedDnisArray.some(dni => !findUserByDni(dni))) { // Esta función ya no existe localmente
  //   return { type: 'error', message: 'Uno o más DNIs invitados no corresponden a usuarios registrados.' };
  // }

  const participantCount = 1 + uniqueInvitedDnisArray.length; 
  
  const newShift = addShiftDB({ 
    ...data, 
    creatorId: user.id, 
    invitedUserDnis: uniqueInvitedDnisArray,
    participantCount: participantCount 
  }, user); // addShiftDB ahora necesita el objeto User completo

  console.log(`Notification (simulated): Shift "${newShift.theme}" created by ${user.fullName}. Area: ${newShift.area}`);
  if (uniqueInvitedDnisArray.length > 0) {
    console.log(`Notification (simulated): Inform invited users (${uniqueInvitedDnisArray.join(', ')}) about new shift invitation for "${newShift.theme}".`);
  }

  return { type: 'success', message: 'Turno creado exitosamente.', shift: newShift };
}

export async function getUserShifts(): Promise<Shift[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];
  // Esta función sigue usando la lógica local de shift-helpers.ts.
  // Si los turnos también se gestionan en el backend, esto debería cambiar.
  return getShiftsByUserIdDB(user.id);
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') return [];
  // Esta función sigue usando la lógica local de shift-helpers.ts.
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

   // Aquí deberías verificar si userDniToInvite existe llamando a GET /usuarios/dni/:dni de tu backend.
   // Por ahora, se omite para simplificar.

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

  // No enviar profilePicture al backend ya que no lo maneja.
  // Extraer campos que sí van al backend.
  const rawFormData = Object.fromEntries(formDataObj.entries());
  const validatedFields = UpdateProfileSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  
  const { fullName, email } = validatedFields.data; // profilePicture y removeProfilePicture se ignoran para el backend

  try {
    const backendPayload = {
        nombre: fullName, // Mapeo
        email: email,
    };

    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, { // Asumiendo que tu ruta es /usuarios/:id
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${globalThis.mockSession.token}`,
        },
        body: JSON.stringify(backendPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
        // Intentar obtener errores específicos del backend si los hay
        const fieldErrors: Record<string, string[]> = {};
        if (responseData.error && typeof responseData.error === 'string' && responseData.error.toLowerCase().includes('email_unique')) {
            fieldErrors.email = ['Este email ya está en uso.'];
        }
        return { type: 'error', message: responseData.mensaje || responseData.error || 'Error al actualizar el perfil desde el backend.', errors: fieldErrors };
    }
    
    // El backend devuelve 'mensaje', no el objeto usuario actualizado.
    // Por lo tanto, tenemos que reconstruir el objeto usuario o volver a obtenerlo.
    // Para una mejor UX, reconstruimos con los datos enviados y mantenemos el profilePictureUrl del frontend.
    const updatedFrontendUser: User = {
        ...user,
        fullName: fullName,
        email: email,
        // profilePictureUrl se mantiene como estaba en el frontend (no se actualiza desde este backend)
    };
    console.log(`Notification (simulated): User profile for ${updatedFrontendUser.fullName} (ID: ${user.id}) updated via backend.`);
    return { type: 'success', message: responseData.mensaje || 'Perfil actualizado exitosamente.', user: updatedFrontendUser };

  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { type: 'error', message: 'Error de conexión al actualizar el perfil.' };
  }
}

export async function changeUserPassword(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser(); // Esto obtiene el usuario actual autenticado
  if (!user || !globalThis.mockSession?.token) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  // La contraseña actual (currentPassword) no se envía al backend PUT /:id para el cambio de contraseña,
  // ya que ese endpoint solo toma la nueva contraseña. La verificación de la contraseña actual
  // debería ocurrir en un endpoint dedicado o como parte de la lógica de este si el backend lo soportara.
  const { newPassword } = validatedFields.data;

  try {
    const backendPayload = {
        password: newPassword, // El backend se encargará de hashearla con el hook
    };

    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, { // Asumiendo ruta /usuarios/:id
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${globalThis.mockSession.token}`,
        },
        body: JSON.stringify(backendPayload),
    });
    
    const responseData = await response.json();

    if (!response.ok) {
        return { type: 'error', message: responseData.mensaje || responseData.error || 'Error al cambiar la contraseña desde el backend.' };
    }
    
    console.log(`Notification (simulated): Password changed for user ${user.fullName} (ID: ${user.id}) via backend.`);
    return { type: 'success', message: responseData.mensaje || 'Contraseña actualizada exitosamente.' };

  } catch (error) {
    console.error('Error en changeUserPassword:', error);
    return { type: 'error', message: 'Error de conexión al cambiar la contraseña.' };
  }
}

// --- Password Reset Actions (MOCK - SIN INTEGRACIÓN DE BACKEND TODAVÍA) ---
export async function requestPasswordReset(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ForgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni } = validatedFields.data;
  
  // En una implementación real, verificarías si el DNI existe en tu backend aquí.
  // const userExists = await checkUserExistsByDni(dni);
  // if (!userExists) {
  //   return { type: 'success', message: "Si existe una cuenta con este DNI, se ha enviado un (simulado) enlace para restablecer la contraseña." };
  // }

  const token = generateAndStoreMockResetToken(dni); // Sigue siendo mock
  if (!token) {
    return { type: 'error', message: "No se pudo generar el token de restablecimiento (mock). Inténtalo de nuevo." };
  }
  
  globalThis.mockLastGeneratedToken = { dni: dni, token }; // Sigue siendo mock
  console.log(`Notification (simulated): Password reset requested for DNI ${dni}. Mock token: ${token}.`);

  return { type: 'success', message: "Si existe una cuenta con este DNI, se ha enviado un (simulado) enlace para restablecer la contraseña." };
}

export async function resetPasswordWithToken(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = ResetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, token, newPassword } = validatedFields.data;

  // Lógica de mock para verificar y consumir token
  if (!verifyAndConsumeMockResetToken(dni, token)) {
    return { type: 'error', message: "Token (mock) inválido o expirado. Por favor, solicita un nuevo restablecimiento.", errors: { token: ["Token inválido o expirado."] }};
  }

  // En una implementación real, aquí llamarías a tu endpoint de backend para resetear la contraseña con el DNI y el nuevo password.
  // const success = await callBackendToResetPassword(dni, newPassword, token); // Necesitarías un token de reset del backend
  // if (success) {
  //   redirect('/login?reset=success');
  // }
  console.warn("resetPasswordWithToken: Usando lógica de mock. El backend debe proveer un endpoint para esto.");
  return { type: 'error', message: "Funcionalidad de reseteo de contraseña con backend no implementada." };
}


// --- Room Management Actions (sin cambios, ya usan helpers locales) ---
export async function getManagedRooms(): Promise<Room[]> {
  return getRoomsDB(); // Asume que room-helpers es async si es necesario
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

// Funciones para obtener información del usuario para el frontend (ej. ShiftCard)
// Estas podrían ser reemplazadas o complementadas por llamadas directas al backend si es necesario.
export async function findUserByDni(dni: string): Promise<User | null> {
    // Esta función ahora DEBERÍA llamar al backend.
    // Por ahora, la dejo como placeholder ya que el getCurrentUser ya está implementado.
    // Si se necesita buscar CUALQUIER usuario por DNI desde el frontend (no solo el actual),
    // se necesitaría un endpoint GET /usuarios/dni/:dni y la lógica de fetch aquí.
    const session = globalThis.mockSession;
    if (!session?.token) {
      console.warn("findUserByDni: No hay token en sesión para autenticar la llamada al backend.");
      return null;
    }
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/usuarios/dni/${dni}`, { // Asumiendo esta ruta en tu backend
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        if (!response.ok) {
            console.error(`findUserByDni: Error ${response.status} al buscar DNI ${dni}`);
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
