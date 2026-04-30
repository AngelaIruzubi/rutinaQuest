// utils/fecha.ts

// ─── Fecha simulada (mutable en runtime para testing) ────────────────────────
// null = usar fecha real del dispositivo
// 'YYYY-MM-DD' = usar esa fecha fija
let _fechaSimulada: string | null = null;
let horaSimulada: { h: number; m: number } | null = null;

export function getFechaSimulada(): string | null {
  return _fechaSimulada;
}

export function setFechaSimulada(fecha: string | null) {
  _fechaSimulada = fecha;
}
export function setHoraSimulada(h: number | null, m: number | null) {
  horaSimulada = h !== null && m !== null ? { h, m } : null;
}

// Avanza la fecha simulada N días (útil para testing)
export function avanzarDias(n: number): string {
  const base = _fechaSimulada
    ? new Date(_fechaSimulada + 'T12:00:00')
    : new Date();
  base.setDate(base.getDate() + n);
  const y  = base.getFullYear();
  const mo = String(base.getMonth() + 1).padStart(2, '0');
  const d  = String(base.getDate()).padStart(2, '0');
  _fechaSimulada = `${y}-${mo}-${d}`;
  return _fechaSimulada;
}

// ─── API pública (igual que antes, el resto de la app no cambia) ──────────────

export function ahoraApp(): Date {
  const base = _fechaSimulada ? new Date(_fechaSimulada + 'T12:00:00') : new Date();
  if (horaSimulada) {
    base.setHours(horaSimulada.h, horaSimulada.m, 0, 0);
  }
  return base;
}

export function hoyAppStr(): string {
  const d   = ahoraApp();
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fechaAppDate(fecha?: string): Date {
  if (fecha) return new Date(fecha + 'T12:00:00');
  return ahoraApp();
}

export function ahoraAppMs(): number {
  return ahoraApp().getTime();
}

export function obtenerFechaAyer(): string {
  const hoy = new Date(hoyAppStr()); // usa tu fecha simulada si existe

  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  const yyyy = ayer.getFullYear();
  const mm = String(ayer.getMonth() + 1).padStart(2, '0');
  const dd = String(ayer.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}
