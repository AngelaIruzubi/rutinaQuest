import { createAvatar } from "@dicebear/core";
import * as toonHead from "@dicebear/toon-head";
import { EstadoAvatar } from "../types/avatar";

// ─── Colores disponibles (extraídos del esquema oficial del estilo) ──────────

export const PIEL_COLORES = ["f1c3a5", "e5a06e", "c68e7a", "a36b4f", "5c3829"];
export const PELO_COLORES = [
  "2c1b18",
  "724133",
  "a55728",
  "b58143",
  "d6b370",
  "e8e9e6",
];
export const CAMISETA_COLORES = [
  "545454",
  "b11f1f",
  "0b3286",
  "147f3c",
  "eab308",
  "731ac3",
  "ec4899",
  "f97316",
  "151613",
  "e8e9e6",
];

// ─── Opciones de estilo (etiquetas en español para la UI) ────────────────────

export const PELO_OPCIONES: { valor: EstadoAvatar["hair"]; nombre: string }[] = [
  { valor: "ninguno", nombre: "Ninguno" },
  { valor: "sideComed", nombre: "Peinado lateral" },
  { valor: "undercut", nombre: "Undercut" },
  { valor: "spiky", nombre: "De punta" },
  { valor: "bun", nombre: "Moño" },
];

export const PELO_TRASERO_OPCIONES: {
  valor: EstadoAvatar["rearHair"];
  nombre: string;
}[] = [
  { valor: "ninguno", nombre: "Ninguno" },
  { valor: "longStraight", nombre: "Largo liso" },
  { valor: "longWavy", nombre: "Largo ondulado" },
  { valor: "shoulderHigh", nombre: "Hasta hombros" },
  { valor: "neckHigh", nombre: "Hasta el cuello" },
];

export const CEJAS_OPCIONES: { valor: EstadoAvatar["eyebrows"]; nombre: string }[] =
  [
    { valor: "neutral", nombre: "Neutras" },
    { valor: "raised", nombre: "Levantadas" },
    { valor: "angry", nombre: "Enfadadas" },
    { valor: "happy", nombre: "Felices" },
    { valor: "sad", nombre: "Tristes" },
  ];

export const OJOS_OPCIONES: { valor: EstadoAvatar["eyes"]; nombre: string }[] = [
  { valor: "happy", nombre: "Felices" },
  { valor: "wide", nombre: "Abiertos" },
  { valor: "bow", nombre: "En arco" },
  { valor: "humble", nombre: "Humildes" },
  { valor: "wink", nombre: "Guiño" },
];

export const BOCA_OPCIONES: { valor: EstadoAvatar["mouth"]; nombre: string }[] = [
  { valor: "smile", nombre: "Sonrisa" },
  { valor: "laugh", nombre: "Risa" },
  { valor: "angry", nombre: "Enfadada" },
  { valor: "agape", nombre: "Sorpresa" },
  { valor: "sad", nombre: "Triste" },
];

export const BARBA_OPCIONES: { valor: EstadoAvatar["beard"]; nombre: string }[] = [
  { valor: "ninguna", nombre: "Ninguna" },
  { valor: "chin", nombre: "Perilla" },
  { valor: "chinMoustache", nombre: "Perilla y bigote" },
  { valor: "moustacheTwirl", nombre: "Bigote rizado" },
  { valor: "fullBeard", nombre: "Barba completa" },
  { valor: "longBeard", nombre: "Barba larga" },
];

export const CAMISETA_OPCIONES: {
  valor: EstadoAvatar["clothes"];
  nombre: string;
}[] = [
  { valor: "tShirt", nombre: "Camiseta" },
  { valor: "shirt", nombre: "Camisa" },
  { valor: "turtleNeck", nombre: "Cuello alto" },
  { valor: "openJacket", nombre: "Chaqueta" },
  { valor: "dress", nombre: "Vestido" },
];

// ─── Valores por defecto ──────────────────────────────────────────────────────

export const AVATAR_DEFAULT: EstadoAvatar = {
  skinColor: PIEL_COLORES[0],
  hair: "sideComed",
  hairColor: PELO_COLORES[0],
  rearHair: "ninguno",
  eyebrows: "neutral",
  eyes: "happy",
  mouth: "smile",
  beard: "ninguna",
  clothes: "tShirt",
  clothesColor: CAMISETA_COLORES[2],
};

// ─── Generación del SVG ───────────────────────────────────────────────────────

/**
 * Genera el avatar como XML de SVG usando @dicebear/toon-head. Todos los
 * campos se fijan de forma determinista (arrays de un solo valor, o vacíos
 * para "ninguno") para que el resultado dependa solo de las opciones
 * elegidas por la usuaria, no de aleatoriedad por seed.
 */
export function generarAvatarSvg(avatar: EstadoAvatar, size = 280): string {
  const resultado = createAvatar(toonHead, {
    seed: "rutinaquest",
    size,
    backgroundColor: ["transparent"],
    body: ["body"],
    head: ["head"],
    skinColor: [avatar.skinColor],
    hair: avatar.hair === "ninguno" ? [] : [avatar.hair],
    hairProbability: avatar.hair === "ninguno" ? 0 : 100,
    hairColor: [avatar.hairColor],
    rearHair: avatar.rearHair === "ninguno" ? [] : [avatar.rearHair],
    rearHairProbability: avatar.rearHair === "ninguno" ? 0 : 100,
    eyebrows: [avatar.eyebrows],
    eyes: [avatar.eyes],
    mouth: [avatar.mouth],
    beard: avatar.beard === "ninguna" ? [] : [avatar.beard],
    beardProbability: avatar.beard === "ninguna" ? 0 : 100,
    clothes: [avatar.clothes],
    clothesColor: [avatar.clothesColor],
  });
  return resultado.toString();
}
