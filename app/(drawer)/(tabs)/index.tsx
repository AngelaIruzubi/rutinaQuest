import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ModalDetalleTarea } from "../../../components/modals/ModalDetalleTarea";
import { ModalNuevaTarea } from "../../../components/modals/ModalNuevaTarea";
import { AppFonts, Colors } from "../../../constants/theme";
import { useTareasHoy } from "../../../hooks/useTareasHoy";
import { Tarea } from "../../../types/tarea";
import { capitalize } from "../../../utils/fechaFormato";
import {
  cancelarNotifTarea,
  programarNotif5MinAntes,
} from "../../../utils/notificacionesTarea";
import { minutosRestantes, parseTiempoLim } from "../../../utils/tiempo";

import {
  AccessibilityInfo,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";

import {
  cancelarTarea,
  deleteTarea,
  eliminarTareaYRepetitivas,
  generarTareasRepetitivas,
  getTareasPorFecha,
  insertTarea,
  limpiarTareasViejas,
  updateTareaBaseCompleta,
  updateTareaCompletada,
  updateTareaHora,
  updateTareaNotifId,
  updateTareaTituloPicto,
} from "../../../database/database";

import { PEREZOSO_IMAGENES } from "../../../constants/notiConfig";
import { useAjustesCtx } from "../../../context/AjustesContext";
import { useGamificacion } from "../../../hooks/useGamificacion";

import { ModalEditarTarea } from "../../../components/modals/ModalEditarTarea";
import { PerezosoNotif } from "../../../components/notifs/PerezosoNotif";
import { RachaNotif } from "../../../components/notifs/RachaNotif";
import { useConfirm } from "../../../hooks/useConfirm";
import { useReduceMotion } from "../../../hooks/useReduceMotion";
import {
  ahoraApp,
  ahoraAppMs,
  hoyAppStr,
  setFechaSimulada,
  setHoraSimulada,
} from "../../../utils/fecha";
import { detectarMedalla } from "../../../utils/gamificacion";

if (__DEV__) {
  setFechaSimulada("2027-08-20");
  setHoraSimulada(12, 0);
}
const SONIDOS: Record<string, any> = {
  "success.mp3": require("../../../assets/sounds/success.mp3"),
  "error.mp3": require("../../../assets/sounds/error.mp3"),
  "goalmet.mp3": require("../../../assets/sounds/goalmet.mp3"),
  "racha.mp3": require("../../../assets/sounds/racha.mp3"),
};

const PURPLE = Colors.purple;
const ORANGE = Colors.orange;
const RED = Colors.red;

// Cuánto dura cada tipo de notificación en pantalla — se usa tanto para
// ocultarla como para encadenar la siguiente (tarea → todo completo →
// racha) sin que se pisen entre sí ni en el sonido ni en la vista.
function duracionNotif(type: string): number {
  const esTareaCompletada =
    type === "ontime" || type === "late" || type === "sinHora";
  return esTareaCompletada ? 2200 : 4500;
}

async function pedirPermisosNotificaciones() {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") console.warn("Permisos de notificación denegados");
}
async function configurarCanalAndroid() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "RutinaQuest",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#A77BBE",
  });
}

async function enviarNotifSistema(titulo: string, cuerpo: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: "#A77BBE",
        badge: 1,
      },
      trigger:
        Platform.OS === "android"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: "default",
            }
          : null,
    });
  } catch (e) {
    console.warn("Error al enviar notificación del sistema:", e);
  }
}

