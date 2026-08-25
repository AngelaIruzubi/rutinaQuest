import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform, Vibration } from "react-native";
import { updateTareaTiempoCumplido } from "../database/database";
import { Tarea } from "../types/tarea";

const CLAVE_TIMER = "rutinaquest_timer_tarea";

type EstadoTimer = "running" | "paused" | "finished";

export type TimerActivo = {
  tareaId: string;
  tareaTitulo: string;
  duracionTotalSeg: number;
  estado: EstadoTimer;
  /** Marca absoluta (reloj real) a la que debe llegar a 0 — solo con estado "running" */
  finAbsolutoMs: number | null;
  /** Segundos restantes congelados — solo con estado "paused" o "finished" */
  restanteSeg: number | null;
  notifId: string | null;
};

type TemporizadorContextType = {
  activo: TimerActivo | null;
  tiempoActualSeg: number;
  iniciarParaTarea: (tarea: Tarea) => void;
  pausar: () => void;
  reanudar: () => void;
  resetear: () => void;
  /** Ajuste relativo (± segundos) arrastrando el anillo — funciona en marcha o en pausa */
  ajustarSeg: (deltaSeg: number) => void;
  /** Se llama al soltar el dedo, para reprogramar la notificación una sola vez */
  confirmarAjuste: () => void;
};

const TemporizadorContext = createContext<TemporizadorContextType | null>(
  null,
);

async function cancelarNotif(notifId: string | null | undefined) {
  if (!notifId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}

async function programarNotifFin(
  tareaTitulo: string,
  finMs: number,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ ¡Tiempo cumplido!",
        body: `Ya puedes marcar "${tareaTitulo}" como realizada`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(finMs),
      },
    });
  } catch {
    return null;
  }
}

