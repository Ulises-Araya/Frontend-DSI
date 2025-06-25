"use client";

import { useEffect, useState } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUser, respondToShiftInvitation } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { MailCheck, ArrowLeft, Inbox, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function InvitedShiftsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allInvitedShifts, setAllInvitedShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const router = useRouter();

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUser();
    if (!fetchedUser) {
      router.push('/login');
      setIsLoading(false);
      return;
    }
    setUser(fetchedUser);
    if (fetchedUser && fetchedUser.dni) {
      const fetchedShifts = await getUserShifts();
      const invites = fetchedShifts.filter(shift =>
        shift.invitedUserDnis.includes(fetchedUser.dni) &&
        shift.creatorId !== fetchedUser.id
      );
      setAllInvitedShifts(invites);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo invitaciones pendientes (no aceptadas ni rechazadas, ni canceladas)
  const pendingInvitations = allInvitedShifts.filter(s =>
    s.invitations.some(inv => inv.userDni === user?.dni && inv.status === 'pendiente') &&
    s.status !== 'cancelado'
  );

  // Invitaciones respondidas (aceptadas o rechazadas) para mostrar info extra si se desea
  // const respondedInvitations = allInvitedShifts.filter(s =>
  //   s.invitations.some(inv => inv.userDni === user?.dni && (inv.status === 'aceptado' || inv.status === 'rechazado'))
  // );

  // Acción para aceptar/rechazar invitación
  async function handleInvitationResponse(shiftId: string, invitationId: string, response: 'aceptar' | 'rechazar') {
    setActionPending(invitationId + response);
    const formData = new FormData();
    formData.append('invitationId', invitationId);
    formData.append('response', response);
    await respondToShiftInvitation(null, formData);
    setActionPending(null);
    await loadData();
  }

  // Utilidad para mostrar fecha y hora legible
  function formatDate(date: string) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <MailCheck className="w-10 h-10 mr-3" />
          Mis Invitaciones
        </h1>
        <Button variant="outline" asChild disabled={!user}>
          <Link href="/dashboard/user">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mis Turnos
          </Link>
        </Button>
      </div>

      {isLoading || !user ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="w-full shadow-lg">
              <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="h-10" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <Inbox className="w-6 h-6 mr-3 text-accent" />
              Pendientes de Respuesta
            </h2>
            {pendingInvitations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {pendingInvitations.map(shift => {
                  const myInvitation = shift.invitations.find(inv => inv.userDni === user.dni && inv.status === 'pendiente');
                  return (
                    <Card key={shift.id} className="w-full shadow-lg">
                      <CardHeader>
                        <div className="font-headline text-lg flex items-center gap-2">
                          <span>{shift.theme}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30">
                            Invitación
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">Sala:</span> {shift.area}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">Fecha:</span> {formatDate(shift.date)}
                          <span className="font-medium ml-2">Horario:</span> {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">Organizador:</span> {shift.creatorFullName} (DNI: {shift.creatorDni})
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">Integrantes:</span> {shift.participantCount}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {shift.notes && (
                          <div className="text-sm italic bg-muted/50 p-2 rounded-md break-words mb-2">
                            <span className="font-medium text-accent">Notas:</span> {shift.notes}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Estado del turno:</span> {shift.status}
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-primary text-white"
                          disabled={actionPending === (myInvitation?.id + 'aceptar')}
                          onClick={() => myInvitation && handleInvitationResponse(shift.id, myInvitation.id, 'aceptar')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionPending === (myInvitation?.id + 'rechazar')}
                          onClick={() => myInvitation && handleInvitationResponse(shift.id, myInvitation.id, 'rechazar')}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Rechazar
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-card/50 rounded-lg border border-dashed border-border">
                <Image src="/vacio.png" alt="No pending invitations" width={194} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="empty envelope mail" />
                <p className="text-muted-foreground">No tienes invitaciones pendientes de respuesta.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}