
"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { User, ActionResponse } from "@/lib/types";
import { updateUserProfile } from "@/lib/actions";
import { Save } from "lucide-react";

const UpdateProfileSchema = z.object({
  fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres."),
  email: z.string().email("Email inválido."),
});

type UpdateProfileFormValues = z.infer<typeof UpdateProfileSchema>;

interface UpdateProfileFormProps {
  currentUser: User;
}

export function UpdateProfileForm({ currentUser }: UpdateProfileFormProps) {
  const [state, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(updateUserProfile, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      fullName: currentUser.fullName || "",
      email: currentUser.email || "",
    },
  });

  useEffect(() => {
    if (state?.type === "success") {
      toast({
        title: "Perfil Actualizado",
        description: state.message,
      });
    } else if (state?.type === "error") {
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: state.message,
      });
    }
  }, [state, toast]);

  useEffect(() => {
    form.reset({
        fullName: currentUser.fullName,
        email: currentUser.email
    })
  }, [currentUser, form])


  const onSubmit = (values: UpdateProfileFormValues) => {
    const formData = new FormData();
    formData.append("fullName", values.fullName);
    formData.append("email", values.email);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-foreground/80">Nombre Completo</Label>
        <Input
          id="fullName"
          {...form.register("fullName")}
          className="bg-background/70 border-border focus:border-primary"
        />
        {form.formState.errors.fullName && <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>}
        {state?.errors?.fullName && <p className="text-sm text-destructive">{state.errors.fullName[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground/80">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          className="bg-background/70 border-border focus:border-primary"
        />
        {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
        {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="dni" className="text-foreground/80">DNI (No editable)</Label>
        <Input
            id="dni"
            type="text"
            value={currentUser.dni}
            disabled
            className="bg-muted/50 border-border cursor-not-allowed"
        />
      </div>

      <Button type="submit" className="group w-full sm:w-auto" disabled={isActionPending}>
        {isActionPending ? "Guardando..." : "Guardar Cambios"}
        <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
      </Button>
    </form>
  );
}
