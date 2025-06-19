
"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Feather, UserPlus } from "lucide-react";

const RegisterSchema = z.object({
  fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  dni: z.string().min(7, "DNI debe tener al menos 7 caracteres").max(8, "DNI debe tener como máximo 8 caracteres"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export function RegisterForm() {
  const [state, formAction, isActionPending] = useActionState(registerUser, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      dni: "",
      password: "",
      confirmPassword: "",
    },
  });

 useEffect(() => {
    if (state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: state.message,
      });
    } else if (state?.type === 'success') {
      toast({
        title: "Registro Exitoso",
        description: state.message,
      });
      form.reset(); // Reset form on successful registration
    }
  }, [state, toast, form]);

  const onValidSubmit = (
    _data: RegisterFormValues,
    event?: React.BaseSyntheticEvent<object, any, any>
  ) => {
    if (event && event.target instanceof HTMLFormElement) {
      const formData = new FormData(event.target);
      startTransition(() => {
        formAction(formData);
      });
    } else {
      // Fallback: construct FormData from RHF's validated data.
      const formData = new FormData();
      formData.append('fullName', _data.fullName);
      formData.append('email', _data.email);
      formData.append('dni', _data.dni);
      formData.append('password', _data.password);
      formData.append('confirmPassword', _data.confirmPassword);
      startTransition(() => {
        formAction(formData);
      });
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30">
      <CardHeader className="text-center">
        <Feather className="w-12 h-12 mx-auto mb-4 text-primary" />
        <CardTitle className="font-headline text-3xl">Crear Cuenta</CardTitle>
        <CardDescription className="text-muted-foreground">Únete para comenzar a programar tus turnos.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onValidSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input id="fullName" {...form.register("fullName")} className="bg-background/70 border-border focus:border-primary" />
            {form.formState.errors.fullName && <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>}
             {state?.errors?.fullName && <p className="text-sm text-destructive">{state.errors.fullName[0]}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
          </div>
          <div>
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" {...form.register("dni")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.dni && <p className="text-sm text-destructive">{form.formState.errors.dni.message}</p>}
            {state?.errors?.dni && <p className="text-sm text-destructive">{state.errors.dni[0]}</p>}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...form.register("password")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}
            {state?.errors?.confirmPassword && <p className="text-sm text-destructive">{state.errors.confirmPassword[0]}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full group relative" disabled={isActionPending}>
            {isActionPending ? "Creando cuenta..." : "Crear Cuenta"}
            <UserPlus className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
          </Button>
          <Button variant="link" asChild className="text-accent hover:text-accent/80">
            <Link href="/login">¿Ya tienes cuenta? Inicia Sesión</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
