
"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateProfilePicture } from "@/lib/actions";
import type { ActionResponse, User } from "@/lib/types";
import { UploadCloud, X } from "lucide-react";

interface UpdateProfilePictureFormProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
}

export function UpdateProfilePictureForm({ currentUser, onProfileUpdate }: UpdateProfilePictureFormProps) {
  const [state, formAction, isActionPending] = useActionState<ActionResponse | null, FormData>(updateProfilePicture, null);
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(currentUser.profilePictureUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  useEffect(() => {
    if (state?.type === "success" && state.user) {
      toast({
        title: "Foto Actualizada",
        description: state.message,
      });
      onProfileUpdate(state.user);
      setSelectedFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (state?.type === "error") {
      toast({
        variant: "destructive",
        title: "Error al Subir",
        description: state.message,
      });
    }
  }, [state, toast, onProfileUpdate]);

  useEffect(() => {
    setPreview(currentUser.profilePictureUrl);
  }, [currentUser.profilePictureUrl]);
  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setPreview(currentUser.profilePictureUrl);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <form action={formAction}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-primary/50">
            <AvatarImage src={preview || undefined} alt={currentUser.fullName} />
            <AvatarFallback className="text-3xl">{getInitials(currentUser.fullName)}</AvatarFallback>
          </Avatar>
           {selectedFile && (
            <Button 
                type="button" 
                variant="destructive" 
                size="icon" 
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                onClick={handleCancelPreview}
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Cancelar selección</span>
            </Button>
          )}
        </div>
        <div className="flex-grow w-full space-y-2">
            <Label htmlFor="profilePicture" className="text-foreground/80">
              {selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : "Seleccionar nueva imagen"}
            </Label>
            <Input
                id="profilePicture"
                name="profilePicture"
                type="file"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="bg-background/70 border-border focus:border-primary file:text-primary file:font-medium"
            />
            <p className="text-xs text-muted-foreground">Archivos PNG, JPG o GIF. Máximo 2MB.</p>
        </div>
        <Button 
            type="submit" 
            className="group w-full sm:w-auto" 
            disabled={isActionPending || !selectedFile}
        >
          {isActionPending ? "Subiendo..." : "Actualizar Foto"}
          <UploadCloud className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
        </Button>
      </div>
      {state?.errors?.profilePicture && <p className="text-sm text-destructive mt-2">{state.errors.profilePicture[0]}</p>}
    </form>
  );
}
