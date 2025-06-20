
// In-memory store for mock password reset tokens - YA NO SE USA PARA GENERAR/VERIFICAR, backend lo hace
// globalThis.mockPasswordResetTokens = globalThis.mockPasswordResetTokens || {};

// --- Password Reset Helpers (MOCK - AÚN NO INTEGRADAS CON BACKEND) ---

// Ya no se necesitan, el backend maneja la generación y verificación de tokens de reseteo reales.
// export function generateAndStoreMockResetToken(dni: string): string | null {
//   const token = `mocktoken-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
//   const expires = Date.now() + 15 * 60 * 1000; // Token expires in 15 minutes
//   globalThis.mockPasswordResetTokens[dni] = { token, expires };
//   return token;
// }

// export function verifyAndConsumeMockResetToken(dni: string, token: string): boolean {
//   const storedEntry = globalThis.mockPasswordResetTokens[dni];
//   if (!storedEntry) return false;

//   if (storedEntry.token !== token) return false;
//   if (Date.now() > storedEntry.expires) {
//     delete globalThis.mockPasswordResetTokens[dni]; // Expired token
//     return false;
//   }

//   delete globalThis.mockPasswordResetTokens[dni]; // Consume token
//   return true;
// }

// La base de datos de usuarios (`usersDB`) ya no se gestiona aquí.
// Las funciones como addUser, findUserByDni, verifyPassword, updateUserDetails, updateUserPassword
// han sido eliminadas o reemplazadas por llamadas directas al backend en `actions.ts`.
