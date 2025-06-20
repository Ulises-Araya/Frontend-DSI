
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUserMock } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { CreateShiftForm } from '@/components/dashboard/CreateShiftForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarDays, Archive, MailCheck, ArrowRight, BookOpen, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Link from 'next/link';

export default function UserDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [allUserShifts, setAllUserShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUserMock();
    setUser(fetchedUser);
    if (fetchedUser) {
      const fetchedAllUserShifts = await getUserShifts(); // Fetches created and invited shifts
      setAllUserShifts(fetchedAllUserShifts);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);
  
  const todayForCompare = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const myUpcomingCreatedShifts = useMemo(() => {
    if (!user) return [];
    return allUserShifts
      .filter(s => 
        s.creatorId === user.id &&
        (s.status === 'pending' || s.status === 'accepted') &&
        new Date(s.date + 'T00:00:00Z') >= todayForCompare // Ensure UTC comparison if dates are stored as YYYY-MM-DD
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ascending by date
  }, [allUserShifts, user, todayForCompare]);

  const historicalShifts = useMemo(() => {
    if (!user || !user.dni) return [];
    return allUserShifts
      .filter(s => 
        (s.creatorId === user.id || (s.invitedUserDnis && s.invitedUserDnis.includes(user.dni))) &&
        (s.status === 'cancelled' || new Date(s.date + 'T00:00:00Z') < todayForCompare)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending by date
  }, [allUserShifts, user, todayForCompare]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <BookOpen className="w-10 h-10 mr-3" /> Mis Turnos Creados
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="group w-full sm:w-auto">
                <PlusCircle className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                Crear Nuevo Turno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-primary">Nuevo Turno</DialogTitle>
                <DialogDescription className="text-muted-foreground">Completa los detalles para agendar tu turno.</DialogDescription>
              </DialogHeader>
              <CreateShiftForm onShiftCreated={() => { loadData(); setIsCreateModalOpen(false); }} setOpen={setIsCreateModalOpen} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild className="group w-full sm:w-auto">
            <Link href="/dashboard/user/invited-shifts">
              <MailCheck className="w-5 h-5 mr-2" />
              Mis Invitaciones
              <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform"/>
            </Link>
          </Button>
        </div>
      </div>

      {isLoading || !user ? (
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
          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <CalendarDays className="w-6 h-6 mr-3 text-accent" />
              Mis Próximos Turnos Creados
            </h2>
            {myUpcomingCreatedShifts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {myUpcomingCreatedShifts.map(shift => (
                  user.dni && 
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
                <Image src="https://placehold.co/128x128.png" alt="Empty state illustration" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="empty calendar" />
                <p className="text-muted-foreground">No tienes próximos turnos creados.</p>
                <p className="text-sm text-muted-foreground/80">Crea uno nuevo para empezar.</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <History className="w-6 h-6 mr-3 text-accent" /> {/* Changed icon */}
              Historial de Turnos
            </h2>
            {historicalShifts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {historicalShifts.map(shift => (
                  user.dni &&
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
                 <Image src="https://placehold.co/128x128.png" alt="Empty history illustration" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="archive box empty" />
                <p className="text-muted-foreground">No tienes turnos en tu historial.</p>
                <p className="text-sm text-muted-foreground/80">Los turnos pasados o cancelados aparecerán aquí.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
