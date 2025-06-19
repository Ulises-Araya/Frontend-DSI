
"use client";

import { useEffect, useState } from 'react';
import type { Shift, User } from '@/lib/types';
import { getUserShifts, getCurrentUserMock } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { CreateShiftForm } from '@/components/dashboard/CreateShiftForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarDays, Archive, Handshake, ArrowRight, BookOpen } from 'lucide-react';
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
      const fetchedShifts = await getUserShifts();
      // Sort shifts: pending/accepted first, then by date (most recent first)
      fetchedShifts.sort((a, b) => {
        const statusOrder = (status: string) => status === 'pending' || status === 'accepted' ? 0 : 1;
        if (statusOrder(a.status) !== statusOrder(b.status)) {
          return statusOrder(a.status) - statusOrder(b.status);
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setAllUserShifts(fetchedShifts);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);
  
  const activeShifts = allUserShifts.filter(s => s.status === 'pending' || s.status === 'accepted');
  const pastOrCancelledShifts = allUserShifts.filter(s => s.status === 'cancelled');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <BookOpen className="w-10 h-10 mr-3" /> Mis Turnos
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
              <Handshake className="w-5 h-5 mr-2" />
              Invitaciones Pendientes
              <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform"/>
            </Link>
          </Button>
        </div>
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
          <section>
            <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
              <CalendarDays className="w-6 h-6 mr-3 text-accent" />
              Turnos Activos (Creados o Invitaciones Aceptadas)
            </h2>
            {activeShifts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeShifts.map(shift => (
                  user && user.dni && // Ensure user and user.dni are available
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
                <p className="text-muted-foreground">No tienes turnos activos.</p>
                <p className="text-sm text-muted-foreground/80">Crea uno nuevo o espera invitaciones.</p>
              </div>
            )}
          </section>

          {pastOrCancelledShifts.length > 0 && (
            <section>
              <h2 className="text-2xl font-headline text-foreground/80 mb-4 flex items-center">
                <Archive className="w-6 h-6 mr-3 text-accent" />
                Turnos Pasados o Cancelados
              </h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {pastOrCancelledShifts.map(shift => (
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
            </section>
          )}
        </>
      )}
    </div>
  );
}
