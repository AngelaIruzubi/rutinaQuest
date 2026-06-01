export const UMBRALES_MEDALLA = {
  bronce: 100,
  plata:  300,
  oro:    600,
} as const;

export type NombreMedalla = keyof typeof UMBRALES_MEDALLA;