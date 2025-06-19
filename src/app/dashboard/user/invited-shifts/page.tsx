
"use client";

import { useEffect, useState } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUserMock } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { Handshake, CalendarOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function InvitedShiftsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allUserShifts, setAllUserShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUserMock();
    setUser(fetchedUser);
    if (fetchedUser) {
      const fetchedShifts = await getUserShifts();
      setAllUserShifts(fetchedShifts);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const invitedShifts = allUserShifts.filter(shift => 
    user && shift.invitedUserDnis.includes(user.dni) && shift.creatorId !== user.id
  );

  const activeInvitedShifts = invitedShifts.filter(s => s.status === 'pending' || s.status === 'accepted');
  const pastOrCancelledInvitedShifts = invitedShifts.filter(s => s.status === 'cancelled');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <Handshake className="w-10 h-10 mr-3" />
          Turnos a los que fui Invitado
        </h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/user">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mis Turnos Creados
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="w-full shadow-lg">
              <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter><Skeleton className="h-10 w-1/3" /></CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <Handshake className="w-6 h-6 mr-3 text-accent" />
              Invitaciones Activas
            </h2>
            {activeInvitedShifts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeInvitedShifts.map(shift => (
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    currentUserRole="user" 
                    currentUserId={user?.id} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-card/50 rounded-lg border border-dashed border-border">
                <Image src="https://placehold.co/128x128.png" alt="No invitations" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="empty envelope" />
                <p className="text-muted-foreground">No tienes invitaciones a turnos activos.</p>
                <p className="text-sm text-muted-foreground/80">Cuando te inviten a un turno, aparecerá aquí.</p>
              </div>
            )}
          </section>

          {pastOrCancelledInvitedShifts.length > 0 && (
            <section>
              <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
                <CalendarOff className="w-6 h-6 mr-3 text-accent" />
                Invitaciones Anteriores o Canceladas
              </h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {pastOrCancelledInvitedShifts.map(shift => (
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    currentUserRole="user"
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
