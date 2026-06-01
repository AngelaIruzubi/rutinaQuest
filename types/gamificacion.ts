export interface EstadoGamificacion {
  estrellas: number;
  racha: number;
  totalHecho: number;
  tareasCompletasHoy: number;
  penalizacionAplicada: boolean;
  esDiaNuevo: boolean;
  cargando: boolean;
}

export interface ResultadoCompletarTarea {
  pts:         number;
  nuevoEstado: EstadoGamificacion;
}