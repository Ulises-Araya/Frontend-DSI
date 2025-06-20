
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Room, ActionResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useActionState, useTransition } from "react";
import { addManagedRoom } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle } from 'lucide-react';

const RoomFormSchema = z.object({
  name: z.string().min(3, "Nombre debe tener al menos 3 caracteres.").max(50, "Nombre no puede exceder los 50 caracteres."),
  capacity: z.coerce.number().int().min(1, "La capacidad debe ser al menos 1."),
});
type RoomFormValues = z.infer<typeof RoomFormSchema>;

interface RoomFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  room?: Room | null; // room prop is kept for potential future edit functionality
  onRoomSaved: () => void;
}

export function RoomFormDialog({ isOpen, setIsOpen, room, onRoomSaved }: RoomFormDialogProps) {
  const isEditing = !!room;
  // NOTE: Backend does not support updating rooms. This form is for adding only.
  // The 'updateManagedRoom' action has been removed.
  const [actionState, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(
    addManagedRoom,
    null
  );
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(RoomFormSchema),
    defaultValues: {
      name: room?.name || '',
      capacity: room?.capacity || 10,
    },
  });

  useEffect(() => {
    if (room && isEditing) {
      form.reset({ name: room.name, capacity: room.capacity });
    } else {
      form.reset({ name: '', capacity: 10 });
    }
  }, [room, form, isOpen, isEditing]);

  useEffect(() => {
    if (actionState?.type === 'success') {
      toast({
        title: "Sala Agregada",
        description: actionState.message,
      });
      onRoomSaved();
      setIsOpen(false);
      form.reset({ name: '', capacity: 10 });
    } else if (actionState?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: actionState.message,
      });
      if (actionState.errors?.name) {
        form.setError("name", { type: "server", message: actionState.errors.name[0] });
      }
      if (actionState.errors?.capacity) {
        form.setError("capacity", { type: "server", message: actionState.errors.capacity[0] });
      }
    }
  }, [actionState, toast, onRoomSaved, setIsOpen, form]);

  const onSubmit = (values: RoomFormValues) => {
    if (isEditing) {
        toast({ variant: "destructive", title: "Funcionalidad no disponible", description: "El backend actual no permite editar salas." });
        return;
    }
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('capacity', values.capacity.toString());

    startTransition(() => {
        formAction(formData);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {isEditing ? 'Editar Sala/Área (No disponible)' : 'Agregar Nueva Sala/Área'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'La edición de salas no está soportada por el backend actual.' : 'Ingresa los detalles para la nueva sala o área.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-left text-foreground/80">
              Nombre de la Sala/Área
            </Label>
            <Input
              id="name"
              {...form.register('name')}
              className="mt-1 bg-background/70 border-border focus:border-primary"
              placeholder="Ej: Laboratorio de Computación 1"
              disabled={isEditing}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
             {actionState?.errors?.name && <p className="text-sm text-destructive mt-1">{actionState.errors.name[0]}</p>}
          </div>
           <div>
            <Label htmlFor="capacity" className="text-left text-foreground/80">
              Capacidad
            </Label>
            <Input
              id="capacity"
              type="number"
              {...form.register('capacity')}
              className="mt-1 bg-background/70 border-border focus:border-primary"
              placeholder="Ej: 25"
              disabled={isEditing}
            />
            {form.formState.errors.capacity && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.capacity.message}</p>
            )}
             {actionState?.errors?.capacity && <p className="text-sm text-destructive mt-1">{actionState.errors.capacity[0]}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isActionPending || isEditing} className="group">
              {isActionPending ? 'Agregando...' : (isEditing ? 'Guardar Cambios' : 'Agregar Sala')}
              {isEditing ? <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100" /> : <PlusCircle className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    