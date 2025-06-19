
"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createShift } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

const CreateShiftSchema = z.object({
  date: z.date({ required_error: "Fecha es requerida." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  participantCount: z.coerce.number().min(1, "Mínimo 1 integrante").max(50, "Máximo 50 integrantes"),
  notes: z.string().optional(),
  area: z.string().min(3, "Área debe tener al menos 3 caracteres"),
  invitedUserDnis: z.string().optional().refine(val => {
    if (!val || val.trim() === "") return true;
    const dnis = val.split(',').map(d => d.trim());
    return dnis.every(dni => /^\d{7,8}$/.test(dni));
  }, "Ingrese DNIs válidos separados por coma (7-8 dígitos)."),
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});


type CreateShiftFormValues = z.infer<typeof CreateShiftSchema>;

interface CreateShiftFormProps {
  onShiftCreated?: () => void;
  setOpen?: (open: boolean) => void;
}

export function CreateShiftForm({ onShiftCreated, setOpen }: CreateShiftFormProps) {
  const [state, formAction, isActionPending] = useActionState(createShift, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<CreateShiftFormValues>({
    resolver: zodResolver(CreateShiftSchema),
    defaultValues: {
      startTime: "09:00",
      endTime: "10:00",
      participantCount: 1,
      notes: "",
      invitedUserDnis: "",
    },
  });

  useEffect(() => {
    if (state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error al crear turno",
        description: state.message,
      });
    } else if (state?.type === 'success') {
      toast({
        title: "Turno Creado",
        description: state.message,
      });
      form.reset();
      if (onShiftCreated) onShiftCreated();
      if (setOpen) setOpen(false);
    }
  }, [state, toast, form, onShiftCreated, setOpen]);

  const onSubmit = (values: CreateShiftFormValues) => {
    const formData = new FormData();
    formData.append("date", format(values.date, "yyyy-MM-dd"));
    formData.append("startTime", values.startTime);
    formData.append("endTime", values.endTime);
    formData.append("theme", values.theme);
    formData.append("participantCount", String(values.participantCount));
    if (values.notes) formData.append("notes", values.notes);
    formData.append("area", values.area);
    if (values.invitedUserDnis) formData.append("invitedUserDnis", values.invitedUserDnis);
    
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div>
        <Label htmlFor="date">Fecha</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={`w-full justify-start text-left font-normal ${!form.watch("date") && "text-muted-foreground"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.watch("date") ? format(form.watch("date"), "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={form.watch("date")}
              onSelect={(date) => form.setValue("date", date || new Date())}
              initialFocus
              locale={es}
              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } // Disable past dates
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
        {state?.errors?.date && <p className="text-sm text-destructive">{state.errors.date[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Hora de Inicio</Label>
          <Input id="startTime" type="time" {...form.register("startTime")} />
          {form.formState.errors.startTime && <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>}
          {state?.errors?.startTime && <p className="text-sm text-destructive">{state.errors.startTime[0]}</p>}
        </div>
        <div>
          <Label htmlFor="endTime">Hora de Fin</Label>
          <Input id="endTime" type="time" {...form.register("endTime")} />
          {form.formState.errors.endTime && <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>}
          {state?.errors?.endTime && <p className="text-sm text-destructive">{state.errors.endTime[0]}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="theme">Temática</Label>
        <Input id="theme" {...form.register("theme")} placeholder="Ej: Consulta de Sintaxis, Práctica Parcial 1"/>
        {form.formState.errors.theme && <p className="text-sm text-destructive">{form.formState.errors.theme.message}</p>}
        {state?.errors?.theme && <p className="text-sm text-destructive">{state.errors.theme[0]}</p>}
      </div>

      <div>
        <Label htmlFor="area">Área / Sala</Label>
        <Input id="area" {...form.register("area")} placeholder="Ej: Sala de Estudio 3, Laboratorio de Electrónica"/>
        {form.formState.errors.area && <p className="text-sm text-destructive">{form.formState.errors.area.message}</p>}
        {state?.errors?.area && <p className="text-sm text-destructive">{state.errors.area[0]}</p>}
      </div>
      
      <div>
        <Label htmlFor="participantCount">Cantidad de Integrantes</Label>
        <Input id="participantCount" type="number" {...form.register("participantCount")} />
        {form.formState.errors.participantCount && <p className="text-sm text-destructive">{form.formState.errors.participantCount.message}</p>}
        {state?.errors?.participantCount && <p className="text-sm text-destructive">{state.errors.participantCount[0]}</p>}
      </div>

      <div>
        <Label htmlFor="invitedUserDnis">Invitar Usuarios (DNI separados por coma)</Label>
        <Input id="invitedUserDnis" {...form.register("invitedUserDnis")} placeholder="Ej: 12345678,87654321"/>
        {form.formState.errors.invitedUserDnis && <p className="text-sm text-destructive">{form.formState.errors.invitedUserDnis.message}</p>}
        {state?.errors?.invitedUserDnis && <p className="text-sm text-destructive">{state.errors.invitedUserDnis[0]}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Observaciones</Label>
        <Textarea id="notes" {...form.register("notes")} placeholder="Notas adicionales, temas específicos a tratar..."/>
        {form.formState.errors.notes && <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>}
      </div>

      <Button type="submit" className="w-full group" disabled={isActionPending}>
        {isActionPending ? "Creando..." : "Crear Turno"}
        <PlusCircle className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
      </Button>
    </form>
  );
}
