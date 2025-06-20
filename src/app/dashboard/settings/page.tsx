
"use client";

import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/actions'; // Cambiado
import { UpdateProfileForm } from '@/components/dashboard/settings/UpdateProfileForm';
import { ChangePasswordForm } from '@/components/dashboard/settings/ChangePasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings as SettingsIcon, UserCog, KeyRound, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importar useRouter

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Inicializar useRouter

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const fetchedUser = await getCurrentUser();
      if (!fetchedUser) {
        router.push('/login'); // Redirigir si no hay usuario
      } else {
        setUser(fetchedUser);
      }
      setIsLoading(false);
    }
    loadUser();
  }, [router]);

  const handleProfileUpdate = (updatedUser: User) => {
    // La foto de perfil (profilePictureUrl) se gestiona localmente en el form y el header por ahora,
    // ya que el backend provisto no la almacena. El `updatedUser` de la acción `updateUserProfile`
    // contendrá los datos del backend (nombre, email) y el `profilePictureUrl` que ya tenía el usuario en el frontend.
    setUser(prevUser => ({
      ...(prevUser || {} as User), // Mantener datos existentes si prevUser es null
      ...updatedUser, // Aplicar los datos actualizados del backend
      // Asegurar que profilePictureUrl se mantiene si updatedUser no lo trae (porque backend no lo tiene)
      profilePictureUrl: updatedUser.profilePictureUrl !== undefined ? updatedUser.profilePictureUrl : prevUser?.profilePictureUrl 
    }));
  };


  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Card className="bg-card/70 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-full mb-4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // Ya debería haber redirigido, pero como fallback:
    return <p className="text-center text-muted-foreground">No se pudo cargar la información del usuario. Serás redirigido al login.</p>;
  }

  const dashboardLink = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/user';

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-10 h-10 text-primary" />
          <h1 className="text-3xl md:text-4xl font-headline text-primary">
            Configuración de Cuenta
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href={dashboardLink}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Panel
          </Link>
        </Button>
      </div>
      
      <Card className="bg-card/70 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3">
          <UserCog className="w-7 h-7 text-accent" />
          <div>
            <CardTitle className="font-headline text-2xl text-foreground/90">Actualizar Perfil</CardTitle>
            <CardDescription className="text-muted-foreground">Modifica tu nombre, email y foto de perfil.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm currentUser={user} onProfileUpdate={handleProfileUpdate} />
        </CardContent>
      </Card>

      <Separator className="my-8 border-border/50" />

      <Card className="bg-card/70 backdrop-blur-sm border-primary/20 shadow-lg">
         <CardHeader className="flex flex-row items-center gap-3">
          <KeyRound className="w-7 h-7 text-accent" />
          <div>
            <CardTitle className="font-headline text-2xl text-foreground/90">Cambiar Contraseña</CardTitle>
            <CardDescription className="text-muted-foreground">Actualiza tu contraseña de acceso.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
