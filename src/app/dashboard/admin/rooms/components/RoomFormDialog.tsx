
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
import { addManagedRoom, updateManagedRoom } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle } from 'lucide-react';

const RoomNameSchema = z.object({
  name: z.string().min(3, "Nombre debe tener al menos 3 caracteres.").max(50, "Nombre no puede exceder los 50 caracteres."),
});
type RoomFormValues = z.infer<typeof RoomNameSchema>;

interface RoomFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  room?: Room | null; // If provided, it's an edit operation
  onRoomSaved: () => void;
}

export function RoomFormDialog({ isOpen, setIsOpen, room, onRoomSaved }: RoomFormDialogProps) {
  const isEditing = !!room;
  const [actionState, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(
    isEditing ? updateManagedRoom : addManagedRoom,
    null
  );
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(RoomNameSchema),
    defaultValues: {
      name: room?.name || '',
    },
  });

  useEffect(() => {
    if (room) {
      form.reset({ name: room.name });
    } else {
      form.reset({ name: '' });
    }
  }, [room, form, isOpen]); // Reset form when dialog opens or room changes

  useEffect(() => {
    if (actionState?.type === 'success') {
      toast({
        title: isEditing ? "Sala Actualizada" : "Sala Agregada",
        description: actionState.message,
      });
      onRoomSaved();
      setIsOpen(false);
      form.reset({name: ''}); // Reset form for next use
    } else if (actionState?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: actionState.message,
      });
      if (actionState.errors?.name) {
        form.setError("name", { type: "server", message: actionState.errors.name[0] });
      }
    }
  }, [actionState, toast, onRoomSaved, setIsOpen, isEditing, form]);

  const onSubmit = (values: RoomFormValues) => {
    const formData = new FormData();
    formData.append('name', values.name);
    if (isEditing && room) {
      formData.append('id', room.id);
    }
    startTransition(() => {
        formAction(formData);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {isEditing ? 'Editar Sala/Área' : 'Agregar Nueva Sala/Área'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Modifica el nombre de la sala.' : 'Ingresa el nombre para la nueva sala o área.'}
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
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
            {actionState?.errors?.name && <p className="text-sm text-destructive mt-1">{actionState.errors.name[0]}</p>}

          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isActionPending} className="group">
              {isActionPending ? (isEditing ? 'Guardando...' : 'Agregando...') : (isEditing ? 'Guardar Cambios' : 'Agregar Sala')}
              {isEditing ? <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100" /> : <PlusCircle className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
