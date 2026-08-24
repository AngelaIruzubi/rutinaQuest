import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** Cancela una notificación programada de una tarea, si tenía alguna. */
export async function cancelarNotifTarea(
  notifId: string | null | undefined,
): Promise<void> {
  if (!notifId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}

/**
 * Programa (con el reloj real del dispositivo, no la fecha simulada de
 * desarrollo) una notificación del sistema para 5 minutos antes de la hora
 * de una tarea. Se llama al crear o editar una tarea con hora, para que la
 * notificación llegue en el minuto exacto en vez de depender de un chequeo
 * periódico impreciso.
 *
 * Si se pasa `notifIdAnterior` (por ejemplo al editar la hora de una tarea
 * que ya tenía una notificación programada), se cancela primero para no
 * dejar un aviso duplicado con la hora vieja.
 *
 * Devuelve el id de la notificación programada, o null si no procede
 * (sin hora, ya ha pasado, plataforma web, o falló el permiso) — en ese
 * caso también conviene guardar null como notifId de la tarea.
 */
export async function programarNotif5MinAntes(
  fechaDia: string,
  hora: string | null | undefined,
  titulo: string,
  notifIdAnterior?: string | null,
): Promise<string | null> {
  await cancelarNotifTarea(notifIdAnterior);

  if (Platform.OS === "web") return null;
  if (!hora || hora === "Sin hora") return null;
  const [hh, mm] = hora.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  const [y, m, d] = fechaDia.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const objetivo = new Date(y, m - 1, d, hh, mm - 5, 0, 0);
  if (objetivo.getTime() <= Date.now()) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ ¡Quedan 5 minutos!",
        body: `La tarea "${titulo}" vence pronto`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: objetivo,
      },
    });
  } catch {
    return null;
  }
}
