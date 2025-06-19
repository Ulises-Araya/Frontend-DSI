"use client";

import type { Shift, ShiftStatus, UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Users, Edit, Trash2, Info, UserCircle, MapPin, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateShiftStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ShiftCardProps {
  shift: Shift;
  currentUserRole: UserRole;
  currentUserId?: string; // To check if current user is the creator for potential edit/cancel
  onStatusChange?: (shiftId: string, newStatus: ShiftStatus) => void; // Callback for optimistic updates
}

export function ShiftCard({ shift, currentUserRole, currentUserId, onStatusChange }: ShiftCardProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: ShiftStatus) => {
    if (newStatus === shift.status) return;
    setIsUpdatingStatus(true);
    const result = await updateShiftStatus(shift.id, newStatus);
    if (result.success && result.shift) {
      toast({ title: "Estado Actualizado", description: `El turno "${shift.theme}" ahora está ${newStatus}.` });
      if (onStatusChange) {
        onStatusChange(shift.id, newStatus);
      }
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message || "No se pudo actualizar el estado." });
    }
    setIsUpdatingStatus(false);
  };

  const getStatusVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'accepted': return 'default'; // default is primary
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const isCreator = shift.creatorId === currentUserId;

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-2xl text-primary mb-1">{shift.theme}</CardTitle>
          <Badge variant={getStatusVariant(shift.status)} className="capitalize text-sm px-3 py-1">{shift.status}</Badge>
        </div>
        <CardDescription className="text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" /> {shift.area}
        </CardDescription>
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
        {currentUserRole === 'admin' && shift.creatorFullName && (
           <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-3">
            <UserCircle className="w-5 h-5 text-accent" />
            <span>Creador: {shift.creatorFullName} (DNI: {shift.creatorDni})</span>
          </div>
        )}
         {shift.invitedUserDnis && shift.invitedUserDnis.length > 0 && (
          <div className="pt-2 border-t border-border/50 mt-3">
            <p className="text-sm font-medium text-accent mb-1">Invitados (DNI):</p>
            <ul className="list-disc list-inside text-sm">
              {shift.invitedUserDnis.map(dni => <li key={dni}>{dni}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t border-border/50">
        {currentUserRole === 'admin' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm mr-2">Cambiar estado:</span>
            <Select onValueChange={(value) => handleStatusChange(value as ShiftStatus)} defaultValue={shift.status} disabled={isUpdatingStatus}>
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
        ) : (
          <div className="text-sm text-muted-foreground">
            {/* User view specific actions could go here */}
          </div>
        )}
        {(isCreator && currentUserRole === 'user' && (shift.status === 'pending' || shift.status === 'accepted')) && (
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button variant="outline" size="sm" disabled>
              <Edit className="w-4 h-4 mr-1" /> Editar (Próximamente)
            </Button>
            <Button variant="destructive" size="sm" disabled>
              <Trash2 className="w-4 h-4 mr-1" /> Cancelar (Próximamente)
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
