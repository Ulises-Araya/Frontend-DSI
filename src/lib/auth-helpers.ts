
import type { User, UserRole } from './types';

// In-memory store for users (replace with actual DB in a real app)
export const usersDB: User[] = [
  { id: '1', dni: 'admin', fullName: 'Admin User', email: 'admin@example.com', password: 'adminpassword', role: 'admin', profilePictureUrl: null },
  { id: '2', dni: '12345678', fullName: 'Regular User', email: 'user@example.com', password: 'userpassword', role: 'user', profilePictureUrl: null },
];

export function findUserByDni(dni: string): User | undefined {
  return usersDB.find(user => user.dni === dni);
}

export function findUserByEmail(email: string): User | undefined {
  return usersDB.find(user => user.email === email);
}

export function verifyPassword(passwordInput: string, storedPassword?: string): boolean {
  // In a real app, use bcrypt.compare or similar
  return passwordInput === storedPassword;
}

export function addUser(newUser: Omit<User, 'id' | 'role' | 'profilePictureUrl'>): User {
  const user: User = {
    ...newUser,
    id: String(usersDB.length + 1),
    role: 'user', // Default role
    profilePictureUrl: null,
  };
  usersDB.push(user);
  return user;
}

export function updateUserDetails(userId: string, data: { fullName?: string; email?: string; profilePictureUrl?: string | null }): User | undefined {
  const userIndex = usersDB.findIndex(user => user.id === userId);
  if (userIndex === -1) return undefined;

  if (data.fullName !== undefined) {
    usersDB[userIndex].fullName = data.fullName;
  }
  if (data.email !== undefined) {
    usersDB[userIndex].email = data.email;
  }
  if (data.profilePictureUrl !== undefined) {
    usersDB[userIndex].profilePictureUrl = data.profilePictureUrl;
  }
  return usersDB[userIndex];
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const userIndex = usersDB.findIndex(user => user.id === userId);
  if (userIndex === -1) return false;

  // In a real app, hash the password before storing
  usersDB[userIndex].password = newPassword;
  return true;
}
