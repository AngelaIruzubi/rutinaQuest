import { useDBReady } from "@/context/Dbreadycontext";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
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

  // useFocusEffect solo recarga al navegar dentro de la app: no se dispara
  // al volver de segundo plano (minimizar/bloquear el móvil), así que las
  // tareas que caducan mientras la app estaba en background se quedaban
  // con el estado antiguo hasta cambiar de pantalla. Con esto se recargan
  // también al volver del sistema operativo.
  const estadoAnterior = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (siguiente: AppStateStatus) => {
        if (estadoAnterior.current.match(/inactive|background/) && siguiente === "active") {
          cargarTareas();
        }
        estadoAnterior.current = siguiente;
      },
    );
    return () => sub.remove();
  }, [cargarTareas]);

  return { tasks, setTasks, cargarTareas };
}
