
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUserMock } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { CreateShiftForm } from '@/components/dashboard/CreateShiftForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarClock, Archive, MailCheck, ArrowRight, BookOpen } from 'lucide-react';
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
  const [userCreatedShifts, setUserCreatedShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const fetchedUser = await getCurrentUserMock();
    setUser(fetchedUser);
    if (fetchedUser) {
      const fetchedShifts = await getUserShifts(); 
      const created = fetchedShifts.filter(shift => shift.creatorId === fetchedUser.id);
      setUserCreatedShifts(created);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);
  
  const todayForCompare = useMemo(() => {
    const now = new Date();
    // Create a new date object representing the start of today in UTC for consistent comparison
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }, []);

  const turnosActuales = useMemo(() => {
    return userCreatedShifts
      .filter(s => {
        const shiftDate = new Date(s.date + 'T00:00:00Z'); // Shift date is already UTC midnight
        return shiftDate >= todayForCompare && (s.status === 'pending' || s.status === 'accepted');
      })
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ascending
  }, [userCreatedShifts, todayForCompare]);

  const historialDeTurnosCreados = useMemo(() => {
    return userCreatedShifts
      .filter(s => {
        const shiftDate = new Date(s.date + 'T00:00:00Z'); // Shift date is already UTC midnight
        return shiftDate < todayForCompare || s.status === 'cancelled';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending
  }, [userCreatedShifts, todayForCompare]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <BookOpen className="w-10 h-10 mr-3" /> 
          Mis Turnos Creados
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
              <CalendarClock className="w-6 h-6 mr-3 text-accent" />
              Turnos Actuales
            </h2>
            {turnosActuales.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {turnosActuales.map(shift => (
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
                <p className="text-muted-foreground">No tienes turnos actuales creados.</p>
                <p className="text-sm text-muted-foreground/80">Los turnos activos para hoy o fechas futuras que hayas creado aparecerán aquí.</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <Archive className="w-6 h-6 mr-3 text-accent" />
              Historial de Turnos Creados
            </h2>
            {historialDeTurnosCreados.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {historialDeTurnosCreados.map(shift => (
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
                <p className="text-muted-foreground">No tienes turnos creados en tu historial.</p>
                <p className="text-sm text-muted-foreground/80">Los turnos pasados o cancelados que hayas creado aparecerán aquí.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
