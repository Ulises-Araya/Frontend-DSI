
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse, Room, UserRole, BackendShift, BackendRoom, BackendInvitation, InvitationStatus, BackendUser } from './types';
import { createSupabaseServerClient } from './supabase/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3000/api';

interface ActionResponse extends BaseActionResponse {
  user?: User;
  room?: Room;
  rooms?: Room[];
  shift?: Shift;
}

// --- SESSION HELPERS ---

async function getSessionData(): Promise<User | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session-data');
    if (!sessionCookie) return null;
    try {
        return JSON.parse(sessionCookie.value) as User;
    } catch {
        // Si la cookie está malformada, la eliminamos
        cookieStore.delete('session-data');
        return null;
    }
}

// --- AUTH ACTIONS ---

export async function loginUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({
    dni: z.string().min(1, "DNI es requerido"),
    password: z.string().min(1, "Contraseña es requerida"),
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, password } = validatedFields.data;

  let loginResponseData;
  try {
    console.log(`Attempting to login. Backend URL target: ${BACKEND_BASE_URL}/auth/login`);
    const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, password }),
    });

    loginResponseData = await response.json();

    if (!response.ok) {
      return { type: 'error', message: loginResponseData.error || 'Credenciales inválidas o error del servidor.' };
    }
    if (!loginResponseData.id) {
      return { type: 'error', message: 'El backend no devolvió un ID de usuario.' };
    }
  } catch (error: any) {
    let errorMessage = 'Error de conexión con el servidor de autenticación.';
    if (error.cause?.code === 'ECONNREFUSED') {
        errorMessage = `No se pudo conectar a ${BACKEND_BASE_URL}. Asegúrate de que el servidor backend esté corriendo.`;
    }
    return { type: 'error', message: errorMessage };
  }
  
  let userDetails: BackendUser;
  try {
    const userDetailsResponse = await fetch(`${BACKEND_BASE_URL}/usuarios/${loginResponseData.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const userDetailsJson = await userDetailsResponse.json();

    if (!userDetailsResponse.ok) {
        return { type: 'error', message: userDetailsJson.error || 'No se pudieron obtener los detalles del usuario después del login.' };
    }
    userDetails = userDetailsJson as BackendUser;
  } catch(error) {
     console.error('Error fetching user details after login:', error);
     return { type: 'error', message: 'Error al obtener detalles del usuario.' };
  }

  const frontendRole = userDetails.rol === 'usuario' ? 'user' : userDetails.rol;
  const sessionData: User = {
      id: userDetails.id.toString(),
      dni: userDetails.dni,
      fullName: userDetails.nombre,
      email: userDetails.email,
      role: frontendRole as UserRole,
      profilePictureUrl: userDetails.foto_url,
  };

  try {
    const cookieStore = await cookies();
    cookieStore.set('session-data', JSON.stringify(sessionData), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
    });
  } catch(e) {
    console.error("Error setting cookie", e);
    return { type: 'error', message: 'No se pudo establecer la sesión del usuario.'}
  }

  if (sessionData.role === 'admin') {
    redirect('/dashboard/admin');
  } else {
    redirect('/dashboard/user');
  }
}


export async function registerUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({
    fullName: z.string().min(1, "Nombre completo es requerido"),
    email: z.string().email("Email inválido"),
    dni: z.string().min(1, "DNI es requerido"),
    password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { fullName, email, dni, password } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: fullName, email, dni, password, rol: 'usuario' }),
    });
    const data = await response.json();

    if (!response.ok || response.status !== 201) {
      const fieldErrors: Record<string, string[]> = {};
      if (data.error && typeof data.error === 'string') {
        if (data.error.toLowerCase().includes('dni') || data.error.toLowerCase().includes('email')) fieldErrors.dni = [data.error];
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
    return await getSessionData();
}

export async function logoutUser() {
  try {
    await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
  } catch (error) {
      console.error("Error calling backend logout, clearing session anyway.", error);
  }
  
  const cookieStore = await cookies();
  cookieStore.delete('session-data');
  redirect('/login');
}

export async function updateUserProfile(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const session = await getSessionData();
  if (!session?.id) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = z.object({
    fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres."),
    email: z.string().email("Email inválido."),
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nombre: validatedFields.data.fullName, email: validatedFields.data.email }),
    });

    const responseData = await response.json();

    if (!response.ok) {
        return { type: 'error', message: responseData.error || 'Error al actualizar el perfil.' };
    }

    const updatedUser: User = {
        ...session,
        fullName: validatedFields.data.fullName,
        email: validatedFields.data.email,
    };

    const cookieStore = await cookies();
    cookieStore.set('session-data', JSON.stringify(updatedUser), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
    });

    return { type: 'success', message: 'Perfil actualizado exitosamente.', user: updatedUser };

  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { type: 'error', message: 'Error de conexión al actualizar el perfil.' };
  }
}

export async function updateProfilePicture(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const session = await getSessionData();
  if (!session?.id) return { type: 'error', message: 'Usuario no autenticado.' };

  const file = formData.get('profilePicture') as File;
  if (!file || file.size === 0) {
    return { type: 'error', message: 'No se ha seleccionado ningún archivo.' };
  }

  const supabase = await createSupabaseServerClient();
  const filePath = `public/fotourl/user-${session.id}-${Date.now()}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('fotourl') // Make sure this is your actual bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      return { type: 'error', message: `Error al subir la imagen: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('fotourl')
      .getPublicUrl(filePath);
    
    if (!publicUrlData.publicUrl) {
      return { type: 'error', message: 'No se pudo obtener la URL pública de la imagen.' };
    }
    
    const newProfilePictureUrl = publicUrlData.publicUrl;
    
    // Update backend
    const backendResponse = await fetch(`${BACKEND_BASE_URL}/usuarios/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ foto_url: newProfilePictureUrl }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return { type: 'error', message: errorData.error || 'Error al guardar la URL en el backend.' };
    }

    // Update session cookie
    const updatedUser: User = {
      ...session,
      profilePictureUrl: newProfilePictureUrl,
    };
    const cookieStore = await cookies();
    cookieStore.set('session-data', JSON.stringify(updatedUser), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
    });
    
    return { type: 'success', message: 'Foto de perfil actualizada.', user: updatedUser };

  } catch (error) {
    console.error('Error en updateProfilePicture:', error);
    return { type: 'error', message: 'Ocurrió un error inesperado.' };
  }
}


export async function changeUserPassword(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const session = await getSessionData();
  if (!session?.id) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = z.object({
      currentPassword: z.string().min(1, "Contraseña actual es requerida."),
      newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres."),
      confirmNewPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmNewPassword, {
      message: "Las nuevas contraseñas no coinciden.",
      path: ["confirmNewPassword"],
  }).safeParse(Object.fromEntries(formData.entries()));
  
  if (!validatedFields.success) {
      return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { newPassword } = validatedFields.data;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: newPassword }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      return { type: 'error', message: responseData.error || 'Error al cambiar la contraseña.' };
    }
    return { type: 'success', message: 'Contraseña actualizada exitosamente.' };
  } catch (error) {
    console.error('Error en changeUserPassword:', error);
    return { type: 'error', message: 'Error de conexión.' };
  }
}

export async function requestPasswordReset(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({ dni: z.string().min(1, "DNI es requerido") }).safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: validatedFields.data.dni }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { type: 'error', message: data.error || "Error al solicitar reseteo." };
    }
    
    globalThis.backendResetTokenInfo = { dni: validatedFields.data.dni, token: data.resetToken };
    
    return { type: 'success', message: 'Si el DNI es válido, se ha generado un token de reseteo.' };
  } catch (error) {
      console.error('Error en requestPasswordReset:', error);
      return { type: 'error', message: 'Error de conexión al solicitar reseteo.' };
  }
}

export async function resetPasswordWithToken(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({
      dni: z.string().min(1, "DNI es requerido"),
      token: z.string().min(1, "Token es requerido"),
      newPassword: z.string().min(6, "La nueva contraseña es requerida."),
      confirmNewPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmNewPassword, {
      message: "Las contraseñas no coinciden.",
      path: ["confirmNewPassword"],
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  let redirectPath = '/login';
  try {
    const { dni, token, newPassword } = validatedFields.data;
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, token, newPassword }),
    });
    const data = await response.json();

    if (!response.ok) {
        return { type: 'error', message: data.error || "No se pudo restablecer la contraseña." };
    }

  } catch (error) {
    console.error('Error en resetPasswordWithToken:', error);
    return { type: 'error', message: 'Error de conexión al restablecer la contraseña.' };
  }
  
  redirect(redirectPath);
}

// --- SALA/ROOM ACTIONS ---

export async function getManagedRooms(): Promise<Room[]> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas`, {
      credentials: 'include',
    });
    if (!response.ok) return [];
    const rooms: BackendRoom[] = await response.json();
    return rooms.map(room => ({ id: room.id.toString(), name: room.nombre, capacity: room.capacidad }));
  } catch (error) {
    console.error("getManagedRooms failed:", error);
    return [];
  }
}

