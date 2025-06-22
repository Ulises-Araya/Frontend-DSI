
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { logoutUser, getCurrentUser } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { LogOut, Settings, UserCircle, LayoutDashboard, MailCheck, Tent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (!currentUser) { 
        if (router.pathname !== '/login') {
            router.push('/login');
        }
      }
    }
    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);


  useEffect(() => {
    // This interval is useful for multi-tab scenarios, but can be taxing.
    // It ensures that if a user logs out in one tab, the UI updates in another.
    const interval = setInterval(async () => {
      const potentiallyUpdatedUser = await getCurrentUser();
      // Simple string comparison is cheaper than deep object comparison
      if (JSON.stringify(user) !== JSON.stringify(potentiallyUpdatedUser)) {
        setUser(potentiallyUpdatedUser);
        if (!potentiallyUpdatedUser) {
           router.push('/login');
        }
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [user, router]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null); 
    // Redirection now happens inside logoutUser
  };
  
  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl mb-2 mt-2">
        <Link href={user?.role === 'admin' ? "/dashboard/admin" : "/dashboard/user"} className="mr-6 flex items-center space-x-2">
          <Image src="/icono.png" alt="Icono" width={50} height={100} className="w-50 h-auto mx-auto ml-6" />
          <Image src="/logo2.png" alt="Logo" width={150} height={100} className="w-50 h-auto mx-auto" />
        </Link>
        
        <div className="flex items-center space-x-3 mr-6">
          {user ? ( // Solo mostrar si el usuario está cargado
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-primary/50">
                    <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} data-ai-hint="user avatar" />
                    <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email} ({user.role})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(user.role === 'admin' ? '/dashboard/admin' : '/dashboard/user')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>{user.role === 'admin' ? 'Panel Admin' : 'Mis Turnos Creados'}</span>
                </DropdownMenuItem>
                {user.role === 'user' && (
                  <DropdownMenuItem onClick={() => router.push('/dashboard/user/invited-shifts')}>
                    <MailCheck className="mr-2 h-4 w-4" />
                    <span>Mis Invitaciones</span>
                  </DropdownMenuItem>
                )}
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/dashboard/admin/rooms')}>
                    <Tent className="mr-2 h-4 w-4" />
                    <span>Gestionar Salas</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <UserCircle className="h-8 w-8 text-muted-foreground animate-pulse" /> // Indicador de carga o no logueado
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
