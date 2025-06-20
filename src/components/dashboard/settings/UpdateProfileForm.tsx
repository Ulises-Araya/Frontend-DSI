
"use client";

import { useActionState, useEffect, useTransition, useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { User, ActionResponse } from "@/lib/types";
import { updateUserProfile } from "@/lib/actions";
import { Save, UserCircle, UploadCloud, Trash2 } from "lucide-react";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UpdateProfileSchema = z.object({
  fullName: z.string().min(3, "Nombre completo debe tener al menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  profilePicture: z.instanceof(File).optional().nullable(),
  removeProfilePicture: z.string().optional(), // 'true' or undefined
});

type UpdateProfileFormValues = z.infer<typeof UpdateProfileSchema>;

interface UpdateProfileFormProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
}

export function UpdateProfileForm({ currentUser, onProfileUpdate }: UpdateProfileFormProps) {
  const [state, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(updateUserProfile, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(currentUser.profilePictureUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      fullName: currentUser.fullName || "",
      email: currentUser.email || "",
      profilePicture: null,
      removeProfilePicture: undefined,
    },
  });

  useEffect(() => {
    if (state?.type === "success" && state.user) { // Assuming action returns the updated user
      toast({
        title: "Perfil Actualizado",
        description: state.message,
      });
      onProfileUpdate(state.user as User); // Notify parent about the update
      setImagePreview((state.user as User).profilePictureUrl || null);
      form.setValue('profilePicture', null); // Clear the file input from RHF
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear the actual file input
      }
      form.setValue('removeProfilePicture', undefined); // Reset remove flag
    } else if (state?.type === "error") {
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: state.message,
      });
    }
  }, [state, toast, form, onProfileUpdate]);

  useEffect(() => {
    form.reset({
        fullName: currentUser.fullName,
        email: currentUser.email,
        profilePicture: null,
        removeProfilePicture: undefined,
    });
    setImagePreview(currentUser.profilePictureUrl || null);
  }, [currentUser, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("profilePicture", file);
      form.setValue("removeProfilePicture", undefined); // If new file is selected, don't remove
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("profilePicture", null);
      // Optional: if no file is selected, revert to original or clear preview
      // setImagePreview(currentUser.profilePictureUrl || null);
    }
  };

  const handleRemovePicture = () => {
    setImagePreview(null);
    form.setValue("profilePicture", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    form.setValue("removeProfilePicture", "true");
  }

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  const onSubmit = (values: UpdateProfileFormValues) => {
    const formData = new FormData();
    formData.append("fullName", values.fullName);
    formData.append("email", values.email);
    if (values.profilePicture) {
      formData.append("profilePicture", values.profilePicture);
    }
    if (values.removeProfilePicture === "true") {
        formData.append("removeProfilePicture", "true");
    }
    
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-foreground/80">Foto de Perfil</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-primary/50">
            <AvatarImage src={imagePreview || undefined} alt={currentUser.fullName} data-ai-hint="user profile picture" />
            <AvatarFallback className="text-2xl">
              {imagePreview ? <UserCircle className="w-10 h-10" /> : getInitials(currentUser.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="group">
              <UploadCloud className="w-4 h-4 mr-2 opacity-70 group-hover:opacity-100 transition-opacity" />
              Cambiar Foto
            </Button>
            <Input
              id="profilePicture"
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            { (imagePreview || currentUser.profilePictureUrl) && (
                <Button type="button" variant="destructive" size="sm" onClick={handleRemovePicture} className="group">
                    <Trash2 className="w-4 h-4 mr-2 opacity-70 group-hover:opacity-100 transition-opacity"/>
                    Quitar Foto
                </Button>
            )}
          </div>
        </div>
        {form.formState.errors.profilePicture && <p className="text-sm text-destructive">{form.formState.errors.profilePicture.message}</p>}
        {state?.errors?.profilePicture && <p className="text-sm text-destructive">{state.errors.profilePicture[0]}</p>}
      </div>

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