export async function addManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({ name: z.string().min(3), capacity: z.coerce.number().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nombre: validatedFields.data.name, capacidad: validatedFields.data.capacity }),
    });
    const newRoom = await response.json();
    if (!response.ok) {
      return { type: 'error', message: newRoom.error || "Error al crear la sala." };
    }
    return { type: 'success', message: 'Sala agregada exitosamente.' };
  } catch (error) {
    return { type: 'error', message: 'Error de conexión.' };
  }
}

export async function deleteManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id') as string;
  if (!id) return { type: 'error', message: 'ID de sala es requerido.' };

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json();
      return { type: 'error', message: data.error || "Error al eliminar la sala." };
    }
    return { type: 'success', message: 'Sala eliminada exitosamente.' };
  } catch (error) {
    return { type: 'error', message: 'Error de conexión.' };
  }
}


// --- SHIFT/TURNO ACTIONS ---

export async function createShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
    const session = await getSessionData();
    if (!session?.id) return { type: 'error', message: 'Usuario no autenticado.' };

    const validatedFields = z.object({
        date: z.string().min(1),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
        theme: z.string().min(3),
        notes: z.string().optional(),
        area: z.string().min(1, "Debe seleccionar una sala."),
        invitedUserDnis: z.string().optional(),
    }).safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
    }
    const data = validatedFields.data;
    const invitedDnis = data.invitedUserDnis?.split(',').map(d => d.trim()).filter(d => d) || [];

    try {
        const shiftPayload = {
            fecha: data.date,
            hora_inicio: data.startTime,
            hora_fin: data.endTime,
            tematica: data.theme,
            observaciones: data.notes,
            id_usuario: parseInt(session.id),
            id_sala: parseInt(data.area),
            cantidad_integrantes: 1 + invitedDnis.length,
        };

        const shiftResponse = await fetch(`${BACKEND_BASE_URL}/turnos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(shiftPayload),
        });

        const newShiftData = await shiftResponse.json();
        if (!shiftResponse.ok) {
            return { type: 'error', message: newShiftData.error || 'Error al crear el turno.' };
        }

        const invitedUsers = await Promise.all(
          invitedDnis.map(dni => findUserByDni(dni))
        );
        const validInvitedUsers = invitedUsers.filter(u => u !== null) as User[];
        
        for (const invitedUser of validInvitedUsers) {
            const invitationPayload = {
                id_turno: newShiftData.id,
                id_usuario: parseInt(invitedUser.id),
                estado_invitacion: 'pendiente'
            };
            await fetch(`${BACKEND_BASE_URL}/invitados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(invitationPayload),
            });
        }
        
        return { type: 'success', message: 'Turno e invitaciones creadas exitosamente.' };

    } catch (error) {
        console.error("createShift failed:", error);
        return { type: 'error', message: 'Error de conexión al crear el turno.' };
    }
}

