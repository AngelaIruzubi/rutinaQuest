import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getTareasPorFecha, limpiarTareasViejas } from '../database/database';
import { Tarea } from '../types/tarea';
import { hoyAppStr } from '../utils/fecha';

export function useTareasHoy() {
  const [tasks, setTasks] = useState<Tarea[]>([]);

  const cargarTareas = useCallback(() => {
    limpiarTareasViejas();
    const rows = getTareasPorFecha(hoyAppStr()) as Tarea[];
    setTasks(rows.map((r: any) => ({ ...r, completed: r.completed === 1 })));
  }, []);

  useFocusEffect(
    useCallback(() => { cargarTareas(); }, [cargarTareas])
  );

  return { tasks, setTasks, cargarTareas };
}