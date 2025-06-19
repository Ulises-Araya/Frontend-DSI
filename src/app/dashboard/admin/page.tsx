
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { Shift, ShiftStatus } from '@/lib/types';
import { getAllShiftsAdmin } from '@/lib/actions';
import { ShiftCard } from '@/components/dashboard/ShiftCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { Search, FilterX, ShieldCheck, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export default function AdminDashboardPage() {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShiftStatus | 'all'>('all');
  const [filterArea, setFilterArea] = useState('');

  async function loadAllShifts() {
    setIsLoading(true);
    const fetchedShifts = await getAllShiftsAdmin();
    setAllShifts(fetchedShifts);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAllShifts();
  }, []);

  const handleShiftStatusUpdate = (updatedShiftId: string, newStatus: ShiftStatus) => {
    setAllShifts(prevShifts => 
      prevShifts.map(shift => 
        shift.id === updatedShiftId ? { ...shift, status: newStatus } : shift
      )
    );
  };

  const filteredShifts = useMemo(() => {
    return allShifts.filter(shift => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (shift.creatorFullName?.toLowerCase().includes(searchTermLower) ||
         shift.creatorDni?.includes(searchTermLower) ||
         shift.theme.toLowerCase().includes(searchTermLower));
      
      const matchesStatus = filterStatus === 'all' || shift.status === filterStatus;
      const matchesArea = filterArea === '' || shift.area.toLowerCase().includes(filterArea.toLowerCase());

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [allShifts, searchTerm, filterStatus, filterArea]);

  const uniqueAreas = useMemo(() => {
    const areas = new Set(allShifts.map(shift => shift.area));
    return Array.from(areas);
  }, [allShifts]);
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterArea('');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline text-primary flex items-center">
          <ShieldCheck className="w-10 h-10 mr-3" />
          Panel de Administración
        </h1>
      </div>

      <Card className="bg-card/70 backdrop-blur-sm border-primary/20">
        <CardHeader>
            <h2 className="text-xl font-headline text-foreground/90">Filtrar Turnos</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground">Buscar (Usuario, DNI, Temática)</label>
            <Input
              id="searchTerm"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background/70"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filterStatus" className="text-sm font-medium text-muted-foreground">Estado</label>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as ShiftStatus | 'all')}>
              <SelectTrigger id="filterStatus" className="bg-background/70">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="filterArea" className="text-sm font-medium text-muted-foreground">Área</label>
             <Select value={filterArea} onValueChange={(value) => setFilterArea(value === 'all' ? '' : value)}>
              <SelectTrigger id="filterArea" className="bg-background/70">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                {uniqueAreas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={clearFilters} variant="outline" className="w-full lg:w-auto group">
            <FilterX className="w-4 h-4 mr-2 group-hover:text-destructive transition-colors" />
            Limpiar Filtros
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredShifts.map(shift => (
            <ShiftCard 
              key={shift.id} 
              shift={shift} 
              currentUserRole="admin" 
              onStatusChange={handleShiftStatusUpdate}
            />
          ))}
        </div>
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
