
"use client";

import type { Shift, ShiftStatus, UserRole, Room } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Users, Edit, UserCircle, MapPin, MessageSquare, CheckCircle, XCircle, UserPlus, LogOut, Trash2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { updateShiftStatus, respondToShiftInvitation, cancelShift, getManagedRooms } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useActionState, useEffect, useState, useTransition } from "react";
import { EditShiftForm } from './EditShiftForm';


interface ShiftCardProps {
  shift: Shift;
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserDni: string;
  onShiftUpdate?: () => void; 
}

export function ShiftCard({ shift, currentUserRole, currentUserId, currentUserDni, onShiftUpdate }: ShiftCardProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  
  const [invitationActionState, invitationFormAction, isInvitationActionPending] = useActionState(respondToShiftInvitation, null);
  const [cancelActionState, cancelFormAction, isCancelActionPending] = useActionState(cancelShift, null);
  const [, startTransition] = useTransition();


  const handleAdminStatusChange = async (newStatus: ShiftStatus) => {
    if (newStatus === shift.status) return;
    setIsUpdatingStatus(true);
    const result = await updateShiftStatus(shift.id, newStatus);
    if (result.type === 'success') {
      toast({ title: "Estado Actualizado", description: `El turno "${shift.theme}" ahora está ${status}.` });
      if (onShiftUpdate) onShiftUpdate();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "No se pudo actualizar el estado." });
    }
    setIsUpdatingStatus(false);
  };

  const handleInvitationResponse = (response: 'accept' | 'reject') => {
    const currentUserInvitation = shift.invitations.find(inv => inv.userDni === currentUserDni);
    if (!currentUserInvitation) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró tu invitación para este turno." });
        return;
    }

    const formData = new FormData();
    formData.append('invitationId', currentUserInvitation.id);
    formData.append('response', response);
    startTransition(() => {
      invitationFormAction(formData);
    });
  };

  const handleUserCancelShift = () => {
    const formData = new FormData();
    formData.append('shiftId', shift.id);
    startTransition(() => {
      cancelFormAction(formData);
    });
  };
  
  useEffect(() => {
    if (invitationActionState?.type === 'success') {
      toast({
        title: "Respuesta Enviada",
        description: invitationActionState.message,
      });
      if (onShiftUpdate) onShiftUpdate();
    } else if (invitationActionState?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: invitationActionState.message,
      });
    }
  }, [invitationActionState, toast, onShiftUpdate]);

  useEffect(() => {
    if (cancelActionState?.type === 'success') {
      toast({
        title: "Turno Cancelado",
        description: cancelActionState.message,
      });
      if (onShiftUpdate) onShiftUpdate();
    } else if (cancelActionState?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error al cancelar",
        description: cancelActionState.message,
      });
    }
  }, [cancelActionState, toast, onShiftUpdate]);

  const getStatusVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'accepted': return 'default'; 
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const isCreator = shift.creatorId === currentUserId;
  const isInvited = shift.invitations.some(inv => inv.userDni === currentUserDni);
  
  const canUserEditShift = 
    isCreator && 
    currentUserRole === 'user' && 
    (shift.status === 'pending' || shift.status === 'accepted');

  const canAdminEditShift = currentUserRole === 'admin'; 

  const canEditShift = canUserEditShift || canAdminEditShift;

  const canUserCancelShift =
    isCreator &&
    currentUserRole === 'user' &&
    (shift.status === 'pending' || shift.status === 'accepted');

  const openEditModal = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await getManagedRooms();
      setAvailableRooms(rooms);
      setIsEditModalOpen(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las salas para editar." });
    } finally {
      setIsLoadingRooms(false);
    }
  };


  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-2xl text-primary mb-1">{shift.theme}</CardTitle>
          <Badge variant={getStatusVariant(shift.status)} className="capitalize text-sm px-3 py-1">{shift.status}</Badge>
        </div>
        <div className="flex flex-col gap-1">
            <CardDescription className="text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {shift.area}
            </CardDescription>
            {isInvited && shift.creatorFullName && (
              <CardDescription className="text-xs text-accent flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Invitado por: {shift.creatorFullName}
              </CardDescription>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-foreground/90 flex-grow">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-accent" />
          <span>{new Date(shift.date + 'T00:00:00Z').toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          <span>{shift.startTime} - {shift.endTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <span>{shift.participantCount} Integrante(s)</span>
        </div>
        
        {shift.notes && (
          <div className="flex items-start gap-2 pt-1">
            <MessageSquare className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
            <p className="text-sm italic bg-muted/50 p-2 rounded-md break-words">{shift.notes}</p>
          </div>
        )}

        {currentUserRole === 'admin' && shift.creatorFullName && !isCreator && (
           <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-3">
            <UserCircle className="w-5 h-5 text-accent" />
            <span>Creador: {shift.creatorFullName} (DNI: {shift.creatorDni})</span>
          </div>
        )}

         {shift.invitedUserDnis && shift.invitedUserDnis.length > 0 && (
          <div className="pt-2 border-t border-border/50 mt-3">
            <p className="text-sm font-medium text-accent mb-1">Invitados (DNI):</p>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {shift.invitedUserDnis.map(dni => <li key={dni}>{dni}{dni === currentUserDni ? " (Tú)" : ""}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4 border-t border-border/50 mt-auto sm:flex-row sm:justify-between sm:items-center">
        <div className="w-full sm:w-auto">
          {currentUserRole === 'admin' && (
            <div className="flex items-center gap-2">
              <span className="text-sm mr-1 sm:mr-2 whitespace-nowrap">Cambiar estado:</span>
              <Select 
                  onValueChange={(value) => handleAdminStatusChange(value as ShiftStatus)} 
                  defaultValue={shift.status} 
                  disabled={isUpdatingStatus}
              >
                <SelectTrigger className="flex-grow sm:w-[150px] bg-background/70">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" disabled={shift.status === 'pending'}>Pendiente</SelectItem>
                  <SelectItem value="accepted" disabled={shift.status === 'accepted'}>Aceptado</SelectItem>
                  <SelectItem value="cancelled" disabled={shift.status === 'cancelled'}>Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      
        <div className="flex flex-row gap-2 w-full sm:w-auto justify-end">
          {canEditShift && (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={openEditModal} disabled={isLoadingRooms}>
                  {isLoadingRooms ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Edit className="w-4 h-4 mr-1" />}
                  {isLoadingRooms ? 'Cargando...' : 'Editar'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-card border-primary/30">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl text-primary">Editar Turno</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Modifica los detalles de este turno.</DialogDescription>
                </DialogHeader>
                {!isLoadingRooms && availableRooms.length > 0 ? (
                    <EditShiftForm 
                    shift={shift} 
                    availableRooms={availableRooms}
                    onShiftUpdated={() => { 
                        if(onShiftUpdate) onShiftUpdate(); 
                        setIsEditModalOpen(false); 
                    }} 
                    setOpen={setIsEditModalOpen} 
                    />
                ) : isLoadingRooms ? (
                    <p className="text-center py-4">Cargando salas disponibles...</p>
                ) : (
                     <p className="text-center py-4 text-destructive">No hay salas disponibles para seleccionar. Contacte a un administrador.</p>
                )}
              </DialogContent>
            </Dialog>
          )}

          {canUserCancelShift && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                  <Trash2 className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción cancelará el turno "{shift.theme}". Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cerrar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUserCancelShift} disabled={isCancelActionPending}>
                    {isCancelActionPending ? "Cancelando..." : "Sí, Cancelar Turno"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
      
          {isInvited && currentUserRole === 'user' && (shift.status === 'pending' || shift.status === 'accepted') && (
            <>
              {shift.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => handleInvitationResponse('accept')} disabled={isInvitationActionPending} className="bg-primary hover:bg-primary/80 flex-1 sm:flex-none">
                    <CheckCircle className="w-4 h-4 mr-1" /> Aceptar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleInvitationResponse('reject')} disabled={isInvitationActionPending} className="flex-1 sm:flex-none">
                    <XCircle className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </>
              )}
              {shift.status === 'accepted' && (
                 <Button variant="outline" size="sm" onClick={() => handleInvitationResponse('reject')} disabled={isInvitationActionPending} className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive flex-1 sm:flex-none">
                  <LogOut className="w-4 h-4 mr-1" /> No Asistir
                </Button>
              )}
            </>
          )}
        </div>
        
        {!canEditShift && !canUserCancelShift &&
         !(isInvited && currentUserRole === 'user' && (shift.status === 'pending' || shift.status === 'accepted')) &&
         !(currentUserRole === 'admin') &&
          <div className="h-9 w-full sm:hidden"></div> 
        }

      </CardFooter>
    </Card>
  );
}

    