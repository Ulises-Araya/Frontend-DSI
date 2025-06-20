
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateShift } from "@/lib/actions"; // getManagedRooms removed as it's passed via prop
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Save, Tent } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import type { EditShiftFormProps, Room } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UpdateShiftFormSchema = z.object({
  shiftId: z.string(),
  date: z.date({ required_error: "Fecha es requerida." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
  area: z.string().min(1, "Debe seleccionar un área/sala."), // Area must be selected
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});

type UpdateShiftFormValues = z.infer<typeof UpdateShiftFormSchema>;

export function EditShiftForm({ shift, availableRooms, onShiftUpdated, setOpen }: EditShiftFormProps) {
  const [state, formAction, isActionPending] = useActionState(updateShift, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<UpdateShiftFormValues>({
    resolver: zodResolver(UpdateShiftFormSchema),
    defaultValues: {
      shiftId: shift.id,
      date: parseISO(shift.date), 
      startTime: shift.startTime,
      endTime: shift.endTime,
      theme: shift.theme,
      notes: shift.notes || "",
      area: shift.area,
    },
  });

  useEffect(() => {
    // Reset form if shift prop changes (e.g. opening dialog for different shift)
    form.reset({
      shiftId: shift.id,
      date: parseISO(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      theme: shift.theme,
      notes: shift.notes || "",
      area: shift.area,
    });
  }, [shift, form]);

  useEffect(() => {
    if (state?.type === 'error') {
      toast({
        variant: "destructive",
        title: "Error al actualizar turno",
        description: state.message,
      });
    } else if (state?.type === 'success') {
      toast({
        title: "Turno Actualizado",
        description: state.message,
      });
      onShiftUpdated();
      setOpen(false);
    }
  }, [state, toast, onShiftUpdated, setOpen]);

  const onSubmit = (values: UpdateShiftFormValues) => {
    const formData = new FormData();
    formData.append("shiftId", values.shiftId);
    formData.append("date", format(values.date, "yyyy-MM-dd"));
    formData.append("startTime", values.startTime);
    formData.append("endTime", values.endTime);
    formData.append("theme", values.theme); 
    if (values.notes) formData.append("notes", values.notes);
    formData.append("area", values.area); // Area is now from Select
    
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <ScrollArea className="max-h-[calc(100vh-12rem)] sm:max-h-[75vh] p-1 pr-3">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...form.register("shiftId")} />
        <div>
          <Label htmlFor="date">Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal mt-1 ${!form.watch("date") && "text-muted-foreground"}`}
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
                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } 
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
          {state?.errors?.date && <p className="text-sm text-destructive mt-1">{state.errors.date[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Hora de Inicio</Label>
            <Input id="startTime" type="time" {...form.register("startTime")} className="mt-1"/>
            {form.formState.errors.startTime && <p className="text-sm text-destructive mt-1">{form.formState.errors.startTime.message}</p>}
            {state?.errors?.startTime && <p className="text-sm text-destructive mt-1">{state.errors.startTime[0]}</p>}
          </div>
          <div>
            <Label htmlFor="endTime">Hora de Fin</Label>
            <Input id="endTime" type="time" {...form.register("endTime")} className="mt-1"/>
            {form.formState.errors.endTime && <p className="text-sm text-destructive mt-1">{form.formState.errors.endTime.message}</p>}
            {state?.errors?.endTime && <p className="text-sm text-destructive mt-1">{state.errors.endTime[0]}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="theme">Temática</Label>
          <Input id="theme" {...form.register("theme")} placeholder="Ej: Consulta de Sintaxis" className="mt-1"/>
          {form.formState.errors.theme && <p className="text-sm text-destructive mt-1">{form.formState.errors.theme.message}</p>}
           {state?.errors?.theme && <p className="text-sm text-destructive mt-1">{state.errors.theme[0]}</p>}
        </div>

        <div>
          <Label htmlFor="area">Área / Sala</Label>
           <Select
                value={form.watch("area")}
                onValueChange={(value) => form.setValue("area", value)}
                disabled={!availableRooms || availableRooms.length === 0}
            >
                <SelectTrigger id="area" className="mt-1 bg-background/70">
                    <SelectValue placeholder={(!availableRooms || availableRooms.length === 0) ? "No hay salas disponibles" : "Seleccionar área/sala"} />
                </SelectTrigger>
                <SelectContent>
                    {availableRooms && availableRooms.length > 0 ? availableRooms.map(room => (
                        <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                    )) : (
                        <SelectItem value="no-rooms" disabled>No hay salas configuradas</SelectItem>
                    )}
                </SelectContent>
            </Select>
            {form.formState.errors.area && <p className="text-sm text-destructive mt-1">{form.formState.errors.area.message}</p>}
            {state?.errors?.area && <p className="text-sm text-destructive mt-1">{state.errors.area[0]}</p>}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Tent className="w-3 h-3 flex-shrink-0" />
                Las salas son gestionadas por administradores.
            </p>
        </div>
        
        <div>
          <Label htmlFor="notes">Observaciones (Opcional)</Label>
          <Textarea id="notes" {...form.register("notes")} placeholder="Notas adicionales..." className="mt-1"/>
          {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
        </div>

        <p className="text-xs text-muted-foreground">
            Los usuarios invitados no pueden ser modificados después de crear el turno.
        </p>

        <Button type="submit" className="w-full group" disabled={isActionPending || !availableRooms || availableRooms.length === 0}>
          {isActionPending ? "Guardando..." : "Guardar Cambios"}
          <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
        </Button>
      </form>
    </ScrollArea>
  );
}
