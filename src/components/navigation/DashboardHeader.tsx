
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { logoutUser, getCurrentUserMock } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { LogOut, Settings, UserCircle, LayoutDashboard, MailCheck } from 'lucide-react';
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

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const currentUser = await getCurrentUserMock();
      setUser(currentUser);
      if (!currentUser) { 
        router.push('/login');
      }
    }
    fetchUser();
  }, [router]);


  // Effect to update user state if it changes globally (e.g., after profile update)
  // This is a bit of a trick for mock state. In a real app with a proper auth provider, this might be handled by the provider.
  useEffect(() => {
    const interval = setInterval(async () => {
      const potentiallyUpdatedUser = await getCurrentUserMock();
      if (JSON.stringify(user) !== JSON.stringify(potentiallyUpdatedUser)) {
        setUser(potentiallyUpdatedUser);
      }
    }, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
  };
  
  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl">
        <Link href={user?.role === 'admin' ? "/dashboard/admin" : "/dashboard/user"} className="mr-6 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
             <path d="M12 22V12"></path>
             <path d="M20 12v5"></path>
             <path d="M4 12v5"></path>
             <path d="M16.5 10.5l-3-1.73"></path>
             <path d="M7.5 10.5l3-1.73"></path>
          </svg>
          <span className="font-headline text-lg font-bold text-primary">ArborVitae Scheduler</span>
        </Link>
        
        <div className="flex items-center space-x-3">
          {user && (
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
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
