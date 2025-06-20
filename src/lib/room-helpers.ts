
'use server';
import type { Room } from './types';

// In-memory store for rooms - DO NOT EXPORT directly from a 'use server' file
let roomsDB: Room[] = [
  { id: 'room1', name: 'Sala de Estudio 1' },
  { id: 'room2', name: 'Laboratorio A' },
  { id: 'room3', name: 'Aula Magna' },
  { id: 'room4', name: 'Sala Virtual B' },
  { id: 'room5', name: 'Biblioteca - Zona Silenciosa' },
];

export async function getRoomsDB(): Promise<Room[]> {
  return [...roomsDB].sort((a, b) => a.name.localeCompare(b.name));
}

export async function findRoomById(id: string): Promise<Room | undefined> {
  return roomsDB.find(room => room.id === id);
}

export async function findRoomByName(name: string): Promise<Room | undefined> {
  return roomsDB.find(room => room.name.toLowerCase() === name.toLowerCase());
}

export async function addRoomDB(name: string): Promise<Room | { error: string }> {
  if (await findRoomByName(name)) {
    return { error: 'Ya existe una sala con este nombre.' };
  }
  const newRoom: Room = {
    id: `room${Date.now()}${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
  };
  roomsDB.push(newRoom);
  return newRoom;
}

export async function updateRoomDB(id: string, newName: string): Promise<Room | { error: string }> {
  const existingRoomWithName = await findRoomByName(newName);
  if (existingRoomWithName && existingRoomWithName.id !== id) {
    return { error: 'Ya existe otra sala con este nuevo nombre.' };
  }

  const roomIndex = roomsDB.findIndex(room => room.id === id);
  if (roomIndex === -1) {
    return { error: 'Sala no encontrada.' };
  }
  
  const oldName = roomsDB[roomIndex].name;
  roomsDB[roomIndex].name = newName.trim();
  
  // Note: In a real app, you might want to update shift.area for shifts that used the oldName.
  // For this mock, existing shifts will retain the old name if it was changed.
  // This could be an advanced feature later.
  console.log(`Room name changed from "${oldName}" to "${newName}". Shifts using the old name are not automatically updated in this mock version.`);

  return roomsDB[roomIndex];
}

export async function deleteRoomDB(id: string): Promise<boolean> {
  const initialLength = roomsDB.length;
  roomsDB = roomsDB.filter(room => room.id !== id);
  // Note: In a real app, check if the room is in use by shifts before deleting,
  // or handle how shifts are affected (e.g., set area to null, prompt for reassign).
  // For this mock, shifts will retain the area name as a string.
  return roomsDB.length < initialLength;
}

