
"use client";

import { useEffect, useState } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUser } from '@/lib/actions'; // Cambiado
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { MailCheck, ArrowLeft, Inbox, ListChecks, CalendarX2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'; // Importar useRouter

export default function InvitedShiftsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allInvitedShifts, setAllInvitedShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Inicializar useRouter

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUser();
    if (!fetchedUser) {
      router.push('/login'); // Redirigir si no hay usuario
      setIsLoading(false);
      return;
    }
    setUser(fetchedUser);
    if (fetchedUser && fetchedUser.dni) {
      // La lógica de getUserShifts sigue siendo local por ahora
      const fetchedShifts = await getUserShifts();
      const invites = fetchedShifts.filter(shift => 
        shift.invitedUserDnis.includes(fetchedUser.dni) && 
        shift.creatorId !== fetchedUser.id
      ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllInvitedShifts(invites);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingInvitations = allInvitedShifts.filter(s => s.status === 'pendiente');
  const confirmedInvitations = allInvitedShifts.filter(s => s.status === 'aceptado');
  const cancelledByOrganizerInvitations = allInvitedShifts.filter(s => s.status === 'cancelado');

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
            Volver a Mis Turnos Creados
          </Link>
        </Button>
      </div>

      {isLoading || !user ? ( // Verificar si el usuario está cargado
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
                {pendingInvitations.map(shift => (
                  user && user.dni && // Asegurar que user y user.dni existan
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    currentUserRole="user" 
                    currentUserId={user.id} 
                    currentUserDni={user.dni}
                    onShiftUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-card/50 rounded-lg border border-dashed border-border">
                <Image src="https://placehold.co/128x128.png" alt="No pending invitations" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="empty envelope mail" />
                <p className="text-muted-foreground">No tienes invitaciones pendientes de respuesta.</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <ListChecks className="w-6 h-6 mr-3 text-accent" />
              Confirmadas (Participando)
            </h2>
            {confirmedInvitations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {confirmedInvitations.map(shift => (
                  user && user.dni && // Asegurar que user y user.dni existan
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    currentUserRole="user" 
                    currentUserId={user.id} 
                    currentUserDni={user.dni}
                    onShiftUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-card/50 rounded-lg border border-dashed border-border">
                <Image src="https://placehold.co/128x128.png" alt="No confirmed invitations" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="calendar checkmark" />
                <p className="text-muted-foreground">No tienes turnos confirmados a los que estés participando como invitado.</p>
              </div>
            )}
          </section>
          
          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <CalendarX2 className="w-6 h-6 mr-3 text-accent" />
              Canceladas por Organizador
            </h2>
            {cancelledByOrganizerInvitations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {cancelledByOrganizerInvitations.map(shift => (
                  user && user.dni && // Asegurar que user y user.dni existan
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    currentUserRole="user" 
                    currentUserId={user.id} 
                    currentUserDni={user.dni}
                    onShiftUpdate={loadData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-card/50 rounded-lg border border-dashed border-border">
                <Image src="https://placehold.co/128x128.png" alt="No cancelled invitations" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="calendar cross" />
                <p className="text-muted-foreground">No hay turnos a los que fuiste invitado que hayan sido cancelados por el organizador.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
