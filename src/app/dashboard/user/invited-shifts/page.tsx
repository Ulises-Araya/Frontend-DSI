
"use client";

import { useEffect, useState } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUserMock } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { Handshake, ArrowLeft, BellRing } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InvitedShiftsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUserMock();
    setUser(fetchedUser);
    if (fetchedUser && fetchedUser.dni) {
      const fetchedShifts = await getUserShifts();
      const invites = fetchedShifts.filter(shift => 
        shift.invitedUserDnis.includes(fetchedUser.dni) && 
        shift.creatorId !== fetchedUser.id &&
        shift.status === 'pending' // Only show pending invitations for action
      ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setPendingInvitations(invites);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <BellRing className="w-10 h-10 mr-3" />
          Invitaciones Pendientes
        </h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/user">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mis Turnos
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
              <CardFooter className="h-10" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {pendingInvitations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pendingInvitations.map(shift => (
                user && user.dni &&
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
              <p className="text-muted-foreground">No tienes invitaciones pendientes.</p>
              <p className="text-sm text-muted-foreground/80">Cuando te inviten a un turno y esté pendiente de tu respuesta, aparecerá aquí.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
