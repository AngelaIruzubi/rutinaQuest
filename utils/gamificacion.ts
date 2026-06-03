import { NombreMedalla, UMBRALES_MEDALLA } from '../constants/medallas';

export function calcularProgresos(estrellas: number) {
  return {
    progresBronce: Math.min(estrellas, UMBRALES_MEDALLA.bronce),
    progresPlata:  estrellas >= UMBRALES_MEDALLA.bronce
      ? Math.min(estrellas - UMBRALES_MEDALLA.bronce, UMBRALES_MEDALLA.plata - UMBRALES_MEDALLA.bronce)
      : 0,
    progresOro:    estrellas >= UMBRALES_MEDALLA.plata
      ? Math.min(estrellas - UMBRALES_MEDALLA.plata, UMBRALES_MEDALLA.oro - UMBRALES_MEDALLA.plata)
      : 0,
  };
}

/**
 * Detecta si al pasar de `prev` a `next` estrellas se ha cruzado
 * el umbral de alguna medalla. Devuelve null si no hay cambio.
 */
export function detectarMedalla(prev: number, next: number): NombreMedalla | null {
  if (next >= UMBRALES_MEDALLA.oro    && prev < UMBRALES_MEDALLA.oro)    return 'oro';
  if (next >= UMBRALES_MEDALLA.plata  && prev < UMBRALES_MEDALLA.plata)  return 'plata';
  if (next >= UMBRALES_MEDALLA.bronce && prev < UMBRALES_MEDALLA.bronce) return 'bronce';
  return null;
}

export function aplicarPenalizacion(estrellas: number, penalizacion = 10): number {
  return Math.max(0, estrellas - penalizacion);
}
