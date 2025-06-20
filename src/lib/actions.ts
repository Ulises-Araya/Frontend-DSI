
"use server";
import { z } from 'zod';
import { redirect } from 'next/navigation';
import type { Shift, ShiftStatus, User, ActionResponse as BaseActionResponse, Room, UserRole, BackendShift, BackendRoom, BackendInvitation } from './types';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3000/api';

interface ActionResponse extends BaseActionResponse {
  user?: User;
  room?: Room;
  rooms?: Room[];
  shift?: Shift;
}

// Helper function para obtener el token de la sesión simulada
function getToken(): string | null {
  return globalThis.mockSession?.token || null;
}

// Helper para mapear los datos del turno del backend al formato del frontend
function mapBackendShiftToFrontend(backendShift: any): Shift {
    const creator = backendShift.Usuario;
    const invitations = backendShift.InvitadosTurnos || [];
    
    // Calcula el recuento de participantes: creador + todos los invitados aceptados
    const acceptedCount = invitations.filter((inv: any) => inv.estado_invitacion === 'aceptado').length;
    const participantCount = 1 + acceptedCount;

    return {
        id: backendShift.id.toString(),
        date: backendShift.fecha,
        startTime: backendShift.hora_inicio.substring(0, 5),
        endTime: backendShift.hora_fin.substring(0, 5),
        theme: backendShift.tematica,
        participantCount: participantCount,
        notes: backendShift.observaciones,
        area: backendShift.Sala?.nombre || 'Sala no especificada',
        status: backendShift.estado as ShiftStatus,
        creatorId: creator?.id.toString() || '',
        creatorDni: creator?.dni || '',
        creatorFullName: creator?.nombre || 'Creador Desconocido',
        invitedUserDnis: invitations.map((inv: any) => inv.Usuario?.dni).filter(Boolean),
        // Incluimos las invitaciones completas para tener sus IDs
        invitations: invitations.map((inv: any) => ({
          id: inv.id.toString(),
          userId: inv.id_usuario.toString(),
          userDni: inv.Usuario?.dni,
          status: inv.estado_invitacion
        }))
    };
}


// --- AUTH ACTIONS ---

