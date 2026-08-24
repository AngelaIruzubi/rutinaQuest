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
  tareaBaseId?: string | null;                      // ← añadir
  estado?: 'completada' | 'cancelada' | 'pendiente' | 'vencida';
  /** Id de la notificación de "5 min antes" programada, si hay alguna */
  notifId?: string | null;
}