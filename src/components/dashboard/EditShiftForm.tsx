
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateShift } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Save, UserPlus, X as IconX, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import type { Shift, EditShiftFormProps } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const DniObjectSchema = z.object({
  value: z.string().regex(/^\d{7,8}$/, "DNI inválido (7-8 caracteres)"),
});

const UpdateShiftFormSchema = z.object({
  shiftId: z.string(),
  date: z.date({ required_error: "Fecha es requerida." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM requerido"),
  theme: z.string().min(3, "Temática debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
  area: z.string().min(3, "Área debe tener al menos 3 caracteres"),
  invitedUserDnis: z.array(DniObjectSchema).optional().default([]),
}).refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
}, {
    message: "Hora de fin debe ser posterior a hora de inicio.",
    path: ["endTime"],
});

type UpdateShiftFormValues = z.infer<typeof UpdateShiftFormSchema>;

export function EditShiftForm({ shift, onShiftUpdated, setOpen }: EditShiftFormProps) {
  const [state, formAction, isActionPending] = useActionState(updateShift, null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<UpdateShiftFormValues>({
    resolver: zodResolver(UpdateShiftFormSchema),
    defaultValues: {
      shiftId: shift.id,
      date: parseISO(shift.date), // Ensure date is a Date object
      startTime: shift.startTime,
      endTime: shift.endTime,
      theme: shift.theme,
      notes: shift.notes || "",
      area: shift.area,
      invitedUserDnis: shift.invitedUserDnis.map(dni => ({ value: dni })),
    },
  });

  const { fields: invitedDniFields, append: appendInvitedDni, remove: removeInvitedDni } = useFieldArray({
    control: form.control,
    name: "invitedUserDnis"
  });

  const [currentDniInput, setCurrentDniInput] = useState("");
  const [dniInputError, setDniInputError] = useState<string | null>(null);

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

  const handleAddInvitedDni = () => {
    setDniInputError(null);
    const dniPattern = /^\d{7,8}$/;
    if (!dniPattern.test(currentDniInput)) {
      setDniInputError("DNI inválido (debe tener 7-8 dígitos numéricos).");
      return;
    }
    if (invitedDniFields.some(field => field.value === currentDniInput)) {
      setDniInputError("Este DNI ya ha sido agregado a la lista.");
      return;
    }
    appendInvitedDni({ value: currentDniInput });
    setCurrentDniInput("");
    form.clearErrors("invitedUserDnis"); 
  };

  const onSubmit = (values: UpdateShiftFormValues) => {
    const formData = new FormData();
    formData.append("shiftId", values.shiftId);
    formData.append("date", format(values.date, "yyyy-MM-dd"));
    formData.append("startTime", values.startTime);
    formData.append("endTime", values.endTime);
    formData.append("theme", values.theme);
    if (values.notes) formData.append("notes", values.notes);
    formData.append("area", values.area);
    
    const dnisAsString = values.invitedUserDnis.map(item => item.value).join(',');
    if (dnisAsString) {
      formData.append("invitedUserDnis", dnisAsString);
    } else {
      formData.append("invitedUserDnis", ""); // Send empty string if no DNIs
    }
    
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
          <Input id="area" {...form.register("area")} placeholder="Ej: Sala de Estudio 3" className="mt-1"/>
          {form.formState.errors.area && <p className="text-sm text-destructive mt-1">{form.formState.errors.area.message}</p>}
          {state?.errors?.area && <p className="text-sm text-destructive mt-1">{state.errors.area[0]}</p>}
        </div>
        
        <div>
          <Label htmlFor="currentDniInput">Invitar Usuarios por DNI</Label>
          <div className="flex items-start gap-2 mt-1">
            <div className="flex-grow">
              <Input
                id="currentDniInput"
                value={currentDniInput}
                onChange={(e) => {
                  setCurrentDniInput(e.target.value);
                  if (dniInputError) setDniInputError(null);
                }}
                placeholder="Ingresar DNI y añadir"
                className={(dniInputError ? "border-destructive focus-visible:ring-destructive" : "")}
              />
              {dniInputError && <p className="text-sm text-destructive mt-1">{dniInputError}</p>}
            </div>
            <Button type="button" onClick={handleAddInvitedDni} size="icon" variant="outline" aria-label="Añadir DNI">
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          
          {form.formState.errors.invitedUserDnis && form.formState.errors.invitedUserDnis.root?.message && (
             <p className="text-sm text-destructive mt-1">{form.formState.errors.invitedUserDnis.root.message}</p>
          )}
          {form.formState.errors.invitedUserDnis?.map((error, index) => (
             error?.value?.message && <p key={index} className="text-sm text-destructive mt-1">{error.value.message}</p>
          ))}

          {invitedDniFields.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">DNIs agregados:</p>
              <div className="flex flex-wrap gap-2">
                {invitedDniFields.map((field, index) => (
                  <Badge key={field.id} variant="secondary" className="text-sm flex items-center gap-1 py-1 px-2">
                    {field.value}
                    <button
                      type="button"
                      onClick={() => removeInvitedDni(index)}
                      className="rounded-full hover:bg-muted-foreground/20 p-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      aria-label={`Quitar DNI ${field.value}`}
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
           <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info className="w-3 h-3 flex-shrink-0" />
            El número de integrantes se calculará automáticamente (creador + invitados).
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Observaciones (Opcional)</Label>
          <Textarea id="notes" {...form.register("notes")} placeholder="Notas adicionales..." className="mt-1"/>
          {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
        </div>

        <Button type="submit" className="w-full group" disabled={isActionPending}>
          {isActionPending ? "Guardando..." : "Guardar Cambios"}
          <Save className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
        </Button>
      </form>
    </ScrollArea>
  );
}
