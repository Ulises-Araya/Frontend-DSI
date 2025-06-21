
"use client";

import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/actions';
import { UpdateProfileForm } from '@/components/dashboard/settings/UpdateProfileForm';
import { ChangePasswordForm } from '@/components/dashboard/settings/ChangePasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings as SettingsIcon, UserCog, KeyRound, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UpdateProfilePictureForm } from '@/components/dashboard/settings/UpdateProfilePictureForm';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const fetchedUser = await getCurrentUser();
      if (!fetchedUser) {
        router.push('/login');
      } else {
        setUser(fetchedUser);
      }
      setIsLoading(false);
    }
    loadUser();
  }, [router]);

  const handleProfileUpdate = (updatedUser: User) => {
    // This function can now be used by both forms to update the user state
    setUser(updatedUser);
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
          <ImageIcon className="w-7 h-7 text-accent" />
          <div>
            <CardTitle className="font-headline text-2xl text-foreground/90">Foto de Perfil</CardTitle>
            <CardDescription className="text-muted-foreground">Actualiza tu imagen de perfil.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UpdateProfilePictureForm currentUser={user} onProfileUpdate={handleProfileUpdate} />
        </CardContent>
      </Card>
      
      <Card className="bg-card/70 backdrop-blur-sm border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3">
          <UserCog className="w-7 h-7 text-accent" />
          <div>
            <CardTitle className="font-headline text-2xl text-foreground/90">Actualizar Perfil</CardTitle>
            <CardDescription className="text-muted-foreground">Modifica tu nombre y email.</CardDescription>
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
