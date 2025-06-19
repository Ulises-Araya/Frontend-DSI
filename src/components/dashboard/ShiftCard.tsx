
"use client";

import type { Shift, ShiftStatus, UserRole, ActionResponse } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Users, Edit, Trash2, UserCircle, MapPin, MessageSquare, CheckCircle, XCircle, UserPlus, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateShiftStatus, respondToShiftInvitation } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useActionState, useEffect, useState, useTransition } from "react";

interface ShiftCardProps {
  shift: Shift;
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserDni: string;
  onShiftUpdate?: () => void; // Callback for any update (status change, invitation response)
}

export function ShiftCard({ shift, currentUserRole, currentUserId, currentUserDni, onShiftUpdate }: ShiftCardProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // For invitation response
  const [invitationActionState, invitationFormAction, isInvitationActionPending] = useActionState(respondToShiftInvitation, null);
  const [, startTransition] = useTransition();


  const handleAdminStatusChange = async (newStatus: ShiftStatus) => {
    if (newStatus === shift.status) return;
    setIsUpdatingStatus(true);
    const result = await updateShiftStatus(shift.id, newStatus);
    if (result.type === 'success' && result.shift) {
      toast({ title: "Estado Actualizado", description: `El turno "${shift.theme}" ahora está ${newStatus}.` });
      if (onShiftUpdate) onShiftUpdate();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "No se pudo actualizar el estado." });
    }
    setIsUpdatingStatus(false);
  };

  const handleInvitationResponse = (response: 'accept' | 'reject') => {
    const formData = new FormData();
    formData.append('shiftId', shift.id);
    formData.append('response', response);
    startTransition(() => {
      invitationFormAction(formData);
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


  const getStatusVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'accepted': return 'default'; 
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const isCreator = shift.creatorId === currentUserId;
  const isInvited = shift.invitedUserDnis.includes(currentUserDni) && !isCreator;

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40">
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
      <CardContent className="space-y-3 text-foreground/90">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-accent" />
          <span>{new Date(shift.date + 'T00:00:00').toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
            <MessageSquare className="w-5 h-5 text-accent mt-1" />
            <p className="text-sm italic bg-muted/50 p-2 rounded-md ">{shift.notes}</p>
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
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t border-border/50">
        {currentUserRole === 'admin' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm mr-2">Cambiar estado:</span>
            <Select onValueChange={(value) => handleAdminStatusChange(value as ShiftStatus)} defaultValue={shift.status} disabled={isUpdatingStatus}>
              <SelectTrigger className="w-full sm:w-[150px] bg-background/70">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : isInvited && shift.status === 'pending' && currentUserRole === 'user' ? (
          <div className="flex w-full sm:w-auto justify-around sm:justify-start gap-2">
            <Button 
              size="sm" 
              onClick={() => handleInvitationResponse('accept')} 
              disabled={isInvitationActionPending}
              className="bg-primary hover:bg-primary/80 flex-1 sm:flex-none"
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Aceptar
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => handleInvitationResponse('reject')}
              disabled={isInvitationActionPending}
              className="flex-1 sm:flex-none"
            >
              <XCircle className="w-4 h-4 mr-1" /> Rechazar
            </Button>
          </div>
        ) : (
          <div className="h-9"></div> // Placeholder to maintain height if no admin/invitation actions
        )}
        
        {(isCreator && currentUserRole === 'user' && (shift.status === 'pending' || shift.status === 'accepted')) && (
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button variant="outline" size="sm" disabled>
              <Edit className="w-4 h-4 mr-1" /> Editar (Próximamente)
            </Button>
            <Button variant="destructive" size="sm" disabled> {/* This should be a cancel *user* action, not admin */}
              <Trash2 className="w-4 h-4 mr-1" /> Cancelar (Próximamente)
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
