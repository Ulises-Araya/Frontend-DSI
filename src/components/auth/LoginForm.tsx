"use client";

import { useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { BookOpenText, KeyRound } from "lucide-react";
import type { ActionResponse } from "@/lib/types";
import Image from 'next/image';

const LoginSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const [state, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(loginUser, null);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema), // RHF para validación del lado del cliente
    defaultValues: {
      dni: "",
      password: "",
    },
  });

  useEffect(() => {
    if (state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: state.message,
      });
      // Nota: `form.setError` no se sincronizará automáticamente con `state.errors`
      // cuando se usa `<form action={formAction}>`. Los errores de `state.errors`
      // deben mostrarse directamente o mediante un manejo diferente si se usa RHF de esta forma.
      // Por simplicidad, el error general se muestra con el toast y debajo de los campos.
    }
    // No se necesita un `else if (state?.type === 'success')` para la redirección,
    // ya que el `redirect()` en la Server Action debería haber ocurrido.
  }, [state, toast]);

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30">
      <CardHeader className="text-center">
        <Image src="/icono2.png" alt="Icono" width={110} height={100} className="w-50 h-auto mx-auto mb-2" />
        <CardTitle className="font-headline text-3xl">Iniciar Sesión</CardTitle>
        <CardDescription className="text-muted-foreground">Accede a tu cuenta para gestionar tus turnos.</CardDescription>
      </CardHeader>
      {/* La Server Action se pasa directamente al 'action' del formulario */}
      <form action={formAction}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni" // 'name' es crucial para que FormData lo recoja
              type="text"
              placeholder="Tu número de DNI"
              {...form.register("dni")} // RHF puede controlar el input para validación UI
              className="bg-background/70 border-border focus:border-primary"
            />
            {/* Mostrar error de validación de RHF (lado del cliente) */}
            {form.formState.errors.dni && <p className="text-sm text-destructive mt-1">{form.formState.errors.dni.message}</p>}
            {/* Mostrar error del DNI desde la Server Action */}
            {state?.errors?.dni && <p className="text-sm text-destructive mt-1">{state.errors.dni[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password" // 'name' es crucial para que FormData lo recoja
              type="password"
              placeholder="Tu contraseña"
              {...form.register("password")} // RHF puede controlar el input para validación UI
              className="bg-background/70 border-border focus:border-primary"
            />
            {/* Mostrar error de validación de RHF (lado del cliente) */}
            {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
            {/* Mostrar error de contraseña desde la Server Action */}
            {state?.errors?.password && <p className="text-sm text-destructive mt-1">{state.errors.password[0]}</p>}
          </div>
          {/* Mostrar error general de la Server Action si no es específico de un campo */}
          {state?.type === 'error' && state.message && !state.errors?.dni && !state.errors?.password && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full group relative" disabled={isActionPending}>
            {isActionPending ? "Ingresando..." : "Iniciar Sesión"}
            <KeyRound className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
          </Button>
          <Button variant="link" asChild className="text-accent hover:text-accent/80">
            <Link href="/register">¿No tienes cuenta? Regístrate</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
