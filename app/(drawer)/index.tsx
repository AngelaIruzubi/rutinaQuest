import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';

import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import {
  cancelarTarea,
  deleteTarea,
  initDB,
  insertTarea,
  limpiarTareasViejas,
  updateTareaCompletada,
  updateTareaHora
} from '../../database/database';

import { useGamificacion } from '../../hooks/useGamificacion';
import { buscarPictograma } from "../../services/arasaac";

// ─── FECHA SIMULADA ───────────────────────────────────────────────────────────
import { ahoraApp, ahoraAppMs, fechaAppDate, hoyAppStr } from '../../utils/fecha';
// ─────────────────────────────────────────────────────────────────────────────

const PURPLE = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN = '#58CC02';
const GOLD = '#FFD700';
const ORANGE = '#FF6B35';
const RED = '#FF4444';
const PEREZOSO_IMAGENES: Record<string, any> = {
  pulgar: require('../../assets/images/perezoso/perezoso_pulgar.png'),
  llorando: require('../../assets/images/perezoso/perezoso_llorando.png'),
  celebrando: require('../../assets/images/perezoso/perezoso_celebrando.png'),
  celebrando_gif: require('../../assets/images/perezoso/contento_noti.gif'),
  llorando_gif: require('../../assets/images/perezoso/triste_noti.gif'),
  enfadado: require('../../assets/images/perezoso/perezoso_enfadado.png'),
  enfadado_gif: require('../../assets/images/perezoso/enfadado_noti.gif'),
  esperando: require('../../assets/images/perezoso/perezoso_esperando.png'),
  esperando_gif: require('../../assets/images/perezoso/aburrido_noti.gif'),
  cansado: require('../../assets/images/perezoso/perezoso_cansado.png'),
};


const NOTIF_CFG: Record<
  string,
  {
    asset: string;
    msg: string;
    color: string;

  }
> = {
  ontime:   { asset: 'pulgar',     msg: '¡Genial, conseguiste las 5 ⭐!',              color: PURPLE },
  late:     { asset: 'pulgar',     msg: '¡Completada un poco tarde! 3 ⭐',             color: PURPLE },
  sinHora:  { asset: 'pulgar',     msg: '¡Tarea completada! Conseguiste las 5 ⭐',     color: PURPLE },
  goalmet:  { asset: 'celebrando_gif', msg: '¡Todas las tareas de hoy completadas!',       color: PURPLE },
  bronce:   { asset: 'pulgar',     msg: '¡Medalla de Bronce conseguida! 🥉',           color: '#CD7F32' },
  plata:    { asset: 'pulgar',     msg: '¡Medalla de Plata conseguida! 🥈',            color: '#C0C0C0' },
  oro:      { asset: 'celebrando_gif', msg: '¡Medalla de Oro conseguida! 🥇',              color: GOLD},
  cincoMin: { asset: 'esperando_gif',  msg: '¡Quedan 5 minutos para una tarea!',           color: PURPLE },
  saltadas: { asset: 'enfadado_gif',   msg: 'Has saltado varias tareas...',                color: PURPLE },
  mitadDia: { asset: 'esperando_gif',    msg: 'Es mediodía y aún no has empezado',           color: PURPLE },
  finDia:   { asset: 'enfadado_gif',   msg: '¡Se acaba el día y quedan tareas!',           color: PURPLE },
  eliminada:{ asset: 'llorando_gif',   msg: '¡Oh no, eliminaste una tarea!',               color: PURPLE },
  penal10:  { asset: 'enfadado_gif',   msg: 'Ayer te quedó alguna tarea sin hacer. -10 ⭐', color: RED },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICACIÓN FULLSCREEN GENERAL
function SlothNotif({ type, show }: { type: string; show: boolean }) {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const cfg = NOTIF_CFG[type] || NOTIF_CFG.ontime;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(80);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 80,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [show, type]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fullNotifOverlay,
          { opacity: opacityAnim },
        ]}
      >
        <Animated.View
          style={[
            styles.fullNotifCard,
            { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
          ]}
        >
          <Image
            source={PEREZOSO_IMAGENES[cfg.asset]}
            style={styles.fullNotifImg}
            resizeMode="contain"
          />

          <Text style={[styles.fullNotifText, { color: cfg.color }]}>
            {cfg.msg}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── NOTIFICACIÓN DE RACHA FULLSCREEN ────────────────────────────────────────
function RachaNotif({ show, racha }: { show: boolean; racha: number }) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const countAnim = useRef(new Animated.Value(Math.max(0, racha - 1))).current;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.6);
      countAnim.setValue(Math.max(0, racha - 1));

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 12,
        }),
      ]).start(() => {
        Animated.timing(countAnim, {
          toValue: racha,
          duration: 600,
          useNativeDriver: false,
        }).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.6,
          useNativeDriver: true,
          speed: 14,
          bounciness: 0,
        }),
      ]).start();
    }
  }, [show, racha]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rachaNotif,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.rachaNotifCard,
            {
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.rachaNotifFire}>🔥</Text>

          <View style={styles.rachaNotifTextCol}>
            <Text style={styles.rachaNotifLabel}>¡Racha activa!</Text>
            <AnimatedCounter anim={countAnim} max={racha} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AnimatedCounter({ anim, max }: { anim: Animated.Value; max: number }) {
  const [display, setDisplay] = useState(Math.max(0, max - 1));

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });

    return () => {
      anim.removeListener(id);
    };
  }, [anim]);

  return (
    <Text style={styles.rachaNotifCount}>
      <Text style={styles.rachaNotifNum}>{display}</Text>
      {' días seguidos'}
    </Text>
  );
}