export async function loginUser(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  console.log(`Attempting to login. Backend URL target: ${BACKEND_BASE_URL}/auth/login`);
  const validatedFields = z.object({
    dni: z.string().min(1, "DNI es requerido"),
    password: z.string().min(1, "Contraseña es requerida"),
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }
  const { dni, password } = validatedFields.data;

  let loginData;
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni, password }),
    });

    loginData = await response.json();

    if (!response.ok) {
      return { type: 'error', message: loginData.error || 'Credenciales inválidas o error del servidor.' };
    }
  } catch (error: any) {
    console.error('Error en la comunicación con el backend durante el login:', error);
    let errorMessage = 'Error de conexión con el servidor de autenticación.';
    if (error.cause?.code === 'ECONNREFUSED') {
        errorMessage = `No se pudo conectar a ${BACKEND_BASE_URL}. Asegúrate de que el servidor backend esté corriendo.`;
    }
    return { type: 'error', message: errorMessage };
  }

  // Si llegamos aquí, el login fue exitoso.
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
  
  // La redirección debe estar fuera del try-catch para funcionar correctamente
  if (frontendRole === 'admin') {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: fullName, email, dni, password, rol: 'usuario' }),
    });
    const data = await response.json();

    if (!response.ok || response.status !== 201) {
      const fieldErrors: Record<string, string[]> = {};
      if (data.error && typeof data.error === 'string') {
        if (data.error.toLowerCase().includes('dni')) fieldErrors.dni = [data.error];
        else if (data.error.toLowerCase().includes('email')) fieldErrors.email = [data.error];
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
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${session.currentUserId}`, {
            headers: { 'Authorization': `Bearer ${session.token}` },
        });

        if (!response.ok) {
            console.error(`Error fetching user details: ${response.status} ${response.statusText}`);
            // If token is invalid (401), logout the user
            if (response.status === 401 || response.status === 403) {
                await logoutUser();
            }
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
        console.error("getCurrentUser - Exception:", error);
        return null;
    }
}

export async function logoutUser() {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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

export async function updateUserProfile(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const token = getToken();
  const user = await getCurrentUser();
  if (!user || !token) return { type: 'error', message: 'Usuario no autenticado.' };

  const validatedFields = z.object({
    fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres."),
    email: z.string().email("Email inválido."),
  }).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nombre: validatedFields.data.fullName, email: validatedFields.data.email }),
    });

    const responseData = await response.json();

    if (!response.ok) {
        return { type: 'error', message: responseData.error || 'Error al actualizar el perfil.' };
    }
    const updatedUser = { ...user, fullName: validatedFields.data.fullName, email: validatedFields.data.email };
    return { type: 'success', message: 'Perfil actualizado exitosamente.', user: updatedUser };

  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { type: 'error', message: 'Error de conexión al actualizar el perfil.' };
  }
}

export async function changeUserPassword(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const token = getToken();
  const user = await getCurrentUser();
  if (!user || !token) return { type: 'error', message: 'Usuario no autenticado.' };

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
    const response = await fetch(`${BACKEND_BASE_URL}/usuarios/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

// --- SALA/ROOM ACTIONS ---

export async function getManagedRooms(): Promise<Room[]> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas`);
    if (!response.ok) return [];
    const rooms: BackendRoom[] = await response.json();
    return rooms.map(room => ({ id: room.id.toString(), name: room.nombre, capacity: room.capacidad }));
  } catch (error) {
    console.error("getManagedRooms failed:", error);
    return [];
  }
}

export async function addManagedRoom(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado.' };
  
  const validatedFields = z.object({ name: z.string().min(3), capacity: z.coerce.number().min(1) }).safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { type: 'error', message: 'Error de validación.', errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado.' };
  
  const id = formData.get('id') as string;
  if (!id) return { type: 'error', message: 'ID de sala es requerido.' };

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/salas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
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
    const user = await getCurrentUser();
    const token = getToken();
    if (!user || !token) return { type: 'error', message: 'Usuario no autenticado.' };

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
        // 1. Create the shift
        const shiftPayload = {
            fecha: data.date,
            hora_inicio: data.startTime,
            hora_fin: data.endTime,
            tematica: data.theme,
            observaciones: data.notes,
            id_usuario: parseInt(user.id),
            id_sala: parseInt(data.area), // Area is now the sala ID
            cantidad_integrantes: 1 + invitedDnis.length,
            estado: 'pendiente'
        };

        const shiftResponse = await fetch(`${BACKEND_BASE_URL}/turnos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(shiftPayload),
        });

        const newShiftData = await shiftResponse.json();
        if (!shiftResponse.ok) {
            return { type: 'error', message: newShiftData.error || 'Error al crear el turno.' };
        }

        // 2. Find users by DNI to get their IDs
        const invitedUsers = await Promise.all(
          invitedDnis.map(dni => findUserByDni(dni))
        );
        const validInvitedUsers = invitedUsers.filter(u => u !== null) as User[];
        
        // 3. Create invitations for each valid user
        for (const invitedUser of validInvitedUsers) {
            const invitationPayload = {
                id_turno: newShiftData.id,
                id_usuario: parseInt(invitedUser.id),
                estado_invitacion: 'pendiente'
            };
            await fetch(`${BACKEND_BASE_URL}/invitados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    const user = await getCurrentUser();
    const token = getToken();
    if (!user || !token) return [];

    try {
        // Fetch shifts created by the user
        const createdResponse = await fetch(`${BACKEND_BASE_URL}/turnos/full/all`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!createdResponse.ok) throw new Error('Failed to fetch created shifts');
        const allShifts: BackendShift[] = await createdResponse.json();

        const userShifts = allShifts.filter(shift => shift.Usuario?.id.toString() === user.id);
        const invitedShifts = allShifts.filter(shift => 
            shift.InvitadosTurnos.some(inv => inv.id_usuario.toString() === user.id)
        );
        
        return [...userShifts, ...invitedShifts].map(mapBackendShiftToFrontend);

    } catch (error) {
        console.error("getUserShifts failed:", error);
        return [];
    }
}

export async function getAllShiftsAdmin(): Promise<Shift[]> {
  const token = getToken();
  if (!token) return [];

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/turnos/full/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado' };

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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado' };
  const shiftId = formData.get('shiftId') as string;
  if (!shiftId) return { type: 'error', message: 'ID de turno requerido.' };
  
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/turnos/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado' };

  try {
      const response = await fetch(`${BACKEND_BASE_URL}/turnos/${shiftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
  const token = getToken();
  if (!token) return { type: 'error', message: 'No autorizado.' };
  
  const invitationId = formData.get('invitationId') as string;
  const response = formData.get('response') as 'accept' | 'reject';

  if (!invitationId || !response) {
      return { type: 'error', message: 'Faltan datos para responder a la invitación.' };
  }
  const estado_invitacion = response === 'accept' ? 'aceptado' : 'rechazado';
  
  try {
      const fetchResponse = await fetch(`${BACKEND_BASE_URL}/invitados/${invitationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    const token = getToken();
    if (!token) return null;

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/usuarios/dni/${dni}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return null;
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
        console.error(`Error en findUserByDni para DNI ${dni}:`, error);
        return null;
    }
}

    