import { useDBReady } from "@/context/Dbreadycontext";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { getTareasPorFecha } from "../database/database";
import { Tarea } from "../types/tarea";
import { hoyAppStr } from "../utils/fecha";

export function useTareasHoy() {
  const dbReady = useDBReady();
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const lastTasksRef = useRef<Tarea[]>([]);

  const cargarTareas = useCallback(() => {
    if (!dbReady) return;
    const rows = getTareasPorFecha(hoyAppStr()) as Tarea[];
    // No sobreescribir con array vacío si ya había tareas (puede ser fallo temporal de BD)
    if (rows.length === 0 && lastTasksRef.current.length > 0) {
      console.warn(
        "[useTareasHoy] getTareasPorFecha devolvió [] con tareas previas, ignorando",
      );
      return;
    }
    const mapped = rows.map((r: any) => ({
      ...r,
      completed: r.completed === 1,
    }));
    lastTasksRef.current = mapped;
    setTasks(mapped);
  }, [dbReady]);

  useFocusEffect(
    useCallback(() => {
      cargarTareas();
    }, [cargarTareas]),
  );

  return { tasks, setTasks, cargarTareas };
}
