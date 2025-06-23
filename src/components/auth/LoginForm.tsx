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
    <Card className="w-full max-w-md shadow-lg bg-white/95 border border-[#667b68] pl-4 pr-4 pt-3 pb-2">
      <CardHeader className="text-center">
        <Image src="/icono.png" alt="Icono" width={90} height={90} className="mx-auto mb-2" />
        <CardTitle className="font-serif text-2xl text-[#133337]">Iniciar Sesión</CardTitle>
        <CardDescription className="text-[#6a7358]">Accede a tu cuenta para gestionar tus turnos.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dni" className="text-[#3d271a]">DNI</Label>
            <Input
              id="dni"
              name="dni"
              type="text"
              placeholder="Tu número de DNI"
              {...form.register("dni")}
              className="bg-[#fbfbf0] border-[#aeb6a0] focus:border-[#133337] text-[#133337]"
            />
            {form.formState.errors.dni && <p className="text-sm text-[#c97e3d] mt-1">{form.formState.errors.dni.message}</p>}
            {state?.errors?.dni && <p className="text-sm text-[#c97e3d] mt-1">{state.errors.dni[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#3d271a]">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Tu contraseña"
              {...form.register("password")}
              className="bg-[#fbfbf0] border-[#aeb6a0] focus:border-[#133337] text-[#133337]"
            />
            {form.formState.errors.password && <p className="text-sm text-[#c97e3d] mt-1">{form.formState.errors.password.message}</p>}
            {state?.errors?.password && <p className="text-sm text-[#c97e3d] mt-1">{state.errors.password[0]}</p>}
          </div>
          {state?.type === 'error' && state.message && !state.errors?.dni && !state.errors?.password && (
            <p className="text-sm text-[#c97e3d]">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          disabled={isActionPending}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-[#8ebe8ee6] text-[#384C38] font-serif border border-[#6B8E23] shadow-md transition-all duration-300 hover:bg-[#7fab7fe6] hover:scale-105 hover:ring-2 hover:ring-[#667B68] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#384C38]" />
            {isActionPending ? 'Ingresando...' : 'Iniciar Sesión'}
          </span>
        </Button>
          <div className="flex flex-row justify-center items-center gap-2 text-[#065535] text-sm">
            <Link href="/register" className="hover:underline hover:text-[#133337]">¿No tienes cuenta? Regístrate</Link>
            <span className="text-[#aeb6a0]">|</span>
            <Link href="/forgot-password" className="hover:underline hover:text-[#133337]">¿Olvidaste tu contraseña?</Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}