function StarRow({ count = 0, size = 14 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: GOLD, letterSpacing: 2 }}>
      {'★'.repeat(count)}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

function minutosRestantes(hora?: string | null): number | null {
  const dl = parseTiempoLim(hora);
  if (!dl) return null;
  return Math.round((dl.getTime() - ahoraAppMs()) / 60000);
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tempTime] = useState(fechaAppDate());
  const [titulo, setTitulo] = useState('');
  const [pictogramId, setPictogramId] = useState<number | null>(null);

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskTempTime, setTaskTempTime] = useState(fechaAppDate());

  const [notifType, setNotifType] = useState('ontime');
  const [showNotif, setShowNotif] = useState(false);
  const notifTimer = useRef<any>(null);
  const checkTimer = useRef<any>(null);
  const saltadasRef = useRef(0);
  const notifEnviadasHoy = useRef<Set<string>>(new Set());

  // ── Estado para la notificación de racha ─────────────────────────────────
  const [showRachaNotif, setShowRachaNotif] = useState(false);
  const [rachaNotifVal, setRachaNotifVal] = useState(0);
  const rachaNotifTimer = useRef<any>(null);

  const pendientesPenalRef = useRef<any>({ canceladasAyer: 0, completadasAyer: 0 });

  const gami = useGamificacion();

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    initDB();
    const { tareasHoy, canceladasAyer, completadasAyer } = limpiarTareasViejas() as any;
    setTasks(tareasHoy.map((r: any) => ({ ...r, completed: r.completed === 1 })));
    pendientesPenalRef.current = { canceladasAyer, completadasAyer };
  }, []);

  // ── Penalización del día anterior: solo cuando el hook confirma día nuevo ─
  useEffect(() => {
    if (gami.cargando) return;
    if (!gami.esDiaNuevo) return; // evita dispararse en recargas del mismo día

    const { canceladasAyer, completadasAyer } = pendientesPenalRef.current;
    if (canceladasAyer + completadasAyer === 0) return; // sin tareas ayer

    (async () => {
      if (completadasAyer === 0) {
        // No hizo nada ayer → solo pierde la racha (ya gestionado en el hook)
        // Sin penalización de estrellas ni notificación
      } else if (canceladasAyer > 0) {
        // Hizo algo pero dejó tareas sin completar → -10 ⭐
        const res = await gami.penalizarFinDia(canceladasAyer, completadasAyer) as any;
        if (res?.penalizacion > 0) disparaNotif('penal10');
      }
      pendientesPenalRef.current = { canceladasAyer: 0, completadasAyer: 0 };
    })();
  }, [gami.cargando, gami.esDiaNuevo]);

  // ── Checks periódicos ─────────────────────────────────────────────────────
  useEffect(() => {
    checkTimer.current = setInterval(() => {
      const now = ahoraApp();
      const hora = now.getHours();
      const minutos = now.getMinutes();
      const hoy = hoyAppStr();

      const pending = tasks.filter(t => !t.completed && t.fechaDia === hoy);

      for (const t of pending) {
        const mins = minutosRestantes(t.hora);
        if (mins !== null && mins > 0 && mins <= 5) {
          const key = `cincoMin_${t.id}`;
          if (!notifEnviadasHoy.current.has(key)) {
            notifEnviadasHoy.current.add(key);
            disparaNotif('cincoMin');
          }
          break;
        }
      }

      if (
        hora === 12 &&
        minutos === 0 &&
        gami.tareasCompletasHoy === 0 &&
        pending.length > 0 &&
        !notifEnviadasHoy.current.has('mitadDia')
      ) {
        notifEnviadasHoy.current.add('mitadDia');
        disparaNotif('mitadDia');
      }

      if (
        hora === 21 &&
        minutos === 0 &&
        pending.length > 0 &&
        !notifEnviadasHoy.current.has('finDia')
      ) {
        notifEnviadasHoy.current.add('finDia');
        disparaNotif('finDia');
        // Solo penalizar si hizo algo hoy pero quedaron pendientes
        if (gami.tareasCompletasHoy > 0) {
          gami.penalizarFinDia(pending.length, gami.tareasCompletasHoy);
        }
        // Si no hizo nada: la racha se romperá al día siguiente al arrancar
      }
    }, 60000);

    return () => clearInterval(checkTimer.current);
  }, [tasks, gami.tareasCompletasHoy]);

  const disparaNotif = (type: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotifType(type);
    setShowNotif(true);
    notifTimer.current = setTimeout(() => setShowNotif(false), 3000);
  };

  const disparaRachaNotif = (racha: number) => {
    if (rachaNotifTimer.current) clearTimeout(rachaNotifTimer.current);
    setRachaNotifVal(racha);
    setShowRachaNotif(true);
    rachaNotifTimer.current = setTimeout(() => setShowRachaNotif(false), 3500);
  };

  const disparaRachaDespues = (racha: number, delay = 3200) => {
    setTimeout(() => {
      disparaRachaNotif(racha);
    }, delay);
  };

  const buscarImagen = async (texto: string) => {
    setTitulo(texto);
    const id = await buscarPictograma(texto);
    if (id) setPictogramId(id);
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedTime(
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }
    setShowPicker(false);
  };

  const handleTaskTimeChange = (event: any, date?: Date) => {
    setShowTaskPicker(false);
    if (!date || !selectedTask) return;

    const nuevaHora = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (Platform.OS !== 'web') updateTareaHora(selectedTask.id, nuevaHora);

    setTasks(prev =>
      prev.map(t => (t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t))
    );

    setSelectedTask((prev: any) => ({ ...prev, hora: nuevaHora }));
  };

  const today = ahoraApp();
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const formattedToday = `${capitalize(
    today.toLocaleDateString('es-ES', { weekday: 'long' })
  )}, ${today.getDate()} de ${capitalize(
    today.toLocaleDateString('es-ES', { month: 'long' })
  )} de ${today.getFullYear()}`;

  // ── Completar tarea ───────────────────────────────────────────────────────
  const handleTareaCompletada = async (task: any) => {
    const tieneHora = task.hora && task.hora !== 'Sin hora';
    const deadline = parseTiempoLim(task.hora);
    const enTiempo = tieneHora ? (deadline ? ahoraAppMs() <= deadline.getTime() : false) : true;
    const pts = tieneHora ? (enTiempo ? 5 : 3) : 5;

    updateTareaCompletada(task.id, true, pts);

    setTasks(prev =>
      prev.map(t =>
        t.id === task.id ? { ...t, completed: true, stars: pts } : t
      )
    );

    saltadasRef.current = 0;

    const prevTotal = gami.totalHecho;

    const hoy = hoyAppStr();
    const pendingAntes = tasks.filter(
      t => !t.completed && t.id !== task.id && t.fechaDia === hoy
    );
    const totalDeHoy = tasks.filter(t => t.fechaDia === hoy).length;

    const { nuevoEstado } = (await gami.completarTarea(enTiempo || !tieneHora)) as any;
    const newTotal = nuevoEstado.totalHecho;
    const newRacha = nuevoEstado.racha;

    const debeMostrarRacha =
      newRacha >= 1 && !notifEnviadasHoy.current.has('rachaHoy');

    if (debeMostrarRacha) {
      notifEnviadasHoy.current.add('rachaHoy');
    }

    if (newTotal >= 600 && prevTotal < 600) {
      disparaNotif('oro');
    } else if (newTotal >= 300 && prevTotal < 300) {
      disparaNotif('plata');
    } else if (newTotal >= 100 && prevTotal < 100) {
      disparaNotif('bronce');
    } else if (pendingAntes.length === 0 && totalDeHoy > 0) {
      disparaNotif('goalmet');
    } else if (!tieneHora) {
      disparaNotif('sinHora');
    } else if (enTiempo) {
      disparaNotif('ontime');
    } else {
      disparaNotif('late');
    }

    if (debeMostrarRacha) {
      disparaRachaDespues(newRacha, 3200);
    }

    setTaskModalVisible(false);
  };

  // ── Eliminar tarea ────────────────────────────────────────────────────────
  const handleDeleteTask = async (task: any) => {
    if (!task.completed) {
      cancelarTarea(task.id);
      saltadasRef.current += 1;
      if (saltadasRef.current >= 3) disparaNotif('saltadas');
      else disparaNotif('eliminada');
    } else {
      deleteTarea(task.id);
    }

    setTasks(prev => prev.filter(t => t.id !== task.id));
    setTaskModalVisible(false);
  };

  // ── Stats — solo tareas de HOY ────────────────────────────────────────────
  const hoy = hoyAppStr();
  const tareasDeHoy = tasks.filter(t => t.fechaDia === hoy);
  const totalToday = tareasDeHoy.length;
  const doneToday = tareasDeHoy.filter(t => t.completed).length;
  const dailyPct = totalToday > 0 ? Math.min((doneToday / totalToday) * 100, 100) : 0;
  const starsToday = gami.tareasCompletasHoy * 5;

  const pendingTasks = tareasDeHoy.filter(t =>
    !t.completed && t.title.toLowerCase().includes(search.toLowerCase())
  );

  const nextMedal = (() => {
    if (gami.totalHecho < 50) return { label: 'Bronce 🥉', req: 50, color: '#9c9c9c' };
    if (gami.totalHecho < 200) return { label: 'Plata 🥈', req: 200, color: '#9c9c9c' };
    if (gami.totalHecho < 400) return { label: 'Oro 🥇', req: 400, color: GOLD };
    return null;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20 }}>
      {/* Notificaciones fullscreen */}
      <SlothNotif type={notifType} show={showNotif} />
      <RachaNotif show={showRachaNotif} racha={rachaNotifVal} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: 20, paddingBottom: 20 }}>
          <View
            style={{
              flexDirection: "column",
              padding: 40,
              justifyContent: "center",
              alignItems: "center",
              gap: 20
            }}
          >
            <View>
              <Text style={styles.title}>Mis Tareas</Text>
              <Text style={styles.dateText}>{formattedToday}</Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <TextInput
              placeholder="Buscar tarea.."
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, fontSize: 16 }}
            />
            <Ionicons name="search" size={20} color="#999" />
          </View>
        </View>

        {/* Lista de tareas */}
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyBox}>
            {totalToday > 0 && doneToday === totalToday ? (
              <>
                <Image source={PEREZOSO_IMAGENES.celebrando} />
                <Text style={styles.emptyText}>¡Todo completado hoy!</Text>
              </>
            ) : (
              <>
                <Image source={PEREZOSO_IMAGENES.llorando} />
                <Text style={styles.emptyText}>No tienes tareas para hoy</Text>
                <Text style={styles.emptySubText}>Pulsa + para añadir una tarea</Text>
              </>
            )}
          </View>
        ) : (
          pendingTasks.map(item => {
            const mins = minutosRestantes(item.hora);
            const vencida = mins !== null && mins < 0;
            const urgente = mins !== null && mins >= 0 && mins <= 10;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedTask(item);
                  setTaskModalVisible(true);
                }}
              >
                <View
                  style={[
                    styles.taskRow,
                    vencida && styles.taskRowLate,
                    urgente && styles.taskRowUrgent,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {item.pictogramId && (
                      <Image
                        source={{
                          uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png`
                        }}
                        style={styles.pictogram}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      {urgente && !vencida && (
                        <Text style={{ fontSize: 11, color: ORANGE, fontWeight: '600' }}>
                          ¡Quedan {mins} min!
                        </Text>
                      )}

                      {vencida && (
                        <Text style={{ fontSize: 11, color: RED, fontWeight: '600' }}>
                          ⚠ Fuera de hora
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={[styles.taskTime, vencida && { color: RED }]}>
                        {item.hora}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#CCC" />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 25,
          backgroundColor: '#A77BBE',
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </Pressable>

      {/* MODAL: AÑADIR TAREA */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalTopBar}>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={26} color={PURPLE} />
                </Pressable>
                <Text style={styles.modalTopTitle}>Nueva tarea</Text>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Escribe tu tarea..."
                  value={titulo}
                  onChangeText={buscarImagen}
                  style={{ flex: 1, paddingVertical: 10, fontSize: 16 }}
                />
                <Pressable onPress={() => setShowPicker(true)}>
                  <Ionicons name="calendar-outline" size={22} color={PURPLE} />
                </Pressable>
              </View>

              <Text style={styles.timeText}>
                {selectedTime ? `Hora: ${selectedTime}` : 'Sin hora seleccionada'}
              </Text>

              {showPicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}

              {showPicker && Platform.OS === 'web' && (
                <input
                  type="time"
                  onChange={(e) => {
                    setSelectedTime(e.target.value);
                    setShowPicker(false);
                  }}
                  style={{ marginTop: 10, padding: 8, fontSize: 16 }}
                />
              )}

              {pictogramId && (
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                  <Image
                    source={{
                      uri: `https://static.arasaac.org/pictograms/${pictogramId}/${pictogramId}_300.png`
                    }}
                    style={{ width: 130, height: 130 }}
                  />
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (titulo.trim()) {
                    const newTask = {
                      id: `${hoyAppStr()}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
                      title: titulo,
                      pictogramId: pictogramId ?? null,
                      hora: selectedTime ?? 'Sin hora',
                      completed: false,
                      stars: 0
                    };

                    insertTarea(newTask);
                    setTasks(prev => [...prev, { ...newTask, fechaDia: hoyAppStr() }]);

                    setTitulo('');
                    setSelectedTime(null);
                    setPictogramId(null);
                    setModalVisible(false);
                  }
                }}
                style={styles.btnPrimary}
              >
                <Text style={styles.btnPrimaryText}>Añadir ✓</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: DETALLE TAREA */}
      <Modal
        visible={taskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setTaskModalVisible(false)}>
          <Pressable
            style={[styles.modalBox, { alignItems: 'center' }]}
            onPress={e => e.stopPropagation()}
          >
            <Pressable
              onPress={() => setTaskModalVisible(false)}
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}
            >
              <Ionicons name="close" size={26} color={PURPLE} />
            </Pressable>

            <View style={[styles.modalTopBar, { justifyContent: 'center' }]}>
              <Text style={styles.modalTopTitle}>{selectedTask?.title}</Text>
            </View>

            {selectedTask?.pictogramId ? (
              <Image
                source={{
                  uri: `https://static.arasaac.org/pictograms/${selectedTask.pictogramId}/${selectedTask.pictogramId}_300.png`
                }}
                style={styles.detailPicto}
              />
            ) : (
              <View style={styles.detailPictoEmpty}>
                <Ionicons name="document-outline" size={60} color="#CCC" />
              </View>
            )}

            <Pressable
              onPress={() => {
                if (!selectedTask?.completed) {
                  const dl = parseTiempoLim(selectedTask?.hora);
                  setTaskTempTime(dl ? dl : fechaAppDate());
                  setShowTaskPicker(true);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 12
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 12
                }}
              >
                <Text style={styles.detailTime}>🕐 {selectedTask?.hora ?? 'Sin hora'}</Text>
                {!selectedTask?.completed && (
                  <Ionicons name="pencil" size={20} color={PURPLE} />
                )}
              </View>
            </Pressable>

            {showTaskPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={taskTempTime}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTaskTimeChange}
              />
            )}

            {showTaskPicker && Platform.OS === 'web' && (
              <input
                type="time"
                defaultValue={selectedTask?.hora !== 'Sin hora' ? selectedTask?.hora : ''}
                onChange={(e) => {
                  setShowTaskPicker(false);
                  if (!e.target.value || !selectedTask) return;

                  const nuevaHora = e.target.value;
                  const stored = localStorage.getItem('tareas');

                  if (stored) {
                    const tareas = JSON.parse(stored).map((t: any) =>
                      t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t
                    );
                    localStorage.setItem('tareas', JSON.stringify(tareas));
                  }

                  setTasks(prev =>
                    prev.map(t =>
                      t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t
                    )
                  );

                  setSelectedTask((prev: any) => ({ ...prev, hora: nuevaHora }));
                }}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  fontSize: 16,
                  borderRadius: 8,
                  borderColor: PURPLE,
                  borderWidth: 1
                }}
              />
            )}

            {selectedTask?.completed ? (
              <View style={styles.detailDoneBox}>
                <StarRow count={selectedTask?.stars ?? 5} size={30} />
                <Text
                  style={{
                    color: GREEN,
                    fontWeight: '700',
                    marginTop: 8,
                    fontSize: 15
                  }}
                >
                  ¡Tarea completada!
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignContent: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
              >
                <Pressable
                  onPress={() => handleTareaCompletada(selectedTask)}
                  style={styles.btnPrimary}
                >
                  <Text style={styles.btnPrimaryText}>Realizada ✓</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDeleteTask(selectedTask)}
                  style={styles.btnPrimary}
                >
                  <Text style={styles.btnPrimaryText}>Eliminar tarea x</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function parseTiempoLim(hora: string | undefined | null): Date | null {
  if (!hora || hora === 'Sin hora') return null;

  const [h, m] = hora.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const d = fechaAppDate(hoyAppStr());
  d.setHours(h, m, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FBF8',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: '600',
    color: PURPLE,
    textAlign: 'center',
    marginBottom: 6
  },

  dateText: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 20,
    fontSize: 17
  },

  // ── NOTIFICACIONES FULLSCREEN ─────────────────────────────────────────────
  fullNotifOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FBF8',
    zIndex: 9999,
    elevation: 9999,
  },