export async function getUserShifts(): Promise<Shift[]> {
    const session = await getSessionData();
    if (!session?.id) return [];

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/turnos/full/all`, {
             credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch shifts');
        
        const allShifts: BackendShift[] = await response.json();

        const userCreatedShifts = allShifts.filter(shift => shift.Usuario?.id.toString() === session.id);
        const userInvitedShifts = allShifts.filter(shift => 
            shift.InvitadosTurnos.some(inv => inv.Usuario?.id.toString() === session.id)
        );

        const uniqueShifts = [...userCreatedShifts, ...userInvitedShifts].reduce((acc, current) => {
            if (!acc.find(item => item.id === current.id)) {
                acc.push(current);
            }
            return acc;
        }, [] as BackendShift[]);

        return uniqueShifts.map(mapBackendShiftToFrontend);

    } catch (error) {
        console.error("getUserShifts failed:", error);
        return [];
    }
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/turnos/full/all`, {
      credentials: 'include'
    });
    if (!response.ok) return [];
    const backendShifts: BackendShift[] = await response.json();
    return backendShifts.map(mapBackendShiftToFrontend);
  } catch (error) {
    console.error("getAllShiftsAdmin failed:", error);
    return [];
  }
}

export async function updateShiftDetails(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const validatedFields = z.object({
      shiftId: z.string().min(1),
      date: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      theme: z.string().min(3),
      notes: z.string().optional(),
      area: z.string().min(1),
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
      return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { shiftId, date, startTime, endTime, theme, notes, area } = validatedFields.data;

  try {
      const payload = {
          fecha: date,
          hora_inicio: startTime,
          hora_fin: endTime,
          tematica: theme,
          observaciones: notes,
          id_sala: parseInt(area)
      };
      const response = await fetch(`${BACKEND_BASE_URL}/turnos/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
          return { type: 'error', message: data.error || 'No se pudo actualizar el turno' };
      }
      return { type: 'success', message: 'Turno actualizado' };
  } catch (error) {
      return { type: 'error', message: 'Error de conexión' };
  }
}

export async function cancelShift(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const shiftId = formData.get('shiftId') as string;
  if (!shiftId) return { type: 'error', message: 'ID de turno requerido.' };
  
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/turnos/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ estado: 'cancelado' })
      });
      const data = await response.json();
      if (!response.ok) {
          return { type: 'error', message: data.error || 'No se pudo cancelar el turno' };
      }
      return { type: 'success', message: 'Turno cancelado' };
  } catch (error) {
      return { type: 'error', message: 'Error de conexión' };
  }
}

export async function updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<ActionResponse> {
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/turnos/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ estado: status })
      });
      const data = await response.json();
      if (!response.ok) {
          return { type: 'error', message: data.error || 'No se pudo actualizar el estado' };
      }
      return { type: 'success', message: 'Estado actualizado' };
  } catch (error) {
      return { type: 'error', message: 'Error de conexión' };
  }
}

export async function respondToShiftInvitation(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const invitationId = formData.get('invitationId') as string;
  const response = formData.get('response') as 'aceptar' | 'rechazar';

  if (!invitationId || !response) {
      return { type: 'error', message: 'Faltan datos para responder a la invitación.' };
  }
  const estado_invitacion = response === 'aceptar' ? 'aceptado' : 'rechazado';
  
  try {
      const fetchResponse = await fetch(`${BACKEND_BASE_URL}/invitados/${invitationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ estado_invitacion })
      });
      const data = await fetchResponse.json();
      if (!fetchResponse.ok) {
          return { type: 'error', message: data.error || 'No se pudo responder a la invitación.' };
      }
      return { type: 'success', message: 'Respuesta enviada exitosamente.' };
  } catch (error) {
      return { type: 'error', message: 'Error de conexión.' };
  }
}


