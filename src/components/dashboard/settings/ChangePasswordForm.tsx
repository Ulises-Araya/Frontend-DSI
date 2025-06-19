
"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ActionResponse } from "@/lib/types";
import { changeUserPassword } from "@/lib/actions";
import { KeyRound, Save } from "lucide-react";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual es requerida."),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>;

export function ChangePasswordForm() {
  const [state, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(changeUserPassword, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (state?.type === "success") {
      toast({
        title: "Contraseña Actualizada",
        description: state.message,
      });
      form.reset();
    } else if (state?.type === "error") {
      toast({
        variant: "destructive",
        title: "Error al Cambiar Contraseña",
        description: state.message,
      });
    }
  }, [state, toast, form]);

  const onSubmit = (values: ChangePasswordFormValues) => {
    const formData = new FormData();
    formData.append("currentPassword", values.currentPassword);
    formData.append("newPassword", values.newPassword);
    formData.append("confirmNewPassword", values.confirmNewPassword);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Contraseña Actual</Label>
        <Input
          id="currentPassword"
          type="password"
          {...form.register("currentPassword")}
          className="bg-background/70 border-border focus:border-primary"
        />
        {form.formState.errors.currentPassword && <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>}
        {state?.errors?.currentPassword && <p className="text-sm text-destructive">{state.errors.currentPassword[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva Contraseña</Label>
        <Input
          id="newPassword"
          type="password"
          {...form.register("newPassword")}
          className="bg-background/70 border-border focus:border-primary"
        />
        {form.formState.errors.newPassword && <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>}
         {state?.errors?.newPassword && <p className="text-sm text-destructive">{state.errors.newPassword[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          {...form.register("confirmNewPassword")}
          className="bg-background/70 border-border focus:border-primary"
        />
        {form.formState.errors.confirmNewPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmNewPassword.message}</p>}
        {state?.errors?.confirmNewPassword && <p className="text-sm text-destructive">{state.errors.confirmNewPassword[0]}</p>}
      </div>

      <Button type="submit" className="group w-full sm:w-auto" disabled={isActionPending}>
        {isActionPending ? "Actualizando..." : "Cambiar Contraseña"}
        <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
      </Button>
    </form>
  );
}
