
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
import { requestPasswordReset } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { MailQuestion, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ActionResponse } from "@/lib/types";

const ForgotPasswordSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [state, formAction, isActionPending] = useActionState<ActionResponse, FormData>(
    requestPasswordReset,
    null
  );
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      dni: "",
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
        title: "Solicitud Enviada",
        description: state.message,
      });
      // Redirect using data from the action state
      if (state.resetData?.dni && state.resetData?.token) {
        const { dni, token } = state.resetData;
        router.push(`/reset-password?dni=${encodeURIComponent(dni)}&token=${encodeURIComponent(token)}`);
      }
      form.reset();
    }
  }, [state, toast, router, form]);

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm border-primary/30">
      <CardHeader className="text-center">
        <MailQuestion className="w-12 h-12 mx-auto mb-4 text-primary" />
        <CardTitle className="font-headline text-3xl">Recuperar Contraseña</CardTitle>
        <CardDescription className="text-muted-foreground">Ingresa tu DNI para iniciar el proceso.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dni" className="text-foreground/80">DNI</Label>
            <Input
              id="dni"
              name="dni"
              type="text"
              placeholder="Tu número de DNI"
              {...form.register("dni")}
              className="bg-background/70 border-border focus:border-primary"
            />
            {form.formState.errors.dni && <p className="text-sm text-destructive">{form.formState.errors.dni.message}</p>}
            {state?.errors?.dni && <p className="text-sm text-destructive">{state.errors.dni[0]}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full group relative" disabled={isActionPending}>
            {isActionPending ? "Procesando..." : "Enviar Instrucciones"}
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
