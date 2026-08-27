import { ahoraAppMs, fechaAppDate, hoyAppStr } from './fecha';

/**
 * Convierte 'HH:MM' al objeto Date correspondiente del día actual.
 * Usa la fecha simulada si está activa (modo desarrollo).
 * @returns null para 'Sin hora', undefined, null o formato inválido.
 */
export function parseTiempoLim(hora: string | undefined | null): Date | null {
  if (!hora || hora === 'Sin hora') return null;
  const [h, m] = hora.split(':').map(Number);
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  const d = fechaAppDate(hoyAppStr());
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Minutos que quedan hasta el vencimiento de una tarea.
 * Negativo si ya venció. null si la tarea no tiene hora.
 *
 * Si la tarea tiene un temporizador asociado (duracionSeg), el vencimiento
 * se calcula al final de esa duración (hora + duracionSeg), no en la hora
 * de inicio — si no, una tarea de 1h a las 17:00 se marcaría como "fuera de
 * hora" nada más pasar las 17:00, aunque sigas dentro de tu hora de
 * actividad.
 */
export function minutosRestantes(
  hora?: string | null,
  duracionSeg?: number | null,
): number | null {
  const dl = parseTiempoLim(hora);
  if (!dl) return null;
  if (duracionSeg) dl.setTime(dl.getTime() + duracionSeg * 1000);
  return Math.round((dl.getTime() - ahoraAppMs()) / 60_000);
}


export function calcularPuntos(tieneHora: boolean, enTiempo: boolean): number {
  return tieneHora ? (enTiempo ? 5 : 3) : 5;
}
