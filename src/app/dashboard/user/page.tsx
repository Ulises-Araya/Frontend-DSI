
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUser } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { CreateShiftForm } from '@/components/dashboard/CreateShiftForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarClock, Archive, MailCheck, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const ITEMS_PER_PAGE_HISTORY = 3;

export default function UserDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userCreatedShifts, setUserCreatedShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
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
    const fetchedShifts = await getUserShifts(); 
    const created = fetchedShifts.filter(shift => shift.creatorId === fetchedUser.id);
    setUserCreatedShifts(created);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayForCompare = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }, []);

  const turnosActuales = useMemo(() => {
    return userCreatedShifts
      .filter(s => {
        const shiftDate = new Date(s.date + 'T00:00:00Z');
        return shiftDate >= todayForCompare && (s.status === 'pendiente' || s.status === 'aceptado');
      })
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [userCreatedShifts, todayForCompare]);

  const historialDeTurnosCreados = useMemo(() => {
    return userCreatedShifts
      .filter(s => {
        const shiftDate = new Date(s.date + 'T00:00:00Z');
        return shiftDate < todayForCompare || s.status === 'cancelado';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userCreatedShifts, todayForCompare]);

  const totalHistoryPages = useMemo(() => {
    return Math.ceil(historialDeTurnosCreados.length / ITEMS_PER_PAGE_HISTORY);
  }, [historialDeTurnosCreados.length]);

  const paginatedHistorialShifts = useMemo(() => {
    const startIndex = (currentHistoryPage - 1) * ITEMS_PER_PAGE_HISTORY;
    const endIndex = startIndex + ITEMS_PER_PAGE_HISTORY;
    return historialDeTurnosCreados.slice(startIndex, endIndex);
  }, [historialDeTurnosCreados, currentHistoryPage]);

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
              <Button className="group w-full sm:w-auto" disabled={!user}>
                <PlusCircle className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                Crear Nuevo Turno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-primary">Nuevo Turno</DialogTitle>
                <DialogDescription className="text-muted-foreground">Completa los detalles para agendar tu turno.</DialogDescription>
              </DialogHeader>
              <CreateShiftForm 
                currentUser={user}
                onShiftCreated={() => { loadData(); setIsCreateModalOpen(false); setCurrentHistoryPage(1); }} 
                setOpen={setIsCreateModalOpen} 
              />
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild className="group w-full sm:w-auto" disabled={!user}>
            <Link href="/dashboard/user/invited-shifts">
              <MailCheck className="w-5 h-5 mr-2" />
              Mis Invitaciones
              <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform"/>
            </Link>
          </Button>
        </div>
      </div>
      
      <Separator />

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
                    onShiftUpdate={() => { loadData(); setCurrentHistoryPage(1);}} 
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

          <Separator />

          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <Archive className="w-6 h-6 mr-3 text-accent" />
              Historial de Turnos Creados
            </h2>
            {historialDeTurnosCreados.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedHistorialShifts.map(shift => (
                    user.dni &&
                    <ShiftCard 
                      key={shift.id} 
                      shift={shift} 
                      currentUserRole="user"
                      currentUserId={user.id} 
                      currentUserDni={user.dni}
                      onShiftUpdate={() => { loadData(); setCurrentHistoryPage(1);}} 
                    />
                  ))}
                </div>
                {historialDeTurnosCreados.length > ITEMS_PER_PAGE_HISTORY && (
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentHistoryPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentHistoryPage === 1}
                      aria-label="Página anterior del historial"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentHistoryPage} de {totalHistoryPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                      disabled={currentHistoryPage === totalHistoryPages}
                      aria-label="Siguiente página del historial"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
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
