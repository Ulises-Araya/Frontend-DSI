
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
import { resetPasswordWithToken } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, ShieldCheck, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ActionResponse } from "@/lib/types";

const ResetPasswordSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  token: z.string().min(1, "Token es requerido"),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres"),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmNewPassword"],
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export function ResetPasswordForm() {
  const [state, formAction, isActionPending] = useActionState<ActionResponse, FormData>(resetPasswordWithToken, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const initialDni = searchParams.get("dni") || "";
  const initialToken = searchParams.get("token") || "";

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      dni: initialDni,
      token: initialToken,
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    } else if (state?.type === 'success') {
      toast({
        title: "Contraseña Restablecida",
        description: state.message,
      });
      // Redirect to login handled by server action
    }
  }, [state, toast]);

  useEffect(() => {
    // Pre-fill DNI and Token if they come from searchParams
    const dniFromParams = searchParams.get("dni");
    const tokenFromParams = searchParams.get("token");
    if (dniFromParams) {
      form.setValue("dni", dniFromParams);
    }
    if (tokenFromParams) {
      form.setValue("token", tokenFromParams);
    }
  }, [searchParams, form]);


  const onValidSubmit = (values: ResetPasswordFormValues) => {
    const formData = new FormData();
    formData.append('dni', values.dni);
    formData.append('token', values.token);
    formData.append('newPassword', values.newPassword);
    formData.append('confirmNewPassword', values.confirmNewPassword);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30">
      <CardHeader className="text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
        <CardTitle className="font-headline text-3xl">Restablecer Contraseña</CardTitle>
        <CardDescription className="text-muted-foreground">Ingresa el token recibido y tu nueva contraseña.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onValidSubmit)}>
        <CardContent className="space-y-4">
          {/* DNI and Token fields are hidden if pre-filled by URL params, otherwise shown for manual input */}
          {initialDni && initialToken ? (
            <>
              <input type="hidden" {...form.register("dni")} />
              <input type="hidden" {...form.register("token")} />
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" {...form.register("dni")} className="bg-background/70 border-border focus:border-primary" />
                {form.formState.errors.dni && <p className="text-sm text-destructive">{form.formState.errors.dni.message}</p>}
                {state?.errors?.dni && <p className="text-sm text-destructive">{state.errors.dni[0]}</p>}
              </div>
              <div>
                <Label htmlFor="token">Token</Label>
                <Input id="token" {...form.register("token")} className="bg-background/70 border-border focus:border-primary" />
                {form.formState.errors.token && <p className="text-sm text-destructive">{form.formState.errors.token.message}</p>}
                {state?.errors?.token && <p className="text-sm text-destructive">{state.errors.token[0]}</p>}
              </div>
            </>
          )}
          <div>
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input id="newPassword" type="password" {...form.register("newPassword")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.newPassword && <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>}
            {state?.errors?.newPassword && <p className="text-sm text-destructive">{state.errors.newPassword[0]}</p>}
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</Label>
            <Input id="confirmNewPassword" type="password" {...form.register("confirmNewPassword")} className="bg-background/70 border-border focus:border-primary"/>
            {form.formState.errors.confirmNewPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmNewPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full group relative" disabled={isActionPending}>
            {isActionPending ? "Restableciendo..." : "Restablecer Contraseña"}
            <KeyRound className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
          </Button>
           <Button variant="link" asChild className="text-accent hover:text-accent/80">
            <Link href="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
