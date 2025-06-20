
"use client";

import { useState } from 'react';
import type { Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useActionState, useTransition } from "react";
import { deleteManagedRoom } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { RoomFormDialog } from './RoomFormDialog';
import Image from 'next/image';

interface RoomsListProps {
  rooms: Room[];
  onRoomChange: () => void; 
}

export function RoomsList({ rooms, onRoomChange }: RoomsListProps) {
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [selectedRoomToEdit, setSelectedRoomToEdit] = useState<Room | null>(null);
  const [deleteActionState, deleteFormAction, isDeletePending] = useActionState(deleteManagedRoom, null);
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const handleEditClick = (room: Room) => {
    setSelectedRoomToEdit(room);
    setIsEditRoomDialogOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    const formData = new FormData();
    formData.append('id', roomId);
    startTransition(() => {
        deleteFormAction(formData);
    });
  };
  
  useState(() => {
    if (deleteActionState?.type === 'success') {
        toast({ title: "Sala Eliminada", description: deleteActionState.message });
        onRoomChange();
    } else if (deleteActionState?.type === 'error') {
        toast({ variant: "destructive", title: "Error", description: deleteActionState.message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[deleteActionState]);


  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-12 bg-card/50 rounded-lg border border-dashed border-border">
        <Image src="https://placehold.co/128x128.png" alt="No rooms found" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="empty room illustration"/>
        <p className="text-xl text-muted-foreground">No hay salas/áreas configuradas.</p>
        <p className="text-sm text-muted-foreground/80">Puedes agregar nuevas salas usando el botón de arriba.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-sm bg-card/70 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline text-foreground/90">Nombre de la Sala/Área</TableHead>
            <TableHead className="text-right font-headline text-foreground/90 w-[150px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="font-medium text-foreground/80">{room.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(room)} className="mr-2 group">
                  <Edit className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                   <span className="sr-only">Editar {room.name}</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="group">
                      <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                       <span className="sr-only">Eliminar {room.name}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará la sala "{room.name}". Los turnos existentes que usen esta sala conservarán el nombre pero la sala no estará disponible para nuevas selecciones. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteRoom(room.id)} 
                        disabled={isDeletePending}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeletePending ? 'Eliminando...' : 'Sí, Eliminar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedRoomToEdit && (
        <RoomFormDialog
          isOpen={isEditRoomDialogOpen}
          setIsOpen={setIsEditRoomDialogOpen}
          room={selectedRoomToEdit}
          onRoomSaved={() => {
            setSelectedRoomToEdit(null); // Clear selection
            onRoomChange();
          }}
        />
      )}
    </div>
  );
}
