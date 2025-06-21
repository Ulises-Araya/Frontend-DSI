
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Shift, ShiftStatus, User, Room } from '@/lib/types';
import { getAllShiftsAdmin, getCurrentUser, getManagedRooms } from '@/lib/actions'; // Cambiado
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Search, FilterX, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Importar useRouter

const ITEMS_PER_PAGE_ADMIN = 6;

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShiftStatus | 'all'>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const router = useRouter(); // Inicializar useRouter

  async function loadAdminData() {
    setIsLoading(true);
    try {
        const user = await getCurrentUser();
        if (!user) {
            router.push('/login');
            setIsLoading(false);
            return;
        }
        if (user.role !== 'admin') {
            router.push('/dashboard/user'); // No es admin, redirigir
            setIsLoading(false);
            return;
        }
        setCurrentUser(user);

        const [fetchedShifts, fetchedRooms] = await Promise.all([
            getAllShiftsAdmin(), // Esta sigue siendo local por ahora
            getManagedRooms()    // Esta sigue siendo local por ahora
        ]);
        setAllShifts(fetchedShifts);
        setAvailableRooms(fetchedRooms);
    } catch (error) {
        console.error("Error loading admin data:", error);
        toast({
            variant: "destructive",
            title: "Error de Carga",
            description: "No se pudieron cargar los datos del panel de administración."
        });
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterArea]);


  const filteredShifts = useMemo(() => {
    return allShifts.filter(shift => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (shift.creatorFullName?.toLowerCase().includes(searchTermLower) ||
         shift.creatorDni?.includes(searchTermLower) ||
         shift.theme.toLowerCase().includes(searchTermLower));
      
      const matchesStatus = filterStatus === 'all' || shift.status === filterStatus;
      const matchesArea = filterArea === 'all' || shift.area === filterArea;

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [allShifts, searchTerm, filterStatus, filterArea]);

  const totalAdminPages = useMemo(() => {
    return Math.ceil(filteredShifts.length / ITEMS_PER_PAGE_ADMIN);
  }, [filteredShifts.length]);

  const paginatedAdminShifts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE_ADMIN;
    const endIndex = startIndex + ITEMS_PER_PAGE_ADMIN;
    return filteredShifts.slice(startIndex, endIndex);
  }, [filteredShifts, currentPage]);
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterArea('all');
    setCurrentPage(1);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <ShieldCheck className="w-10 h-10 mr-3" />
          Panel de Administración
        </h1>
        <Button onClick={loadAdminData} variant="outline" size="icon" aria-label="Refrescar datos" disabled={isLoading || !currentUser}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="bg-card/70 backdrop-blur-sm border-primary/20">
        <CardHeader>
            <h2 className="text-xl font-headline text-foreground/90">Filtrar Turnos</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground">Buscar (Usuario, DNI, Temática)</Label>
            <Input
              id="searchTerm"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background/70"
              disabled={!currentUser}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterStatus" className="text-sm font-medium text-muted-foreground">Estado</Label>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as ShiftStatus | 'all')} disabled={!currentUser}>
              <SelectTrigger id="filterStatus" className="bg-background/70">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aceptado">Aceptado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filterArea" className="text-sm font-medium text-muted-foreground">Área</Label>
             <Select value={filterArea} onValueChange={(value) => setFilterArea(value)} disabled={!currentUser || availableRooms.length === 0}>
              <SelectTrigger id="filterArea" className="bg-background/70">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                {availableRooms.map(room => (
                  <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={clearFilters} variant="outline" className="w-full lg:w-auto group" disabled={!currentUser}>
            <FilterX className="w-4 h-4 mr-2 group-hover:text-destructive transition-colors" />
            Limpiar Filtros
          </Button>
        </CardContent>
      </Card>

      {isLoading || !currentUser ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(ITEMS_PER_PAGE_ADMIN)].map((_, i) => (
            <Card key={i} className="w-full shadow-lg">
              <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2 pt-2 border-t" />
              </CardContent>
              <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredShifts.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginatedAdminShifts.map(shift => (
              currentUser && currentUser.dni && currentUser.id && // Ya verificado arriba, pero por si acaso
              <ShiftCard 
                key={shift.id} 
                shift={shift} 
                currentUserRole="admin"
                currentUserId={currentUser.id}
                currentUserDni={currentUser.dni}
                onShiftUpdate={loadAdminData}
              />
            ))}
          </div>
          {filteredShifts.length > ITEMS_PER_PAGE_ADMIN && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalAdminPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalAdminPages))}
                disabled={currentPage === totalAdminPages}
                aria-label="Siguiente página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-card/50 rounded-lg border border-dashed border-border">
          <Image src="https://placehold.co/128x128.png" alt="No results illustration" width={80} height={80} className="mx-auto mb-4 opacity-60" data-ai-hint="magnifying glass empty"/>
          <p className="text-xl text-muted-foreground">No se encontraron turnos.</p>
          <p className="text-sm text-muted-foreground/80">Intenta ajustar los filtros o revisa más tarde.</p>
        </div>
      )}
    </div>
  );
}
