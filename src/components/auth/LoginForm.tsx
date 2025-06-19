
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
import { loginUser } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { BookOpenText, KeyRound } from "lucide-react";

const LoginSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const [state, formAction, isActionPending] = useActionState(loginUser, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
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
    }
    // Successful login redirects, so no toast needed here
  }, [state, toast]);

  const onValidSubmit = (
    _data: LoginFormValues, 
    event?: React.BaseSyntheticEvent<object, any, any>
  ) => {
    if (event && event.target instanceof HTMLFormElement) {
      const formData = new FormData(event.target);
      startTransition(() => {
        formAction(formData);
      });
    } else {
      const formData = new FormData();
      formData.append('dni', _data.dni);
      formData.append('password', _data.password);
      startTransition(() => {
        formAction(formData);
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30">
      <CardHeader className="text-center">
        <BookOpenText className="w-12 h-12 mx-auto mb-4 text-primary" />
        <CardTitle className="font-headline text-3xl">Iniciar Sesión</CardTitle>
        <CardDescription className="text-muted-foreground">Accede a tu cuenta para gestionar tus turnos.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onValidSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dni" className="text-foreground/80">DNI</Label>
            <Input
              id="dni"
              type="text"
              placeholder="Tu número de DNI"
              {...form.register("dni")}
              className="bg-background/70 border-border focus:border-primary"
            />
            {form.formState.errors.dni && <p className="text-sm text-destructive">{form.formState.errors.dni.message}</p>}
            {state?.errors?.dni && <p className="text-sm text-destructive">{state.errors.dni[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground/80">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Tu contraseña"
              {...form.register("password")}
              className="bg-background/70 border-border focus:border-primary"
            />
            {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
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