// --- USER ACTIONS ---

export async function findUserByDni(dni: string): Promise<User | null> {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/usuarios/dni/${dni}`, {
            credentials: 'include'
        });
        if (!response.ok) return null;
        const backendUser: BackendUser = await response.json();
        const frontendRole = backendUser.rol === 'usuario' ? 'user' : backendUser.rol;

        return {
            id: backendUser.id.toString(),
            dni: backendUser.dni,
            fullName: backendUser.nombre,
            email: backendUser.email,
            role: frontendRole as UserRole,
            profilePictureUrl: backendUser.foto_url,
        };
    } catch (error) {
        console.error(`Error en findUserByDni para DNI ${dni}:`, error);
        return null;
    }
}

// --- HELPER FUNCTIONS ---
function mapBackendShiftToFrontend(backendShift: BackendShift): Shift {
    const creator = backendShift.Usuario;
    const invitations = backendShift.InvitadosTurnos || [];
    
    const acceptedCount = invitations.filter((inv: BackendInvitation) => inv.estado_invitacion === 'aceptado').length;
    const participantCount = backendShift.cantidad_integrantes || (1 + acceptedCount);

    return {
        id: backendShift.id.toString(),
        date: backendShift.fecha,
        startTime: backendShift.hora_inicio.substring(0, 5),
        endTime: backendShift.hora_fin.substring(0, 5),
        theme: backendShift.tematica,
        participantCount: participantCount,
        notes: backendShift.observaciones,
        area: backendShift.Sala?.nombre || 'Sala no especificada',
        status: backendShift.estado,
        creatorId: creator?.id.toString() || '',
        creatorDni: creator?.dni || '',
        creatorFullName: creator?.nombre || 'Creador Desconocido',
        invitedUserDnis: invitations
          .map((inv: BackendInvitation) => inv.Usuario?.dni)
          .filter((dni): dni is string => typeof dni === 'string'),
        invitations: invitations.map((inv: BackendInvitation) => ({
          id: inv.id.toString(),
          userId: inv.id_usuario.toString(),
          userDni: inv.Usuario?.dni ?? '',
          status: inv.estado_invitacion
        }))
    };
}
