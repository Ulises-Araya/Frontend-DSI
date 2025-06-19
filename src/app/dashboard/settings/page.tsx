
"use client";

import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUserMock } from '@/lib/actions';
import { UpdateProfileForm } from '@/components/dashboard/settings/UpdateProfileForm';
import { ChangePasswordForm } from '@/components/dashboard/settings/ChangePasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings as SettingsIcon, UserCog, KeyRound } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const fetchedUser = await getCurrentUserMock();
      setUser(fetchedUser);
      setIsLoading(false);
    }
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="bg-card/70 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
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
    return <p className="text-center text-muted-foreground">No se pudo cargar la información del usuario.</p>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-10 h-10 text-primary" />
        <h1 className="text-3xl md:text-4xl font-headline text-primary">
          Configuración de Cuenta
        </h1>
      </div>
      
      <Card className="bg-card/70 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3">
          <UserCog className="w-7 h-7 text-accent" />
          <div>
            <CardTitle className="font-headline text-2xl text-foreground/90">Actualizar Perfil</CardTitle>
            <CardDescription className="text-muted-foreground">Modifica tu nombre completo y dirección de email.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm currentUser={user} />
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
