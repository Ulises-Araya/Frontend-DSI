
// In-memory store for mock password reset tokens
// Record<dni, { token: string, expires: number }>
globalThis.mockPasswordResetTokens = globalThis.mockPasswordResetTokens || {};

// --- Password Reset Helpers (MOCK - AÚN NO INTEGRADAS CON BACKEND) ---

export function generateAndStoreMockResetToken(dni: string): string | null {
  // Esta función necesitaría un usuario existente para asociar el token,
  // pero como findUserByDni fue removido (ahora es una llamada al backend),
  // esta lógica de mock necesitaría ajustarse si se quiere mantener funcional
  // sin una llamada al backend para verificar el DNI primero.
  // Por ahora, la dejaremos, asumiendo que la acción que la llama verifica el DNI.
  const token = `mocktoken-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const expires = Date.now() + 15 * 60 * 1000; // Token expires in 15 minutes

  globalThis.mockPasswordResetTokens[dni] = { token, expires };
  return token;
}

export function verifyAndConsumeMockResetToken(dni: string, token: string): boolean {
  const storedEntry = globalThis.mockPasswordResetTokens[dni];
  if (!storedEntry) return false;

  if (storedEntry.token !== token) return false;
  if (Date.now() > storedEntry.expires) {
    delete globalThis.mockPasswordResetTokens[dni]; // Expired token
    return false;
  }

  delete globalThis.mockPasswordResetTokens[dni]; // Consume token
  return true;
}

// Funciones como addUser, findUserByDni, verifyPassword, updateUserDetails, updateUserPassword
// han sido eliminadas o serán reemplazadas por llamadas directas al backend en `actions.ts`.
// La base de datos de usuarios (`usersDB`) ya no se gestiona aquí.
