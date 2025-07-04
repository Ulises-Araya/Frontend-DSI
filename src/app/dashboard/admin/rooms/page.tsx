"use client";

import { useEffect, useState } from 'react';
import type { Room, User } from '@/lib/types';
import { getCurrentUser, getManagedRooms } from '@/lib/actions'; // Cambiado
import { Button } from '@/components/ui/button';
import { PlusCircle, Tent, ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { RoomsList } from './components/RoomsList';
import { RoomFormDialog } from './components/RoomFormDialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Importar useRouter

export default function AdminRoomsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter(); // Inicializar useRouter

  async function loadAdminData() {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        setIsLoading(false);
        return;
      }
      if (user.role !== 'admin') {
        router.push('/dashboard/user');
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);
      const fetchedRooms = await getManagedRooms();
      setRooms(fetchedRooms);
    } catch (error) {
      console.error("Error loading admin room data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo cargar la información de las salas. ${error?.message || ''}`,
      });
      setRooms([]); 
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log para debug de creación, borrado y errores
  const handleRoomSaved = (...args) => {
    console.log('handleRoomSaved called', ...args);
    loadAdminData(); 
  };

  if (isLoading || !currentUser) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Esta verificación es redundante si loadAdminData ya redirige, pero se deja como doble seguro.
  if (currentUser.role !== 'admin') {
    return <p className="text-center text-destructive">Acceso denegado. Esta sección es solo para administradores.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <Tent className="w-10 h-10 mr-3" />
          Gestionar Salas/Áreas
        </h1>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/admin">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Panel Admin
                </Link>
            </Button>
            <Button onClick={() => setIsAddRoomDialogOpen(true)} className="group">
                <PlusCircle className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                Agregar Sala
            </Button>
             <Button onClick={loadAdminData} variant="outline" size="icon" aria-label="Refrescar salas" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      <RoomsList rooms={rooms} onRoomChange={handleRoomSaved} />

      <RoomFormDialog
        isOpen={isAddRoomDialogOpen}
        setIsOpen={setIsAddRoomDialogOpen}
        onRoomSaved={handleRoomSaved}
      />
    </div>
  );
}
