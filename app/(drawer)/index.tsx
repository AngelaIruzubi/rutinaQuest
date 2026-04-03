import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { cancelarTarea, deleteTarea, initDB, insertTarea, limpiarTareasViejas, updateTareaCompletada, updateTareaHora } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';
import { buscarPictograma } from "../../services/arasaac";



const FECHA_SIMULADA = '04/05/2026'; 
  function hoySimulado() {
  return FECHA_SIMULADA ?? new Date().toISOString().slice(0, 10);
}


const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const GOLD      = '#FFD700';
const ORANGE    = '#FF6B35';
const RED       = '#FF4444';

const PEREZOSO_IMAGENES: Record<string, any> = {
  pulgar:     require('../../assets/images/perezoso/perezoso_pulgar.png'),
  llorando:   require('../../assets/images/perezoso/perezoso_llorando.png'),
  celebrando: require('../../assets/images/perezoso/perezoso_celebrando.png'),
  enfadado:   require('../../assets/images/perezoso/perezoso_enfadado.png'),
  esperando:  require('../../assets/images/perezoso/perezoso_esperando.png'),
  cansado:    require('../../assets/images/perezoso/perezoso_cansado.png'),
};

const NOTIF_CFG: Record<string, { asset: string; msg: string; color: string }> = {
  ontime:   { asset: 'pulgar',     msg: '¡Genial, conseguistes las 5 ⭐',          color: PURPLE    },
  late:     { asset: 'celebrando', msg: '¡Completada un poco tarde 3 ⭐',           color: PURPLE    },
  sinHora:  { asset: 'pulgar',     msg: '¡Tarea completada!, conseguistes las 5 ⭐', color: PURPLE   },
  goalmet:  { asset: 'celebrando', msg: '¡Todas las tareas de hoy completadas!',    color: PURPLE    },
  bronce:   { asset: 'pulgar',     msg: '¡Medalla de Bronce conseguida! 🥉',        color: '#CD7F32' },
  plata:    { asset: 'pulgar',     msg: '¡Medalla de Plata conseguida! 🥈',         color: '#C0C0C0' },
  oro:      { asset: 'celebrando', msg: '¡Medalla de Oro conseguida! 🥇',           color: GOLD      },
  cincoMin: { asset: 'esperando',  msg: '¡Quedan 5 minutos para una tarea!',        color: PURPLE    },
  saltadas: { asset: 'llorando',   msg: 'Has saltado varias tareas...',              color: PURPLE    },
  mitadDia: { asset: 'cansado',    msg: 'Es mediodía y aún no has empezado',        color: PURPLE    },
  finDia:   { asset: 'enfadado',   msg: '¡Se acaba el día y quedan tareas!',        color: PURPLE    },
  // Al eliminar: solo expresión, sin texto de penalización
  eliminada:{ asset: 'llorando',   msg: '¡Oh no, eliminaste una tarea!',            color: PURPLE    },
};

// ─── Configurar notificaciones push ──────────────────────────────────────────


/*let Notifications = null;
 
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
 
// Pedir permiso — solo en nativo
async function pedirPermisoNotificaciones() {
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
 
// Enviar notif inmediata — solo en nativo
async function enviarNotifPush(titulo, cuerpo) {
  if (!Notifications) return;
  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger: null,
  });
}
 
// Programar notif a las 21:00 — solo en nativo
async function programarNotifFinDia() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const ahora  = new Date();
  const finDia = new Date();
  finDia.setHours(21, 0, 0, 0);
  if (finDia <= ahora) return; // ya pasaron las 21h
  const segundos = Math.round((finDia.getTime() - ahora.getTime()) / 1000);
  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '¡Se acaba el día! 😠',
      body: 'Tienes tareas pendientes. ¡Completa alguna antes de las 21:00!',
      sound: true,
    },
    trigger: { seconds: segundos },
  });
}*/
// ─────────────────────────────────────────────────────────────────────────────
function SlothNotif({ type, show }: { type: string; show: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const cfg  = NOTIF_CFG[type] || NOTIF_CFG.ontime;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: show ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 9,
    }).start();
  }, [show]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.notif,
        { borderColor: cfg.color },
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }),
          }],
        },
      ]}
    >
      <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={styles.notifImg} />
      <Text style={[styles.notifText, { color: cfg.color }]}>{cfg.msg}</Text>
    </Animated.View>
  );
}

