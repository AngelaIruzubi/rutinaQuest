export type PeloTipo = "sideComed" | "undercut" | "spiky" | "bun" | "ninguno";
export type PeloTraseroTipo =
  | "longStraight"
  | "longWavy"
  | "shoulderHigh"
  | "neckHigh"
  | "ninguno";
export type CejasTipo = "raised" | "angry" | "happy" | "sad" | "neutral";
export type OjosTipo = "happy" | "wide" | "bow" | "humble" | "wink";
export type BocaTipo = "laugh" | "angry" | "agape" | "smile" | "sad";
export type BarbaTipo =
  | "moustacheTwirl"
  | "fullBeard"
  | "chin"
  | "chinMoustache"
  | "longBeard"
  | "ninguna";
export type CamisetaTipo = "turtleNeck" | "openJacket" | "dress" | "shirt" | "tShirt";

export interface EstadoAvatar {
  skinColor: string;
  hair: PeloTipo;
  hairColor: string;
  rearHair: PeloTraseroTipo;
  eyebrows: CejasTipo;
  eyes: OjosTipo;
  mouth: BocaTipo;
  beard: BarbaTipo;
  clothes: CamisetaTipo;
  clothesColor: string;
}