// Temporizador ligado a una tarea concreta, vive fuera de la pantalla del
// Temporizador para que siga corriendo (y se pueda consultar) aunque el
// usuario navegue a otra pantalla o minimice la app — se persiste en
// AsyncStorage con una marca de tiempo absoluta, así que también sobrevive a
// cerrar y reabrir la app del todo.
export function TemporizadorProvider({ children }: { children: any }) {
  const [activo, setActivoState] = useState<TimerActivo | null>(null);
  const [tiempoActualSeg, setTiempoActualSeg] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activoRef = useRef<TimerActivo | null>(null);

  const setActivo = useCallback((valor: TimerActivo | null) => {
    activoRef.current = valor;
    setActivoState(valor);
    if (valor) {
      AsyncStorage.setItem(CLAVE_TIMER, JSON.stringify(valor)).catch(
        () => {},
      );
    } else {
      AsyncStorage.removeItem(CLAVE_TIMER).catch(() => {});
    }
  }, []);

  // Como setActivo, pero sin escribir en AsyncStorage — para los muchos
  // cambios seguidos que llegan mientras se arrastra el anillo (persistir en
  // cada uno sería caro e innecesario; se persiste una sola vez al soltar,
  // en confirmarAjuste).
  const setActivoEnMemoria = useCallback((valor: TimerActivo | null) => {
    activoRef.current = valor;
    setActivoState(valor);
  }, []);

  // Cargar el temporizador guardado al abrir la app
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CLAVE_TIMER);
        if (!raw) return;
        const guardado: TimerActivo = JSON.parse(raw);
        if (guardado.estado === "running" && guardado.finAbsolutoMs) {
          const restante = Math.max(
            0,
            Math.ceil((guardado.finAbsolutoMs - Date.now()) / 1000),
          );
          if (restante <= 0) {
            const terminado: TimerActivo = {
              ...guardado,
              estado: "finished",
              finAbsolutoMs: null,
              restanteSeg: 0,
            };
            activoRef.current = terminado;
            setActivoState(terminado);
            setTiempoActualSeg(0);
            AsyncStorage.setItem(
              CLAVE_TIMER,
              JSON.stringify(terminado),
            ).catch(() => {});
            updateTareaTiempoCumplido(guardado.tareaId, true);
          } else {
            activoRef.current = guardado;
            setActivoState(guardado);
            setTiempoActualSeg(restante);
          }
        } else {
          activoRef.current = guardado;
          setActivoState(guardado);
          setTiempoActualSeg(guardado.restanteSeg ?? 0);
        }
      } catch {}
    })();
  }, []);

  const recomputar = useCallback(() => {
    const prev = activoRef.current;
    if (!prev || prev.estado !== "running" || prev.finAbsolutoMs == null)
      return;
    const restante = Math.max(
      0,
      Math.ceil((prev.finAbsolutoMs - Date.now()) / 1000),
    );
    setTiempoActualSeg(restante);
    if (restante <= 0) {
      const terminado: TimerActivo = {
        ...prev,
        estado: "finished",
        finAbsolutoMs: null,
        restanteSeg: 0,
      };
      setActivo(terminado);
      if (Platform.OS !== "web") Vibration.vibrate([0, 400, 200, 400]);
      updateTareaTiempoCumplido(prev.tareaId, true);
    }
  }, [setActivo]);

  useEffect(() => {
    if (activo?.estado === "running") {
      intervalRef.current = setInterval(recomputar, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activo?.estado, recomputar]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") recomputar();
    });
    return () => sub.remove();
  }, [recomputar]);

  const iniciarParaTarea = useCallback(
    (tarea: Tarea) => {
      const duracion = tarea.duracionSeg ?? 0;
      if (duracion <= 0) return;
      (async () => {
        await cancelarNotif(activoRef.current?.notifId);
        const finMs = Date.now() + duracion * 1000;
        const notifId = await programarNotifFin(tarea.title, finMs);
        setActivo({
          tareaId: tarea.id,
          tareaTitulo: tarea.title,
          duracionTotalSeg: duracion,
          estado: "running",
          finAbsolutoMs: finMs,
          restanteSeg: null,
          notifId,
        });
        setTiempoActualSeg(duracion);
      })();
    },
    [setActivo],
  );

  const pausar = useCallback(() => {
    const prev = activoRef.current;
    if (!prev || prev.estado !== "running" || prev.finAbsolutoMs == null)
      return;
    const restante = Math.max(
      0,
      Math.ceil((prev.finAbsolutoMs - Date.now()) / 1000),
    );
    cancelarNotif(prev.notifId);
    setActivo({
      ...prev,
      estado: "paused",
      finAbsolutoMs: null,
      restanteSeg: restante,
      notifId: null,
    });
    setTiempoActualSeg(restante);
  }, [setActivo]);

  const reanudar = useCallback(() => {
    const prev = activoRef.current;
    if (!prev || prev.estado !== "paused") return;
    (async () => {
      const restante = prev.restanteSeg ?? 0;
      const finMs = Date.now() + restante * 1000;
      const notifId = await programarNotifFin(prev.tareaTitulo, finMs);
      setActivo({
        ...prev,
        estado: "running",
        finAbsolutoMs: finMs,
        restanteSeg: null,
        notifId,
      });
    })();
  }, [setActivo]);

  const resetear = useCallback(() => {
    cancelarNotif(activoRef.current?.notifId);
    setTiempoActualSeg(0);
    setActivo(null);
  }, [setActivo]);

  // Ajustar arrastrando el anillo — funciona tanto en marcha como en pausa.
  // En marcha se desplaza la marca absoluta de fin (así el intervalo de 1s
  // sigue funcionando solo); en pausa se ajustan los segundos congelados.
  // No reprograma la notificación en cada micro-ajuste (ver confirmarAjuste).
  // Nunca puede superar la duración original de la tarea (ni bajar de 0): si
  // no, la barra de progreso se pasaba de 100% al arrastrar de más.
  const ajustarSeg = useCallback((deltaSeg: number) => {
    const prev = activoRef.current;
    if (!prev || prev.estado === "finished") return;
    if (prev.estado === "running" && prev.finAbsolutoMs != null) {
      const restanteActual = Math.max(
        0,
        Math.ceil((prev.finAbsolutoMs - Date.now()) / 1000),
      );
      const nuevoRestante = Math.max(
        0,
        Math.min(prev.duracionTotalSeg, restanteActual + deltaSeg),
      );
      const deltaReal = nuevoRestante - restanteActual;
      setActivoEnMemoria({
        ...prev,
        finAbsolutoMs: prev.finAbsolutoMs + deltaReal * 1000,
      });
      setTiempoActualSeg(nuevoRestante);
    } else if (prev.estado === "paused") {
      const nuevoRestante = Math.max(
        0,
        Math.min(prev.duracionTotalSeg, (prev.restanteSeg ?? 0) + deltaSeg),
      );
      setActivoEnMemoria({
        ...prev,
        restanteSeg: nuevoRestante,
      });
      setTiempoActualSeg(nuevoRestante);
    }
  }, [setActivoEnMemoria]);

  // Al soltar el dedo: persistir el ajuste y, si está en marcha, reprogramar
  // la notificación de "tiempo cumplido" para que coincida con el nuevo fin.
  const confirmarAjuste = useCallback(() => {
    const prev = activoRef.current;
    if (!prev) return;
    if (prev.estado === "running" && prev.finAbsolutoMs != null) {
      (async () => {
        await cancelarNotif(prev.notifId);
        const notifId = await programarNotifFin(
          prev.tareaTitulo,
          prev.finAbsolutoMs!,
        );
        setActivo({ ...prev, notifId });
      })();
    } else {
      setActivo(prev);
    }
  }, [setActivo]);

  return (
    <TemporizadorContext.Provider
      value={{
        activo,
        tiempoActualSeg,
        iniciarParaTarea,
        pausar,
        reanudar,
        resetear,
        ajustarSeg,
        confirmarAjuste,
      }}
    >
      {children}
    </TemporizadorContext.Provider>
  );
}

export function useTemporizadorTarea() {
  const ctx = useContext(TemporizadorContext);
  if (!ctx) {
    throw new Error(
      "useTemporizadorTarea debe usarse dentro de TemporizadorProvider",
    );
  }
  return ctx;
}