function ProgressBar({ pct = 0, color = '#A77BBE' }: { pct: number; color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={{
      height: 6,
      backgroundColor: '#E5D9EE',
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 6,
    }}>
      <Animated.View style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: PURPLE,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
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
  return Math.round((dl.getTime() - Date.now()) / 60000);
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {

  const [modalVisible,     setModalVisible]     = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [search,           setSearch]           = useState('');
  const [selectedTask,     setSelectedTask]     = useState<any>(null);
  const [tasks,            setTasks]            = useState<any[]>([]);
  const [showPicker,       setShowPicker]       = useState(false);
  const [selectedTime,     setSelectedTime]     = useState<string | null>(null);
  const [tempTime]                              = useState(new Date());
  const [titulo,           setTitulo]           = useState('');
  const [pictogramId,      setPictogramId]      = useState<number | null>(null);
  const [showDone,         setShowDone]         = useState(true);

  // ── Picker de hora dentro del modal de tarea ──────────────────────────────
  const [showTaskPicker,   setShowTaskPicker]   = useState(false);
  const [taskTempTime,     setTaskTempTime]     = useState(new Date());

  const [notifType,  setNotifType]  = useState('ontime');
  const [showNotif,  setShowNotif]  = useState(false);
  const notifTimer  = useRef<any>(null);
  const checkTimer  = useRef<any>(null);
  const saltadasRef = useRef(0);
  // Guardar qué notifs periódicas ya se enviaron hoy para no repetir
  const notifEnviadasHoy = useRef<Set<string>>(new Set());

  const gami = useGamificacion();

  // ── Carga inicial ─────────────────────────────────────────────────────────
useEffect(() => {
  initDB();
  const rowsLimpias = limpiarTareasViejas();
  setTasks(rowsLimpias.map((r: any) => ({ ...r, completed: r.completed === 1 })));
}, []);

  // ── Checks periódicos ─────────────────────────────────────────────────────
  useEffect(() => {
    checkTimer.current = setInterval(() => {
      const now     = new Date();
      const hora    = now.getHours();
      const minutos = now.getMinutes();
      const pending = tasks.filter(t => !t.completed);

      // 1) 5 min antes de una tarea (solo una vez por tarea)
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

      // 2) Mediodía: solo si no se ha enviado hoy
      if (hora === 12 && minutos === 0
        && gami.tareasCompletasHoy === 0
        && pending.length > 0
        && !notifEnviadasHoy.current.has('mitadDia')
      ) {
        notifEnviadasHoy.current.add('mitadDia');
        disparaNotif('mitadDia');
      }

      // 3) Fin del día (21:00) — notif push + in-app + penalización -5 estrellas
      if (hora === 21 && minutos === 0
        && pending.length > 0
        && !notifEnviadasHoy.current.has('finDia')
      ) {
        notifEnviadasHoy.current.add('finDia');
        disparaNotif('finDia');
        // Penalización: -5 estrellas por las tareas no hechas
        gami.penalizarFinDia(pending.length);
        // Notificación push al dispositivo
       /* enviarNotifPush(
          '¡Se acabó el día! 😠',
          `Tenías ${pending.length} tarea(s) pendiente(s). Has perdido ${pending.length * 5} ⭐`
        );*/
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

  const buscarImagen = async (texto: string) => {
    setTitulo(texto);
    const id = await buscarPictograma(texto);
    if (id) setPictogramId(id);
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    setShowPicker(false);
  };

  // ── Cambiar hora de una tarea existente ───────────────────────────────────
  const handleTaskTimeChange = (event: any, date?: Date) => {
    setShowTaskPicker(false);
    if (!date || !selectedTask) return;
    const nuevaHora = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Actualizar en BD
    if (Platform.OS !== 'web') updateTareaHora(selectedTask.id, nuevaHora);
    // Actualizar estado local
    setTasks(prev => prev.map(t =>
      t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t
    ));
    setSelectedTask((prev: any) => ({ ...prev, hora: nuevaHora }));
  };

  // ── Fecha formateada ──────────────────────────────────────────────────────
  const today      = FECHA_SIMULADA ? new Date(FECHA_SIMULADA) : new Date();
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const formattedToday = `${capitalize(today.toLocaleDateString('es-ES', { weekday: 'long' }))}, ${today.getDate()} de ${capitalize(today.toLocaleDateString('es-ES', { month: 'long' }))} de ${today.getFullYear()}`;

  // ── Completar tarea ───────────────────────────────────────────────────────
  const handleTareaCompletada = async (task: any) => {
    const tieneHora = task.hora && task.hora !== 'Sin hora';
    const deadline  = parseTiempoLim(task.hora);
    const enTiempo  = tieneHora ? (deadline ? Date.now() <= deadline.getTime() : false) : true;
    const pts       = tieneHora ? (enTiempo ? 5 : 3) : 5;

    updateTareaCompletada(task.id, true, pts);

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, completed: true, stars: pts } : t
    ));

    saltadasRef.current = 0;

    const prevMedal    = gami.medalla;
    // Tareas pendientes ANTES de completar esta (sin contar la actual)
    const pendingAntes = tasks.filter(t => !t.completed && t.id !== task.id);
    const newTodayDone = gami.tareasCompletasHoy + 1;
    await gami.completarTarea(enTiempo || !tieneHora);

    const newTotal = gami.totalHecho + 1;

    // Prioridad de notificaciones
    if      (newTotal >= 400 && prevMedal !== 'oro')    disparaNotif('oro');
    else if (newTotal >= 200 && prevMedal !== 'plata')  disparaNotif('plata');
    else if (newTotal >= 50  && prevMedal !== 'bronce') disparaNotif('bronce');
    // "Todas completadas" solo si era la ÚLTIMA pendiente
    else if (pendingAntes.length === 0)                 disparaNotif('goalmet');
    else if (!tieneHora)                                disparaNotif('sinHora');
    else if (enTiempo)                                  disparaNotif('ontime');
    else                                                disparaNotif('late');

    setTaskModalVisible(false);
  };

  // ── Eliminar tarea ────────────────────────────────────────────────────────
  // NO hay penalización de estrellas al eliminar manualmente
  // Solo se muestra el perezoso llorando/cansado
 const handleDeleteTask = async (task: any) => {
  if (!task.completed) {
    // Guardar en historial como cancelada (NO borra físicamente)
    cancelarTarea(task.id);
    saltadasRef.current += 1;
    if (saltadasRef.current >= 3) disparaNotif('saltadas');
    else                          disparaNotif('eliminada');
  } else {
    // Ya completada: borrado limpio (ya está en historial)
    deleteTarea(task.id);
  }
  // Quitar del estado local en ambos casos
  setTasks(prev => prev.filter(t => t.id !== task.id));
  setTaskModalVisible(false);
};

  // ── Datos ─────────────────────────────────────────────────────────────────
  const pendingTasks = tasks.filter(t =>
    !t.completed && t.title.toLowerCase().includes(search.toLowerCase())
  );
  const totalToday = tasks.length;
  const doneToday  = tasks.filter(t => t.completed).length;
  const dailyPct   = totalToday > 0 ? Math.min((doneToday / totalToday) * 100, 100) : 0;
  const starsToday = gami.tareasCompletasHoy * 5;

  const nextMedal = (() => {
    if (gami.totalHecho < 50)  return { label: 'Bronce 🥉', req: 50,  color: '#9c9c9c' };
    if (gami.totalHecho < 200) return { label: 'Plata 🥈',  req: 200, color: '#9c9c9c' };
    if (gami.totalHecho < 400) return { label: 'Oro 🥇',    req: 400, color: GOLD      };
    return null;
  })();

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20 }}>
              
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
      <SlothNotif type={notifType} show={showNotif} />

      <View style={{ paddingTop: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: "column", padding: 40, justifyContent: "center", alignItems: "center", gap: 20 }}>
          <View >
            <Text style={styles.title}>Mis Tareas</Text>
            <Text style={styles.dateText}>{formattedToday}</Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Mi Progresos</Text>
              <Text style={styles.progressCount}>
                {doneToday}/{totalToday} tareas · {starsToday} ⭐
              </Text>
            </View>
            <ProgressBar pct={dailyPct} color={dailyPct >= 100 ? PURPLE : PURPLE_LT} />
            
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

        {pendingTasks.length === 0 ? (
          <View style={styles.emptyBox}>
            {totalToday > 0 ? (
              <>
                <Image source={PEREZOSO_IMAGENES.celebrando} style={{ width: 90, height: 90 }} />
                <Text style={styles.emptyText}>¡Todo completado hoy! 🎉</Text>
              </>
            ) : (
              <>
                <Image source={PEREZOSO_IMAGENES.esperando} style={{ width: 90, height: 90 }} />
                <Text style={styles.emptyText}>No tienes tareas para hoy</Text>
                <Text style={styles.emptySubText}>Pulsa + para añadir una tarea</Text>
              </>
            )}
          </View>
        ) : (
          pendingTasks.map(item => {
            const mins    = minutosRestantes(item.hora);
            const vencida = mins !== null && mins < 0;
            const urgente = mins !== null && mins >= 0 && mins <= 10;

            return (
              <Pressable
                key={item.id}
                onPress={() => { setSelectedTask(item); setTaskModalVisible(true); }}
              >
                <View style={[
                  styles.taskRow,
                  vencida && styles.taskRowLate,
                  urgente && styles.taskRowUrgent,
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {item.pictogramId && (
                      <Image
                        source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }}
                        style={styles.pictogram}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                      {urgente && !vencida && (
                        <Text style={{ fontSize: 11, color: ORANGE, fontWeight: '600' }}>
                          ⏰ ¡Quedan {mins} min!
                        </Text>
                      )}
                      {vencida && (
                        <Text style={{ fontSize: 11, color: RED, fontWeight: '600' }}>⚠ Vencida</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={[styles.taskTime, vencida && { color: RED }]}>{item.hora}</Text>
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
        style={{ position: 'absolute', bottom: 30, right: 25, backgroundColor: '#A77BBE', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' }}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </Pressable>

      {/* ══ MODAL: AÑADIR TAREA ══ */}
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
                <DateTimePicker value={tempTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleTimeChange} />
              )}
              {showPicker && Platform.OS === 'web' && (
                <input type="time" onChange={(e) => { setSelectedTime(e.target.value); setShowPicker(false); }} style={{ marginTop: 10, padding: 8, fontSize: 16 }} />
              )}

              {pictogramId && (
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                  <Image source={{ uri: `https://static.arasaac.org/pictograms/${pictogramId}/${pictogramId}_300.png` }} style={{ width: 130, height: 130 }} />
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (titulo.trim()) {
                    const newTask = { id: Date.now().toString(), title: titulo, pictogramId: pictogramId ?? null, hora: selectedTime ?? 'Sin hora', completed: false, stars: 0 };
                    insertTarea(newTask);
                    setTasks(prev => [...prev, newTask]);
                    setTitulo(''); setSelectedTime(null); setPictogramId(null);
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

      {/* ══ MODAL: DETALLE / EDITAR TAREA ══ */}
      <Modal visible={taskModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { alignItems: 'center' }]}>

            <View style={[styles.modalTopBar]}>
              <Pressable onPress={() => setTaskModalVisible(false)}>
                <Ionicons name="close" size={26} color={PURPLE} />
              </Pressable>
              <Text style={styles.modalTopTitle}>{selectedTask?.title}</Text>
  
            </View>

            {selectedTask?.pictogramId ? (
              <Image
                source={{ uri: `https://static.arasaac.org/pictograms/${selectedTask.pictogramId}/${selectedTask.pictogramId}_300.png` }}
                style={styles.detailPicto}
              />
            ) : (
              <View style={styles.detailPictoEmpty}>
                <Ionicons name="document-outline" size={60} color="#CCC" />
              </View>
            )}

            {/* Hora con botón de editar */}
            <Pressable
              onPress={() => {
                if (!selectedTask?.completed) {
                  // Inicializar el picker con la hora actual de la tarea si existe
                  const dl = parseTiempoLim(selectedTask?.hora);
                  setTaskTempTime(dl ?? new Date());
                  setShowTaskPicker(true);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent:'center' ,gap: 6, marginBottom: 12 }}
            >
              <View  style={{ flexDirection: 'row', alignItems: 'center', justifyContent:'center' ,gap: 10, marginBottom: 12 }} >
                 <Text style={styles.detailTime}>
                🕐 {selectedTask?.hora ?? 'Sin hora'}
                </Text>
                {!selectedTask?.completed && (
                  <Ionicons name="pencil" size={20}  color={PURPLE} />
                )}

              </View>
             
            </Pressable>

            {/* DateTimePicker para cambiar hora de la tarea */}
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
                  if (Platform.OS === 'web') {
                    // En web actualizamos localStorage directamente
                    const stored = localStorage.getItem('tareas');
                    if (stored) {
                      const tareas = JSON.parse(stored).map((t: any) =>
                        t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t
                      );
                      localStorage.setItem('tareas', JSON.stringify(tareas));
                    }
                  }
                  setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, hora: nuevaHora } : t));
                  setSelectedTask((prev: any) => ({ ...prev, hora: nuevaHora }));
                }}
                style={{ marginBottom: 12, padding: 8, fontSize: 16, borderRadius: 8, borderColor: PURPLE, borderWidth: 1 }}
              />
            )}

            {selectedTask?.completed ? (
              <View style={styles.detailDoneBox}>
                <StarRow count={selectedTask?.stars ?? 5} size={30} />
                <Text style={{ color: GREEN, fontWeight: '700', marginTop: 8, fontSize: 15 }}>¡Tarea completada!</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignContent: 'center', justifyContent: 'center', gap: 5}}>
                <Pressable onPress={() => handleTareaCompletada(selectedTask)} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Realizada ✓</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteTask(selectedTask)} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Eliminar tarea x</Text>
                </Pressable>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

function parseTiempoLim(hora: string | undefined | null): Date | null {
  if (!hora || hora === 'Sin hora') return null;
  const [h, m] = hora.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  title:    { fontSize: 36, fontWeight: '600', color: PURPLE, textAlign: 'center', marginBottom: 6 },
  dateText: { textAlign: 'center', color: '#888', marginBottom: 20, fontSize: 17 },

  // Notif perezoso
  notif: {
  position: 'absolute',
  transform: [
    { translateX: -100 }, // mitad del ancho aprox
    { translateY: -50 }   // mitad del alto aprox
  ],
  zIndex: 999,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'white',
  borderRadius: 20,
  borderWidth: 2,
  paddingVertical: 10,
  paddingHorizontal: 12,
  shadowColor: '#000',
  shadowOpacity: .15,
  shadowRadius: 14,
  elevation: 14,
},
  notifImg:  { width: 54, height: 54, borderRadius: 12, marginRight: 12 },
  notifText: { fontSize: 14, fontWeight: '700', flex: 1, lineHeight: 20 },

  // Progreso
  progressCard: {
    backgroundColor: PURPLE_BG, borderRadius: 18,  paddingVertical: 12, paddingHorizontal: 10, width: '100%',

    borderWidth: 1.5, borderColor: PURPLE_LT, gap:2,
    shadowColor: PURPLE, shadowOpacity: .08, shadowRadius: 8, elevation: 3,

  },
  progressHeader:  { flexDirection: 'column', justifyContent: 'center',alignItems: 'center', marginBottom: 4,gap: 20, paddingVertical: 12, paddingHorizontal: 40, width: '100%' },
  progressLabel:   { fontSize: 20, fontWeight: '700', color: PURPLE },
  progressCount:   { fontSize: 16, color: '#888' },


  // Búsqueda
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f2f2', borderRadius: 25,
    paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20,
  },

  // Empty state
  emptyBox:    { alignItems: 'center', paddingVertical: 40 },
  emptyText:   { fontSize: 18, color: PURPLE, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  emptySubText:{ fontSize: 14, color: '#AAA', marginTop: 6 },

  // Tareas
  taskRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f3f2f2', padding: 16, borderRadius: 15, marginBottom: 12,
  },
  taskRowLate:   { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC' },
  taskRowUrgent: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFD9A8' },
  pictogram:     { width: 40, height: 40, marginRight: 10, borderRadius: 6 },
  taskTitle:     { fontSize: 17, flex: 1, color: '#333' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#888' },
  taskTime:      { color: '#888', fontSize: 13 },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 25,
    backgroundColor: PURPLE, width: 70, height: 70,
    borderRadius: 35, justifyContent: 'center', alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: .35, shadowRadius: 12, elevation: 8,
  },

  // Modales
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: PURPLE_BG, borderRadius: 22, padding: 20, width: '88%' },
  modalTopBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTopTitle: { fontSize: 20, fontWeight: '600', color: PURPLE, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#DDD',
    borderRadius: 12, paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  timeText: { marginTop: 8, textAlign: 'center', color: '#888', fontSize: 13 },

  btnPrimary:     { backgroundColor: PURPLE_LT, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 16 },
  btnPrimaryText: { fontSize: 20, color: PURPLE, fontWeight: '600' },
  btnDelete:      { padding: 12, borderRadius: 15, alignItems: 'center', marginTop: 6 },
  btnDeleteText:  { fontSize: 15, color: RED },

  detailPicto:      { width: 160, height: 160, marginVertical: 16, borderRadius: 12 },
  detailPictoEmpty: { width: 160, height: 160, marginVertical: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 12 },
  detailTime:       { color: '#888', fontSize: 20 },
  detailDoneBox:    { alignItems: 'center', paddingVertical: 16, width: '100%' },
  starsPreview:     { backgroundColor: '#FFFBEA', borderRadius: 14, padding: 12, marginBottom: 12, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: GOLD },
  starsPreviewText: { fontSize: 15, fontWeight: '700' },
});