export default function Home() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false); // ← añadir aquí
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
  const { mostrarConfirm, confirmModal } = useConfirm();
  const { tasks, setTasks, cargarTareas } = useTareasHoy();

  // Sin esto, expo-av usa el modo de audio por defecto: en iOS no suena
  // nada si el móvil está en silencio, y en general el volumen de "media"
  // puede no comportarse bien — por eso los sonidos de logros no sonaban
  // aunque el código los disparara correctamente.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  // Programar notificaciones del día al montar
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      const ahora = new Date();
      const hoy = hoyAppStr();
      await Notifications.cancelAllScheduledNotificationsAsync();

      const hoy12 = new Date();
      hoy12.setHours(12, 0, 0, 0);
      if (hoy12 > ahora) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "☀️ Es mediodía",
            body: "¿Has empezado tus tareas de hoy?",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: hoy12,
          },
        }).catch(() => {});
      }

      const hoy21 = new Date();
      hoy21.setHours(21, 0, 0, 0);
      if (hoy21 > ahora) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🌙 Se acaba el día",
            body: "¡Aún tienes tiempo de completar tus tareas!",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: hoy21,
          },
        }).catch(() => {});
      }

      const tareasDia = (await getTareasPorFecha(hoy)) as any[];
      for (const t of tareasDia) {
        if (t.completed || !t.hora || t.hora === "Sin hora") continue;
        const [hh, mm] = t.hora.split(":").map(Number);
        if (isNaN(hh) || isNaN(mm)) continue;
        const trigger5min = new Date();
        trigger5min.setHours(hh, mm - 5, 0, 0);
        if (trigger5min > ahora) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "⏰ ¡Quedan 5 minutos!",
              body: `La tarea "${t.title}" vence pronto`,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: trigger5min,
            },
          }).catch(() => {});
        }
      }
    })();
  }, []);
  const [notifType, setNotifType] = useState("ontime");
  const [showNotif, setShowNotif] = useState(false);
  const notifTimer = useRef<any>(null);
  const checkTimer = useRef<any>(null);
  const saltadasRef = useRef(0);
  const notifEnviadasHoy = useRef<Set<string>>(new Set());

  const [showRachaNotif, setShowRachaNotif] = useState(false);
  const [rachaNotifVal, setRachaNotifVal] = useState(0);
  const rachaNotifTimer = useRef<any>(null);

  const pendientesPenalRef = useRef<any>({ vencidasAyer: 0 });

  // Calcular vencidasAyer al montar para que esté disponible antes del efecto de penalización
  useEffect(() => {
    if (Platform.OS !== "web") {
      (async () => {
        const result = (await limpiarTareasViejas()) as any;
        pendientesPenalRef.current = {
          vencidasAyer: result?.vencidasAyer ?? 0,
        };
      })();
    }
  }, []);

  const gami = useGamificacion();
  const { ajustes, escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const reduceMotion = useReduceMotion();

  const penalizacionDisparadaRef = useRef(false);
  useEffect(() => {
    if (gami.cargando) return;
    if (!gami.esDiaNuevo) return;
    if (gami.penalizacionAplicada) return;
    if (penalizacionDisparadaRef.current) return;

    const timer = setTimeout(async () => {
      const { vencidasAyer } = pendientesPenalRef.current;
      if (vencidasAyer === 0) return;

      penalizacionDisparadaRef.current = true;
      const prevEstrellas = gami.estrellas;
      const res = (await gami.penalizarFinDia(vencidasAyer)) as any;
      if (res?.penalizacion > 0) {
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        disparaNotif("penal10");
        const nuevasEstrellas = prevEstrellas - res.penalizacion;
        if (prevEstrellas >= 600 && nuevasEstrellas < 600)
          setTimeout(() => disparaNotif("bajaOroPlata"), 4000);
        else if (prevEstrellas >= 300 && nuevasEstrellas < 300)
          setTimeout(() => disparaNotif("bajaPlatabronce"), 4000);
        else if (prevEstrellas >= 100 && nuevasEstrellas < 100)
          setTimeout(() => disparaNotif("bajaBronceSin"), 4000);
      }
      pendientesPenalRef.current = { vencidasAyer: 0 };
    }, 300);

    return () => clearTimeout(timer);
  }, [gami.cargando, gami.esDiaNuevo, gami.penalizacionAplicada]);

  const ultimoDiaInterval = useRef(hoyAppStr());

  useEffect(() => {
    pedirPermisosNotificaciones();
    configurarCanalAndroid();
    checkTimer.current = setInterval(
      async () => {
        const now = ahoraApp();
        const hora = now.getHours();
        const minutos = now.getMinutes();
        const hoy = hoyAppStr();

        if (hoy !== ultimoDiaInterval.current) {
          ultimoDiaInterval.current = hoy;

          await generarTareasRepetitivas();
          const { tareasHoy, vencidasAyer } =
            (await limpiarTareasViejas()) as any;
          setTasks(
            tareasHoy.map((r: any) => ({ ...r, completed: r.completed === 1 })),
          );

          notifEnviadasHoy.current = new Set();
          penalizacionDisparadaRef.current = false;

          // Programar notificaciones del día con trigger de hora para que lleguen aunque la app esté cerrada
          if (Platform.OS !== "web") {
            await Notifications.cancelAllScheduledNotificationsAsync();
            const ahora = new Date();

            // 12h — solo si no han pasado las 12 y no hay tareas completadas
            const hoy12 = new Date();
            hoy12.setHours(12, 0, 0, 0);
            if (hoy12 > ahora) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "☀️ Es mediodía",
                  body: "¿Has empezado tus tareas de hoy?",
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: hoy12,
                },
              });
            }

            // 21h — solo si no han pasado las 21
            const hoy21 = new Date();
            hoy21.setHours(21, 0, 0, 0);
            if (hoy21 > ahora) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🌙 Se acaba el día",
                  body: "¡Aún tienes tiempo de completar tus tareas!",
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: hoy21,
                },
              });
            }

            // 5 min antes de cada tarea con hora
            for (const t of tareasHoy as any[]) {
              if (t.completed || !t.hora || t.hora === "Sin hora") continue;
              const [hh, mm] = t.hora.split(":").map(Number);
              if (isNaN(hh) || isNaN(mm)) continue;
              const trigger5min = new Date();
              trigger5min.setHours(hh, mm - 5, 0, 0);
              if (trigger5min > ahora) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "⏰ ¡Quedan 5 minutos!",
                    body: `La tarea "${t.title}" vence pronto`,
                    sound: true,
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: trigger5min,
                  },
                });
              }
            }
          }

          if (vencidasAyer > 0 && !gami.penalizacionAplicada) {
            const prevEstrellas = gami.estrellas;
            const res = (await gami.penalizarFinDia(vencidasAyer)) as any;
            if (res?.penalizacion > 0) {
              disparaNotif("penal10");
              const nuevasEstrellas = prevEstrellas - res.penalizacion;
              if (prevEstrellas >= 600 && nuevasEstrellas < 600)
                setTimeout(() => disparaNotif("bajaOroPlata"), 4000);
              else if (prevEstrellas >= 300 && nuevasEstrellas < 300)
                setTimeout(() => disparaNotif("bajaPlatabronce"), 4000);
              else if (prevEstrellas >= 100 && nuevasEstrellas < 100)
                setTimeout(() => disparaNotif("bajaBronceSin"), 4000);
            }
          }

          gami.recargar();
          return;
        }

        const pending = tasks.filter((t) => !t.completed && t.fechaDia === hoy);
        // El aviso de "quedan 5 minutos" ya no se comprueba aquí: se
        // programa como notificación precisa del sistema al crear/editar
        // cada tarea (ver programarNotif5MinAntes), en vez de este chequeo
        // periódico que podía llegar tarde (solo se repetía cada 5 min).

        if (
          hora === 12 &&
          minutos === 0 &&
          gami.tareasCompletasHoy === 0 &&
          pending.length > 0 &&
          !notifEnviadasHoy.current.has("mitadDia")
        ) {
          notifEnviadasHoy.current.add("mitadDia");
          enviarNotifSistema(
            "☀️ Es mediodía",
            "Aún no has empezado tus tareas de hoy",
          );
        }

        if (
          hora === 21 &&
          minutos === 0 &&
          pending.length > 0 &&
          !notifEnviadasHoy.current.has("finDia")
        ) {
          notifEnviadasHoy.current.add("finDia");
          enviarNotifSistema(
            "🌙 Se acaba el día",
            `Quedan ${pending.length} tarea${pending.length > 1 ? "s" : ""} sin completar`,
          );
        }
      },
      __DEV__ ? 2000 : 300000, // 5 minutos en producción
    );
    return () => clearInterval(checkTimer.current);
  }, [
    tasks,
    gami.tareasCompletasHoy,
    gami.penalizacionAplicada,
    gami.estrellas,
  ]);

  async function reproducirSonido(archivo: string) {
    if (Platform.OS === "web") return;
    try {
      const { sound } = await Audio.Sound.createAsync(SONIDOS[archivo], {
        shouldPlay: true,
        volume: 1.0,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn("Error al reproducir sonido:", e);
    }
  }

  const disparaNotif = (type: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    if (Platform.OS !== "web") {
      const esMedalla = type === "oro" || type === "plata" || type === "bronce";
      const esBajaMedalla =
        type === "bajaOroPlata" ||
        type === "bajaPlatabronce" ||
        type === "bajaBronceSin";
      const esEliminar = type === "eliminada" || type === "saltadas";
      const esPenal = type === "penal10";
      const esGoalmet = type === "goalmet";

      if (esMedalla) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        reproducirSonido("success.mp3");
      } else if (esBajaMedalla) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        reproducirSonido("error.mp3");
      } else if (esPenal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        reproducirSonido("error.mp3");
      } else if (esGoalmet) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        reproducirSonido("goalmet.mp3");
      } else if (esEliminar) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    setNotifType(type);
    setShowNotif(true);
    notifTimer.current = setTimeout(
      () => setShowNotif(false),
      duracionNotif(type),
    );
  };

  const disparaRachaNotif = (racha: number) => {
    if (rachaNotifTimer.current) clearTimeout(rachaNotifTimer.current);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reproducirSonido("racha.mp3");
    }
    setRachaNotifVal(racha);
    setShowRachaNotif(true);
    rachaNotifTimer.current = setTimeout(() => setShowRachaNotif(false), 4500);
  };
  const today = ahoraApp();

  const formattedToday = `${capitalize(today.toLocaleDateString("es-ES", { weekday: "long" }))}, ${today.getDate()} de ${capitalize(today.toLocaleDateString("es-ES", { month: "long" }))} de ${today.getFullYear()}`;

  const handleTareaCompletada = async (task: Tarea) => {
    const tieneHora = task.hora && task.hora !== "Sin hora";
    const deadline = parseTiempoLim(task.hora);
    const enTiempo = tieneHora
      ? deadline
        ? ahoraAppMs() <= deadline.getTime()
        : false
      : true;
    const pts = tieneHora ? (enTiempo ? 5 : 3) : 5;

    await updateTareaCompletada(task.id, true, pts);
    if (ajustes.vibracion && Platform.OS !== "web")
      Vibration.vibrate(enTiempo ? [0, 80, 60, 120] : [0, 60]);
    if (Platform.OS !== "web") {
      if (pts === 5) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    AccessibilityInfo.announceForAccessibility(
      pts === 5
        ? `Tarea completada. +5 estrellas`
        : `Tarea completada tarde. +3 estrellas`,
    );

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: true, stars: pts } : t,
      ),
    );
    saltadasRef.current = 0;

    const prevTotal = gami.totalHecho;
    const hoy = hoyAppStr();
    const pendingAntes = tasks.filter(
      (t) => !t.completed && t.id !== task.id && t.fechaDia === hoy,
    );
    const totalDeHoy = tasks.filter((t) => t.fechaDia === hoy).length;

    const { nuevoEstado } = (await gami.completarTarea(
      enTiempo || !tieneHora,
    )) as any;
    const newTotal = nuevoEstado.totalHecho;
    const newRacha = nuevoEstado.racha;

    const rachaKey = `rachaHoy_${hoy}`;
    const rachaYaMostrada = await AsyncStorage.getItem(rachaKey);
    const debeMostrarRacha = newRacha >= 1 && !rachaYaMostrada;
    if (debeMostrarRacha) await AsyncStorage.setItem(rachaKey, "1");

    const todasCompletadas = pendingAntes.length === 0 && totalDeHoy > 0;
    const medalla = detectarMedalla(prevTotal, newTotal);
    const primerTipo = medalla
      ? medalla
      : !tieneHora
        ? "sinHora"
        : enTiempo
          ? "ontime"
          : "late";

    disparaNotif(primerTipo);

    // Cada siguiente notificación espera lo que realmente dura la anterior
    // (+ un pequeño respiro) en vez de un número fijo — si no, con tareas
    // que duran menos (2.2s) la siguiente notif se disparaba de más tarde
    // de la cuenta y con las que duran más (4.5s) se disparaba mientras la
    // anterior aún estaba en pantalla (el sonido de la racha sonaba a la
    // vez que se veía la notificación de "todo completado").
    let delay = duracionNotif(primerTipo) + 300;

    if (todasCompletadas) {
      setTimeout(() => disparaNotif("goalmet"), delay);
      delay += duracionNotif("goalmet") + 300;
    }

    if (debeMostrarRacha) {
      setTimeout(() => disparaRachaNotif(newRacha), delay);
    }
    setTaskModalVisible(false);
  };

  // ── Abrir modal de edición ────
  const handleAbrirEdicion = () => {
    setTaskModalVisible(false);
    setEditModalVisible(true);
  };

  const handleDeleteTask = async (task: Tarea) => {
    const esInstanciaRepetitiva = !!task.tareaBaseId && task.tareaBaseId !== "";
    const esTareaBase =
      task.repeticion &&
      task.repeticion !== "ninguna" &&
      !esInstanciaRepetitiva;

    if (esInstanciaRepetitiva || esTareaBase) {
      setTaskModalVisible(false);
      await new Promise((r) => setTimeout(r, 300));
      const opcion = await mostrarConfirm(
        "Eliminar tarea repetitiva",
        `"${task.title}" se repite ${task.repeticion === "diaria" || esTareaBase ? "cada día" : "cada semana"}. ¿Qué quieres eliminar?`,
        [
          { texto: "Cancelar", valor: null },
          { texto: "Solo esta vez", valor: "esta" },
          { texto: "Eliminar todas", valor: "todas", destructivo: true },
        ],
      );

      if (!opcion) return;
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (opcion === "esta") {
        await cancelarNotifTarea(task.notifId);
        if (!task.completed) {
          await cancelarTarea(task.id);
          saltadasRef.current += 1;
          if (saltadasRef.current >= 3) disparaNotif("saltadas");
          else disparaNotif("eliminada");
        } else {
          await deleteTarea(task.id);
        }
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      } else {
        const baseId =
          task.tareaBaseId && task.tareaBaseId !== ""
            ? task.tareaBaseId
            : task.id;
        const hoyStr = hoyAppStr();

        const instanciasEnPantalla = tasks.filter(
          (t) => t.id === baseId || t.tareaBaseId === baseId,
        );
        for (const inst of instanciasEnPantalla) {
          if (!inst.completed && inst.fechaDia <= hoyStr) {
            await cancelarNotifTarea(inst.notifId);
            await cancelarTarea(inst.id);
          }
        }

        await eliminarTareaYRepetitivas(baseId);
        setTasks((prev) =>
          prev.filter((t) => t.id !== baseId && t.tareaBaseId !== baseId),
        );
        disparaNotif("eliminada");
      }
    } else {
      setTaskModalVisible(false);
      await new Promise((r) => setTimeout(r, 300));
      const confirmado = await mostrarConfirm(
        "Eliminar tarea",
        `¿Seguro que quieres eliminar "${task.title}"?`,
        [
          { texto: "Cancelar", valor: false },
          { texto: "Eliminar", valor: true, destructivo: true },
        ],
      );

      if (!confirmado) return;
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      await cancelarNotifTarea(task.notifId);
      if (!task.completed) {
        await cancelarTarea(task.id);
        saltadasRef.current += 1;
        if (saltadasRef.current >= 3) disparaNotif("saltadas");
        else disparaNotif("eliminada");
      } else {
        await deleteTarea(task.id);
      }
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }
  };

  const hoy = hoyAppStr();
  const tareasDeHoy = tasks.filter((t) => t.fechaDia === hoy);
  const totalToday = tareasDeHoy.length;
  const doneToday = tareasDeHoy.filter((t) => t.completed).length;
  const pendingTasks = tareasDeHoy
    .filter(
      (t) =>
        !t.completed && t.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const tieneHoraA = a.hora && a.hora !== "Sin hora";
      const tieneHoraB = b.hora && b.hora !== "Sin hora";

      if (tieneHoraA && tieneHoraB) return a.hora.localeCompare(b.hora);
      if (tieneHoraA) return -1;
      if (tieneHoraB) return 1;
      return 0;
    });

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FBF6F0", paddingHorizontal: 20 }}
    >
      <PerezosoNotif
        type={notifType}
        show={showNotif}
        onClose={() => setShowNotif(false)}
      />
      <RachaNotif
        show={showRachaNotif && !showNotif}
        racha={rachaNotifVal}
        onClose={() => setShowRachaNotif(false)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        accessible={false}
      >
        {/* ── Cabecera ── */}
        <View
          style={{ paddingTop: 24, paddingBottom: 18, gap: 16 }}
          accessible={false}
        >
          <View style={styles.headerRow} accessible={false}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={`Mis Tareas. ${formattedToday}`}
            >
              <Text
                style={[styles.title, { fontSize: fs(26) }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                Mis Tareas
              </Text>
              <Text
                style={[styles.dateText, { fontSize: fs(15) }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {formattedToday}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/perfil")}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Mi perfil"
              accessibilityHint="Abre la pantalla de personalización del avatar"
            >
              <LinearGradient
                colors={["#C9A9DB", Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.4, y: 1 }}
                style={styles.profileBtn}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color="#fff"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </LinearGradient>
            </Pressable>
          </View>

          {/* ── Estadísticas rápidas ── */}
          <View
            style={{ flexDirection: "row", gap: 10 }}
            accessible
            accessibilityLabel={`${gami.estrellas} estrellas. Racha de ${gami.racha} ${gami.racha === 1 ? "día" : "días"}`}
          >
            <View style={styles.statPill}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FFF6DB" }]}
              >
                <Ionicons name="star" size={16} color="#E8B500" />
              </View>
              <View>
                <Text style={[styles.statValue, { fontSize: fs(16) }]}>
                  {gami.estrellas}
                </Text>
                <Text style={[styles.statLabel, { fontSize: fs(11) }]}>
                  estrellas
                </Text>
              </View>
            </View>
            <View style={styles.statPill}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#FFF2EC" }]}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { fontSize: fs(16) }]}>
                  {gami.racha} {gami.racha === 1 ? "día" : "días"}
                </Text>
                <Text style={[styles.statLabel, { fontSize: fs(11) }]}>
                  de racha
                </Text>
              </View>
            </View>
          </View>

          <View
            style={styles.searchBar}
            accessibilityLabel="Buscar tarea"
            accessibilityHint="Escribe para filtrar las tareas de hoy"
            accessibilityRole="search"
          >
            <Ionicons
              name="search"
              size={18}
              color="#C7C0CE"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <TextInput
              placeholder="Buscar tarea..."
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                fontSize: fs(15),
                fontFamily: AppFonts.body,
                color: "#3A3342",
              }}
              returnKeyType="search"
              accessibilityLabel="Buscar tarea"
              accessibilityHint="Escribe para filtrar las tareas de hoy"
              accessibilityRole="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {pendingTasks.length === 0 ? (
          <View
            style={styles.emptyBox}
            accessible
            accessibilityLiveRegion="polite"
          >
            {totalToday > 0 && doneToday === totalToday ? (
              <>
                <Image
                  source={PEREZOSO_IMAGENES.celebrando}
                  accessibilityLabel="Perezoso celebrando"
                  accessibilityIgnoresInvertColors
                />
                <Text
                  style={[styles.emptyText, { fontSize: fs(26) }]}
                  allowFontScaling={false}
                >
                  ¡Todo completado hoy!
                </Text>
              </>
            ) : (
              <>
                <Image
                  source={PEREZOSO_IMAGENES.llorando}
                  accessibilityLabel="Perezoso triste"
                  accessibilityIgnoresInvertColors
                />
                <Text
                  style={[styles.emptyText, { fontSize: fs(26) }]}
                  allowFontScaling={false}
                  accessibilityLabel="No tienes tareas para hoy"
                >
                  No tienes tareas para hoy
                </Text>
                <Text
                  style={[styles.emptySubText, { fontSize: fs(20) }]}
                  allowFontScaling={false}
                  accessibilityLabel="Pulsa + para añadir una tarea"
                >
                  Pulsa + para añadir una tarea
                </Text>
              </>
            )}
          </View>
        ) : (
          pendingTasks.map((item) => {
            const mins = minutosRestantes(item.hora);
            const vencida = mins !== null && mins < 0;
            const urgente = mins !== null && mins >= 0 && mins <= 10;
            const horaLabel =
              item.hora && item.hora !== "Sin hora"
                ? `, hora ${item.hora}`
                : "";
            const estLabel = vencida
              ? ", fuera de hora"
              : urgente
                ? `, quedan ${mins} minutos`
                : "";

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedTask(item);
                  setTaskModalVisible(true);
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${horaLabel}${estLabel}`}
                accessibilityHint="Pulsa para ver el detalle de la tarea"
                style={({ pressed }) => [
                  { opacity: pressed && !reduceMotion ? 0.75 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.taskRow,
                    vencida && styles.taskRowLate,
                    urgente && styles.taskRowUrgent,
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    {item.pictogramId ? (
                      <Image
                        source={{
                          uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png`,
                        }}
                        style={styles.pictogram}
                        accessibilityLabel={`Pictograma de ${item.title}`}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <View
                        style={[
                          styles.pictogramPlaceholder,
                          vencida && { backgroundColor: "#FCEBEB" },
                          urgente && !vencida && { backgroundColor: "#FFF2EC" },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        <Ionicons
                          name={
                            vencida
                              ? "alert-circle-outline"
                              : urgente
                                ? "time-outline"
                                : "checkmark-circle-outline"
                          }
                          size={22}
                          color={vencida ? RED : urgente ? ORANGE : PURPLE}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.taskTitle, { fontSize: fs(16) }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.repeticion && item.repeticion !== "ninguna" && (
                        <Text
                          style={{
                            fontSize: fs(11),
                            fontFamily: AppFonts.bodyBold,
                            color: PURPLE,
                          }}
                        >
                          {item.repeticion === "diaria"
                            ? "📅 Diaria"
                            : "📆 Semanal"}
                        </Text>
                      )}
                      {urgente && !vencida && (
                        <Text
                          style={{
                            fontSize: fs(11.5),
                            fontFamily: AppFonts.bodyBold,
                            color: ORANGE,
                          }}
                        >
                          ¡Quedan {mins} min!
                        </Text>
                      )}
                      {vencida && (
                        <Text
                          style={{
                            fontSize: fs(11.5),
                            fontFamily: AppFonts.bodyBold,
                            color: RED,
                          }}
                        >
                          ⚠ Fuera de hora
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {item.hora && item.hora !== "Sin hora" && (
                      <Text
                        style={[
                          styles.taskTime,
                          { fontSize: fs(13.5) },
                          vencida && { color: RED },
                          urgente && !vencida && { color: ORANGE },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        {item.hora}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed && !reduceMotion ? 0.85 : 1 },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Añadir nueva tarea"
        accessibilityHint="Abre el formulario para crear una nueva tarea de hoy"
      >
        <LinearGradient
          colors={["#C9A9DB", PURPLE]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons
            name="add"
            size={30}
            color="#FFF"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </LinearGradient>
      </Pressable>

      {/* ── MODAL: AÑADIR TAREA ── */}
      <ModalNuevaTarea
        visible={modalVisible}
        onCerrar={() => setModalVisible(false)}
        onGuardar={async (tarea) => {
          await insertTarea(tarea);
          const notifId = await programarNotif5MinAntes(
            hoyAppStr(),
            tarea.hora,
            tarea.title ?? "",
          );
          if (notifId && tarea.id) await updateTareaNotifId(tarea.id, notifId);
          setTasks((prev) => [
            ...prev,
            { ...tarea, fechaDia: hoyAppStr(), notifId } as Tarea,
          ]);
        }}
      />
      {/* ── MODAL: DETALLE TAREA ── */}
      <ModalDetalleTarea
        visible={taskModalVisible}
        tarea={selectedTask}
        onCerrar={() => setTaskModalVisible(false)}
        onCompletar={handleTareaCompletada}
        onEditar={handleAbrirEdicion}
        onEliminar={handleDeleteTask}
      />

      {/* ── MODAL: EDITAR TAREA ── */}
      <ModalEditarTarea
        visible={editModalVisible}
        tarea={selectedTask}
        onCerrar={() => setEditModalVisible(false)}
        onGuardar={async (titulo, pictogramId, hora) => {
          if (!selectedTask) return;
          const horaFinal = hora ?? "Sin hora";
          const esInstanciaRepetitiva =
            !!selectedTask.tareaBaseId && selectedTask.tareaBaseId !== "";
          const esTareaBase =
            selectedTask.repeticion &&
            selectedTask.repeticion !== "ninguna" &&
            !esInstanciaRepetitiva;

          if (esInstanciaRepetitiva || esTareaBase) {
            setEditModalVisible(false);
            setTimeout(async () => {
              const opcion = await mostrarConfirm(
                "Editar tarea repetitiva",
                "¿Qué quieres cambiar?",
                [
                  { texto: "Cancelar", valor: null },
                  { texto: "Solo esta vez", valor: "esta" },
                  { texto: "Todas las veces", valor: "todas" },
                ],
              );
              if (!opcion) return;
              if (Platform.OS !== "web")
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              if (opcion === "esta") {
                await updateTareaTituloPicto(
                  selectedTask.id,
                  titulo,
                  pictogramId,
                );
                await updateTareaHora(selectedTask.id, horaFinal);
                const notifIdEsta = await programarNotif5MinAntes(
                  selectedTask.fechaDia,
                  horaFinal,
                  titulo,
                  selectedTask.notifId,
                );
                await updateTareaNotifId(selectedTask.id, notifIdEsta);
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === selectedTask.id
                      ? {
                          ...t,
                          title: titulo,
                          pictogramId,
                          hora: horaFinal,
                          notifId: notifIdEsta,
                        }
                      : t,
                  ),
                );
              } else {
                const baseId = esInstanciaRepetitiva
                  ? selectedTask.tareaBaseId
                  : selectedTask.id;
                await updateTareaBaseCompleta(
                  baseId,
                  titulo,
                  pictogramId,
                  horaFinal,
                );
                const notifIdTodas = await programarNotif5MinAntes(
                  selectedTask.fechaDia,
                  horaFinal,
                  titulo,
                  selectedTask.notifId,
                );
                await updateTareaNotifId(selectedTask.id, notifIdTodas);
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === baseId || t.tareaBaseId === baseId
                      ? {
                          ...t,
                          title: titulo,
                          pictogramId,
                          hora: horaFinal,
                          notifId:
                            t.id === selectedTask.id ? notifIdTodas : t.notifId,
                        }
                      : t,
                  ),
                );
              }
              setSelectedTask((prev) =>
                prev
                  ? { ...prev, title: titulo, pictogramId, hora: horaFinal }
                  : prev,
              );
            }, 300);
          } else {
            await updateTareaTituloPicto(selectedTask.id, titulo, pictogramId);
            await updateTareaHora(selectedTask.id, horaFinal);
            const notifIdSimple = await programarNotif5MinAntes(
              selectedTask.fechaDia,
              horaFinal,
              titulo,
              selectedTask.notifId,
            );
            await updateTareaNotifId(selectedTask.id, notifIdSimple);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === selectedTask.id
                  ? {
                      ...t,
                      title: titulo,
                      pictogramId,
                      hora: horaFinal,
                      notifId: notifIdSimple,
                    }
                  : t,
              ),
            );
            setSelectedTask((prev) =>
              prev
                ? { ...prev, title: titulo, pictogramId, hora: horaFinal }
                : prev,
            );
            setEditModalVisible(false);
          }
        }}
      />

      {confirmModal}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    marginBottom: 2,
  },
  dateText: {
    fontFamily: AppFonts.body,
    color: "#8A8194",
    fontSize: 15,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECE4F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    lineHeight: 18,
  },
  statLabel: { fontFamily: AppFonts.body, color: "#8A8194" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECE4F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  emptyBox: { alignItems: "center", paddingVertical: 24, width: "100%" },
  emptyText: {
    fontSize: 26,
    color: PURPLE,
    fontFamily: AppFonts.displayBold,
    marginTop: 14,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 20,
    color: "#AAA",
    fontFamily: AppFonts.body,
    marginTop: 6,
  },

  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ECE4F0",
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    minHeight: 60,
    shadowColor: "#3A3342",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  taskRowLate: {
    backgroundColor: "#FDEDED",
    borderColor: "#F6C9C9",
  },
  taskRowUrgent: {
    backgroundColor: "#FFF2EC",
    borderColor: "#FFD8BE",
  },
  pictogram: { width: 46, height: 46, marginRight: 12, borderRadius: 14 },
  pictogramPlaceholder: {
    width: 46,
    height: 46,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: "#F4F0F6",
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: {
    flex: 1,
    fontFamily: AppFonts.displaySemibold,
    color: "#3A3342",
  },
  taskTime: {
    fontFamily: AppFonts.displayBold,
    color: "#8A8194",
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 20,
    shadowColor: PURPLE,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
