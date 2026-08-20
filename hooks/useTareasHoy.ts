import { useDBReady } from "@/context/Dbreadycontext";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getTareasPorFecha } from "../database/database";
import { Tarea } from "../types/tarea";
import { hoyAppStr } from "../utils/fecha";

export function useTareasHoy() {
  const dbReady = useDBReady();
  const [tasks, setTasks] = useState<Tarea[]>([]);

  const cargarTareas = useCallback(async () => {
    if (!dbReady) return;
    const rows = (await getTareasPorFecha(hoyAppStr())) as Tarea[];
    const mapped = rows.map((r: any) => ({
      ...r,
      completed: r.completed === 1,
    }));
    setTasks(mapped);
  }, [dbReady]);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      (async () => {
        if (!dbReady) return;
        const rows = (await getTareasPorFecha(hoyAppStr())) as Tarea[];
        if (cancelado) return;
        setTasks(
          rows.map((r: any) => ({ ...r, completed: r.completed === 1 })),
        );
      })();
      return () => {
        cancelado = true;
      };
    }, [dbReady]),
  );

  return { tasks, setTasks, cargarTareas };
}
