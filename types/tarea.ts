export interface Tarea {
  id: string;
  title: string;
  /** 'HH:MM' o 'Sin hora' */
  hora: string;
  /** Formato 'YYYY-MM-DD' */
  fechaDia: string;
  fechaCompletada?: string;
  completed: boolean;
  stars: number;
  pictogramId: number | null;
  repeticion?: 'ninguna' | 'diaria' | 'semanal';  // ← añadir
  /** Solo con repeticion 'semanal': días en que repite (0=domingo..6=sábado, como Date#getDay) */
  diasSemana?: number[] | null;
  tareaBaseId?: string | null;                      // ← añadir
  estado?: 'completada' | 'cancelada' | 'pendiente' | 'vencida';
  /** Id de la notificación de "5 min antes" programada, si hay alguna */
  notifId?: string | null;
  /** Duración en segundos del temporizador asociado, si la tarea tiene uno */
  duracionSeg?: number | null;
  /** Si tiene duracionSeg, si el temporizador ya se ha completado alguna vez */
  tiempoCumplido?: boolean;
}