fullNotifCard: {
  width: '100%',
  backgroundColor: '#F9FBF8',
  borderRadius: 28,
  paddingVertical: 28,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 12,
},

fullNotifImg: {

  backgroundColor: '#F9FBF8'
},
  fullNotifText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },

  // ── NOTIFICACIÓN DE RACHA ────────────────────────────────────────────────
  rachaNotif: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,26,0.96)',
  },

  rachaNotifCard: {
    width: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    elevation: 18,
  },

  rachaNotifFire: {
    fontSize: 70,
    marginBottom: 10,
  },

  rachaNotifTextCol: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
  },

  rachaNotifLabel: {
    fontSize: 24,
    color: '#FFB085',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  rachaNotifCount: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },

  rachaNotifNum: {
    fontSize: 46,
    color: ORANGE,
    fontWeight: '800',
  },

  progressCard: {
    backgroundColor: PURPLE_BG,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: '100%',
    borderWidth: 1.5,
    borderColor: PURPLE_LT,
    gap: 2,
    shadowColor: PURPLE,
    shadowOpacity: .08,
    shadowRadius: 8,
    elevation: 3,
  },

  progressHeader: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    gap: 20,
    paddingVertical: 12,
    paddingHorizontal: 40,
    width: '100%'
  },

  progressLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: PURPLE
  },

  progressCount: {
    fontSize: 16,
    color: '#888'
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f2f2',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
    height: 200
  },

  emptyText: {
    fontSize: 26,
    color: PURPLE,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center'
  },

  emptySubText: {
    fontSize: 20,
    color: '#AAA',
    marginTop: 6
  },

  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f2f2',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
  },

  taskRowLate: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC'
  },

  taskRowUrgent: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#FFD9A8'
  },

  pictogram: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 6
  },

  taskTitle: {
    fontSize: 17,
    flex: 1,
    color: '#333'
  },

  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#888'
  },

  taskTime: {
    color: '#888',
    fontSize: 13
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalBox: {
    backgroundColor: PURPLE_BG,
    borderRadius: 22,
    padding: 20,
    width: '90%'
  },

  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  modalTopTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: PURPLE,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },

  timeText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#888',
    fontSize: 13
  },

  btnPrimary: {
    backgroundColor: PURPLE_LT,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 16
  },

  btnPrimaryText: {
    fontSize: 20,
    color: PURPLE,
    fontWeight: '600'
  },

  btnDelete: {
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 6
  },

  btnDeleteText: {
    fontSize: 15,
    color: RED
  },

  detailPicto: {
    width: 160,
    height: 160,
    marginVertical: 16,
    borderRadius: 12
  },

  detailPictoEmpty: {
    width: 160,
    height: 160,
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f2f2',
    borderRadius: 12
  },

  detailTime: {
    color: '#888',
    fontSize: 20
  },

  detailDoneBox: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%'
  },

  starsPreview: {
    backgroundColor: '#FFFBEA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: GOLD
  },

  starsPreviewText: {
    fontSize: 15,
    fontWeight: '700'
  },
});