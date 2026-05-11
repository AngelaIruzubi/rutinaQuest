import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AccessibilityInfo,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  Vibration,
  View
} from 'react-native';

import {
  cancelarTarea,
  deleteTarea,
  eliminarTareaYRepetitivas,
  generarTareasRepetitivas,
  getTareasPorFecha,
  initDB,
  insertTarea,
  limpiarTareasViejas,
  updateTareaBaseCompleta,
  updateTareaCompletada,
  updateTareaHora,
  updateTareaTituloPicto,
} from '../../database/database';

import { useAjustesCtx } from '../../context/AjustesContext';
import { useGamificacion } from '../../hooks/useGamificacion';
import { buscarPictogramas } from "../../services/arasaac";

import { ahoraApp, ahoraAppMs, fechaAppDate, hoyAppStr, setFechaSimulada, setHoraSimulada } from '../../utils/fecha';

setFechaSimulada('2026-05-12');
setHoraSimulada(21, 0);

if (Notifications) {
  Notifications.setNotificationHandler({
     handleNotification: async () => ({
    shouldShowBanner: true,   
    shouldShowList: true,     
    shouldPlaySound: true,
    shouldSetBadge: false,
    
     
    }),
  });
}

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const GOLD      = '#FFD700';
const ORANGE    = '#FF6B35';
const RED       = '#FF4444';

const PEREZOSO_IMAGENES: Record<string, any> = {
  pulgar:         require('../../assets/images/perezoso/perezoso_pulgar.png'),
  contento_gif:   require('../../assets/images/perezoso/alegre_noti.gif'),
  llorando:       require('../../assets/images/perezoso/perezoso_llorando.png'),
  celebrando:     require('../../assets/images/perezoso/perezoso_celebrando.png'),
  celebrando_gif: require('../../assets/images/perezoso/contento_noti.gif'),
  llorando_gif:   require('../../assets/images/perezoso/triste_noti.gif'),
  enfadado:       require('../../assets/images/perezoso/perezoso_enfadado.png'),
  enfadado_gif:   require('../../assets/images/perezoso/enfadado_noti.gif'),
  esperando:      require('../../assets/images/perezoso/perezoso_esperando.png'),
  esperando_gif:  require('../../assets/images/perezoso/aburrido_noti.gif'),
  cansado:        require('../../assets/images/perezoso/perezoso_cansado.png'),
  bronce:          require('../../assets/images/medallas/broncebg.png'),
  plata:           require('../../assets/images/medallas/platabg.png'),
  oro:             require('../../assets/images/medallas/orobg.png'),
};

const NOTIF_CFG: Record<string, { asset: string; msg: string; color: string }> = {
  ontime:          { asset: 'contento_gif',   msg: '¡Genial, conseguiste las 5 estrellas!',                    color: PURPLE },
  late:            { asset: 'contento_gif',   msg: '¡Completada un poco tarde! 3 estrellas',                   color: PURPLE },
  sinHora:         { asset: 'contento_gif',   msg: '¡Tarea completada! Conseguiste las 5 estrellas',            color: PURPLE },
  goalmet:         { asset: 'celebrando_gif', msg: '¡Todas las tareas de hoy completadas!',                    color: PURPLE },
  bronce:          { asset: 'bronce',   msg: '¡Medalla de Bronce conseguida!',                           color: '#CD7F32' },
  plata:           { asset: 'plata',   msg: '¡Medalla de Plata conseguida!',                            color: '#C0C0C0' },
  oro:             { asset: 'oro', msg: '¡Medalla de Oro conseguida!',                              color: GOLD },
  saltadas:        { asset: 'enfadado_gif',   msg: 'Has saltado varias tareas',                                color: PURPLE },
  eliminada:       { asset: 'llorando_gif',   msg: 'Has eliminado una tarea',                                  color: PURPLE },
  penal10:         { asset: 'enfadado_gif',   msg: 'Ayer te quedó alguna tarea sin hacer. Menos 10 estrellas', color: RED },
  bajaOroPlata:    { asset: 'llorando_gif',   msg: '¡Has perdido la medalla de Oro! Bajaste a Plata 🥈',       color: '#C0C0C0' },
  bajaPlatabronce: { asset: 'llorando_gif',   msg: '¡Has perdido la medalla de Plata! Bajaste a Bronce 🥉',    color: '#CD7F32' },
};

async function pedirPermisosNotificaciones() {
  if (Platform.OS === 'web') return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') console.warn('Permisos de notificación denegados');
}

async function enviarNotifSistema(titulo: string, cuerpo: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, sound: false },
      trigger: null,
    });
  } catch (e) {
    console.warn('Error al enviar notificación del sistema:', e);
  }
}

function useReduceMotion() {
  const [reducida, setReducida] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducida);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducida);
    return () => sub.remove();
  }, []);
  return reducida;
}

function PerezosoNotif({ type, show }: { type: string; show: boolean }) {
  const reduceMotion = useReduceMotion();
  const slideAnim   = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const cfg = NOTIF_CFG[type] || NOTIF_CFG.ontime;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(reduceMotion ? 0 : 80);
      opacityAnim.setValue(0);
      scaleAnim.setValue(reduceMotion ? 1 : 0.85);
      if (reduceMotion) {
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      } else {
        Animated.parallel([
          Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
        ]).start();
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: reduceMotion ? 0 : 80, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: reduceMotion ? 1 : 0.85, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [show, type]);

  useEffect(() => {
    if (show) AccessibilityInfo.announceForAccessibility(cfg.msg);
  }, [show, type]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent accessibilityViewIsModal={false}>
      {reduceMotion ? (
        <View pointerEvents="none" style={styles.fullNotifOverlay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.fullNotifCard}>
            <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={styles.fullNotifImg} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={[styles.fullNotifText, { color: cfg.color }]}>{cfg.msg}</Text>
          </View>
        </View>
      ) : (
        <Animated.View pointerEvents="none" style={[styles.fullNotifOverlay, { opacity: opacityAnim }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.fullNotifCard, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={styles.fullNotifImg} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={[styles.fullNotifText, { color: cfg.color }]}>{cfg.msg}</Text>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

function RachaNotif({ show, racha }: { show: boolean; racha: number }) {
  const reduceMotion = useReduceMotion();
  const slideAnim   = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const countAnim   = useRef(new Animated.Value(Math.max(0, racha - 1))).current;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(reduceMotion ? 0 : 100);
      opacityAnim.setValue(0);
      scaleAnim.setValue(reduceMotion ? 1 : 0.6);
      countAnim.setValue(Math.max(0, racha - 1));
      if (reduceMotion) {
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => { countAnim.setValue(racha); });
      } else {
        Animated.parallel([
          Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }),
        ]).start(() => {
          Animated.timing(countAnim, { toValue: racha, duration: 600, useNativeDriver: false }).start();
        });
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: reduceMotion ? 0 : 100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim,   { toValue: reduceMotion ? 1 : 0.6, useNativeDriver: true, speed: 14, bounciness: 0 }),
      ]).start();
    }
  }, [show, racha]);

  useEffect(() => {
    if (show) AccessibilityInfo.announceForAccessibility(`¡Racha activa! ${racha} días seguidos`);
  }, [show]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent accessibilityViewIsModal={false}>
      {reduceMotion ? (
        <View pointerEvents="none" style={styles.rachaNotif} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.rachaNotifCard}>
            <Text style={styles.rachaNotifFire}>🔥</Text>
            <View style={styles.rachaNotifTextCol}>
              <Text style={styles.rachaNotifLabel}>¡Racha activa!</Text>
              <Text style={styles.rachaNotifCount}>
                <Text style={styles.rachaNotifNum}>{racha}</Text>
                <Text>{' días seguidos'}</Text>
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Animated.View pointerEvents="none" style={[styles.rachaNotif, { opacity: opacityAnim }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.rachaNotifCard, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Text style={styles.rachaNotifFire}>🔥</Text>
            <View style={styles.rachaNotifTextCol}>
              <Text style={styles.rachaNotifLabel}>¡Racha activa!</Text>
              <AnimatedCounter anim={countAnim} max={racha} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

function AnimatedCounter({ anim, max }: { anim: Animated.Value; max: number }) {
  const [display, setDisplay] = useState(Math.max(0, max - 1));
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return (
    <Text style={styles.rachaNotifCount}>
      <Text style={styles.rachaNotifNum}>{display}</Text>
      <Text>{' días seguidos'}</Text>
    </Text>
  );
}

function StarRow({ count = 0, size = 14 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: GOLD, letterSpacing: 2 }} accessibilityLabel={`${count} de 5 estrellas`}>
      {'★'.repeat(count)}<Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

function minutosRestantes(hora?: string | null): number | null {
  const dl = parseTiempoLim(hora);
  if (!dl) return null;
  return Math.round((dl.getTime() - ahoraAppMs()) / 60000);
}


export default function Home() {
  const { width } = useWindowDimensions();

  const [modalVisible,     setModalVisible]     = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [search,           setSearch]           = useState('');
  const [selectedTask,     setSelectedTask]     = useState<any>(null);

 
  const [editModalVisible,  setEditModalVisible]  = useState(false);
  const [editTitulo,        setEditTitulo]        = useState('');
  const [editPictogramas,   setEditPictogramas]   = useState<number[]>([]);
  const [editPictogramId,   setEditPictogramId]   = useState<number | null>(null);
  const [editHora,          setEditHora]          = useState<string | null>(null);
  const [showEditPicker,    setShowEditPicker]    = useState(false);
  const [editTempTime,      setEditTempTime]      = useState(fechaAppDate());

 
  const [confirmVisible,  setConfirmVisible]  = useState(false);
  const [confirmConfig,   setConfirmConfig]   = useState<{
    titulo: string; mensaje: string;
    opciones: { texto: string; valor: any; destructivo?: boolean }[];
  } | null>(null);
  const confirmResolveRef = useRef<((val: any) => void) | null>(null);

  const mostrarConfirm = (
    titulo: string, mensaje: string,
    opciones: { texto: string; valor: any; destructivo?: boolean }[]
  ) => new Promise<any>(resolve => {
    if (Platform.OS !== 'web') {
   
      Alert.alert(titulo, mensaje, [
        ...opciones.map(op => ({
          text: op.texto,
          style: (op.destructivo ? 'destructive' : op.valor === null ? 'cancel' : 'default') as any,
          onPress: () => resolve(op.valor),
        })),
      ], { cancelable: true, onDismiss: () => resolve(null) });
    } else {
  
      confirmResolveRef.current = resolve;
      setConfirmConfig({ titulo, mensaje, opciones });
      setConfirmVisible(true);
    }
  });
  const [tasks,            setTasks]            = useState<any[]>([]);
  const [showPicker,       setShowPicker]       = useState(false);
  const [selectedTime,     setSelectedTime]     = useState<string | null>(null);
  const [tempTime]                              = useState(fechaAppDate());
  const [titulo,           setTitulo]           = useState('');

 
  const [pictogramas,  setPictogramas]  = useState<number[]>([]);
  const [pictogramId,  setPictogramId]  = useState<number | null>(null);


  const [repeticion, setRepeticion] = useState<'ninguna'|'diaria'|'semanal'>('ninguna');

  const [notifType,        setNotifType]        = useState('ontime');
  const [showNotif,        setShowNotif]        = useState(false);
  const notifTimer       = useRef<any>(null);
  const checkTimer       = useRef<any>(null);
  const saltadasRef      = useRef(0);
  const notifEnviadasHoy = useRef<Set<string>>(new Set());

  const [showRachaNotif, setShowRachaNotif] = useState(false);
  const [rachaNotifVal,  setRachaNotifVal]  = useState(0);
  const rachaNotifTimer  = useRef<any>(null);

  const pendientesPenalRef = useRef<any>({ vencidasAyer: 0 });

  const gami         = useGamificacion();
  const { ajustes }  = useAjustesCtx();
  const reduceMotion = useReduceMotion();


  const yaInicializado = useRef(false);
  const ultimoDiaNotif = useRef(hoyAppStr()); 
  useFocusEffect(
    useCallback(() => {
      const hoyStr = hoyAppStr();

      if (hoyStr !== ultimoDiaNotif.current) {
        ultimoDiaNotif.current = hoyStr;
        notifEnviadasHoy.current = new Set();
      }

      if (!yaInicializado.current) {
        if (Platform.OS !== 'web') initDB();
        generarTareasRepetitivas(); 
        const { tareasHoy, vencidasAyer } = limpiarTareasViejas() as any;
        setTasks(tareasHoy.map((r: any) => ({ ...r, completed: r.completed === 1 })));
        pendientesPenalRef.current = { vencidasAyer };
        yaInicializado.current = true;
      } else {
        const tareasHoy = getTareasPorFecha(hoyAppStr()) as any[];
        setTasks(tareasHoy.map((r: any) => ({ ...r, completed: r.completed === 1 })));
      }
    }, [])
  );

 
  useEffect(() => {
    if (!gami.cargando) {
      gami.forzarEstrellas(295);
    }
  }, [gami.cargando]);


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
      const res = await gami.penalizarFinDia(vencidasAyer) as any;
      if (res?.penalizacion > 0) {
        disparaNotif('penal10');
        const nuevasEstrellas = prevEstrellas - res.penalizacion;
        if (prevEstrellas >= 600 && nuevasEstrellas < 600) setTimeout(() => disparaNotif('bajaOroPlata'), 4000);
        else if (prevEstrellas >= 300 && nuevasEstrellas < 300) setTimeout(() => disparaNotif('bajaPlatabronce'), 4000);
      }
      pendientesPenalRef.current = { vencidasAyer: 0 };
    }, 300);

    return () => clearTimeout(timer);
  }, [gami.cargando, gami.esDiaNuevo, gami.penalizacionAplicada]);


  const ultimoDiaInterval = useRef(hoyAppStr());

  useEffect(() => {
    pedirPermisosNotificaciones();
    checkTimer.current = setInterval(async () => {
      const now     = ahoraApp();
      const hora    = now.getHours();
      const minutos = now.getMinutes();
      const hoy     = hoyAppStr();

    
      if (hoy !== ultimoDiaInterval.current) {
        ultimoDiaInterval.current = hoy;

        generarTareasRepetitivas(); 
        const { tareasHoy, vencidasAyer } = limpiarTareasViejas() as any;
        setTasks(tareasHoy.map((r: any) => ({ ...r, completed: r.completed === 1 })));

 
        notifEnviadasHoy.current = new Set();
        penalizacionDisparadaRef.current = false;


        if (vencidasAyer > 0 && !gami.penalizacionAplicada) {
          const prevEstrellas = gami.estrellas;
          const res = await gami.penalizarFinDia(vencidasAyer) as any;
          if (res?.penalizacion > 0) {
            disparaNotif('penal10');
            const nuevasEstrellas = prevEstrellas - res.penalizacion;
            if (prevEstrellas >= 600 && nuevasEstrellas < 600)
              setTimeout(() => disparaNotif('bajaOroPlata'), 4000);
            else if (prevEstrellas >= 300 && nuevasEstrellas < 300)
              setTimeout(() => disparaNotif('bajaPlatabronce'), 4000);
          }
        }

      
        gami.recargar();
        return;
      }


      const pending = tasks.filter(t => !t.completed && t.fechaDia === hoy);

      for (const t of pending) {
        const mins = minutosRestantes(t.hora);
        if (mins !== null && mins > 0 && mins <= 5) {
          const key = `cincoMin_${t.id}`;
          if (!notifEnviadasHoy.current.has(key)) {
            notifEnviadasHoy.current.add(key);
            enviarNotifSistema('⏰ ¡Quedan 5 minutos!', `La tarea "${t.title}" vence pronto`);
          }
          break;
        }
      }

      if (hora === 12 && minutos === 0 && gami.tareasCompletasHoy === 0 && pending.length > 0 && !notifEnviadasHoy.current.has('mitadDia')) {
        notifEnviadasHoy.current.add('mitadDia');
        enviarNotifSistema('☀️ Es mediodía', 'Aún no has empezado tus tareas de hoy');
      }

      if (hora === 21 && minutos === 0 && pending.length > 0 && !notifEnviadasHoy.current.has('finDia')) {
        notifEnviadasHoy.current.add('finDia');
        enviarNotifSistema('🌙 Se acaba el día', `Quedan ${pending.length} tarea${pending.length > 1 ? 's' : ''} sin completar`);
      }
    }, __DEV__ ? 2000 : 60000);
    return () => clearInterval(checkTimer.current);
  }, [tasks, gami.tareasCompletasHoy, gami.penalizacionAplicada, gami.estrellas]);

  const disparaNotif = (type: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotifType(type); setShowNotif(true);
    notifTimer.current = setTimeout(() => setShowNotif(false), 3500);
  };

  const disparaRachaNotif = (racha: number) => {
    if (rachaNotifTimer.current) clearTimeout(rachaNotifTimer.current);
    setRachaNotifVal(racha); setShowRachaNotif(true);
    rachaNotifTimer.current = setTimeout(() => setShowRachaNotif(false), 3500);
  };

  const disparaRachaDespues = (racha: number, delay = 3200) => {
    setTimeout(() => disparaRachaNotif(racha), delay);
  };


  const buscarImagen = async (texto: string) => {
    setTitulo(texto);
    if (texto.trim().length < 2) {
      setPictogramas([]);
      setPictogramId(null);
      return;
    }
    const ids = await buscarPictogramas(texto, 6);
    if (ids.length > 0) {
      setPictogramas(ids);
      setPictogramId(ids[0]);
    } else {
      setPictogramas([]);
      setPictogramId(null);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
   
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

 

  const today          = ahoraApp();
  const capitalize     = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const formattedToday = `${capitalize(today.toLocaleDateString('es-ES', { weekday: 'long' }))}, ${today.getDate()} de ${capitalize(today.toLocaleDateString('es-ES', { month: 'long' }))} de ${today.getFullYear()}`;

  const handleTareaCompletada = async (task: any) => {
    const tieneHora = task.hora && task.hora !== 'Sin hora';
    const deadline  = parseTiempoLim(task.hora);
    const enTiempo  = tieneHora ? (deadline ? ahoraAppMs() <= deadline.getTime() : false) : true;
    const pts       = tieneHora ? (enTiempo ? 5 : 3) : 5;

    updateTareaCompletada(task.id, true, pts);
    if (ajustes.vibracion && Platform.OS !== 'web') Vibration.vibrate(enTiempo ? [0, 80, 60, 120] : [0, 60]);

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true, stars: pts } : t));
    saltadasRef.current = 0;

    const prevTotal    = gami.totalHecho;
    const hoy          = hoyAppStr();
    const pendingAntes = tasks.filter(t => !t.completed && t.id !== task.id && t.fechaDia === hoy);
    const totalDeHoy   = tasks.filter(t => t.fechaDia === hoy).length;

    const { nuevoEstado } = (await gami.completarTarea(enTiempo || !tieneHora)) as any;
    const newTotal        = nuevoEstado.totalHecho;
    const newRacha        = nuevoEstado.racha;

    const debeMostrarRacha = newRacha >= 1 && !notifEnviadasHoy.current.has('rachaHoy');
    if (debeMostrarRacha) notifEnviadasHoy.current.add('rachaHoy');

    const todasCompletadas = pendingAntes.length === 0 && totalDeHoy > 0;
    let delay = 0;

    if      (newTotal >= 600 && prevTotal < 600) disparaNotif('oro');
    else if (newTotal >= 300 && prevTotal < 300) disparaNotif('plata');
    else if (newTotal >= 100 && prevTotal < 100) disparaNotif('bronce');
    else if (!tieneHora)                         disparaNotif('sinHora');
    else if (enTiempo)                           disparaNotif('ontime');
    else                                         disparaNotif('late');

    delay += 4000; // deja que la notificación de estrellas termine

    if (todasCompletadas) {
      setTimeout(() => disparaNotif('goalmet'), delay);
      delay += 4000;
    }

    if (debeMostrarRacha) {
      setTimeout(() => disparaRachaNotif(newRacha), delay);
    }
        setTaskModalVisible(false);
      };

  // ── Abrir modal de edición ────
  const handleAbrirEdicion = async () => {
    setEditTitulo(selectedTask.title);
    setEditPictogramId(selectedTask.pictogramId ?? null);
    setEditHora(selectedTask.hora !== 'Sin hora' ? selectedTask.hora : null);
    const dl = parseTiempoLim(selectedTask.hora);
    setEditTempTime(dl ?? fechaAppDate());
    setShowEditPicker(false);
    if (selectedTask.title.trim().length >= 2) {
      const ids = await buscarPictogramas(selectedTask.title, 6);
      setEditPictogramas(ids);
    } else {
      setEditPictogramas(selectedTask.pictogramId ? [selectedTask.pictogramId] : []);
    }
    setTaskModalVisible(false);
    setEditModalVisible(true);
  };

  // ── Guardar edición ──
  const handleGuardarEdicion = async () => {
    if (!editTitulo.trim() || !selectedTask) return;
    const horaFinal = editHora ?? 'Sin hora';

    const esInstanciaRepetitiva = !!selectedTask.tareaBaseId && selectedTask.tareaBaseId !== '';
    const esTareaBase = selectedTask.repeticion && selectedTask.repeticion !== 'ninguna' && !esInstanciaRepetitiva;

    if (esInstanciaRepetitiva || esTareaBase) {
      setEditModalVisible(false);
      await new Promise(r => setTimeout(r, 300));
      const opcion = await mostrarConfirm(
        'Editar tarea repetitiva', '¿Qué quieres cambiar?',
        [
          { texto: 'Cancelar', valor: null },
          { texto: 'Solo esta vez', valor: 'esta' },
          { texto: 'Todas las veces', valor: 'todas' },
        ]
      );

      if (!opcion) return;

      if (opcion === 'esta') {
      
        updateTareaTituloPicto(selectedTask.id, editTitulo.trim(), editPictogramId);
        updateTareaHora(selectedTask.id, horaFinal);
        setTasks(prev => prev.map(t =>
          t.id === selectedTask.id
            ? { ...t, title: editTitulo.trim(), pictogramId: editPictogramId, hora: horaFinal }
            : t
        ));

      } else {
     
        const baseId = esInstanciaRepetitiva ? selectedTask.tareaBaseId : selectedTask.id;
        updateTareaBaseCompleta(baseId, editTitulo.trim(), editPictogramId, horaFinal);
    
        setTasks(prev => prev.map(t =>
          (t.id === baseId || t.tareaBaseId === baseId)
            ? { ...t, title: editTitulo.trim(), pictogramId: editPictogramId, hora: horaFinal }
            : t
        ));
      }

    } else {
  
      updateTareaTituloPicto(selectedTask.id, editTitulo.trim(), editPictogramId);
      updateTareaHora(selectedTask.id, horaFinal);
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, title: editTitulo.trim(), pictogramId: editPictogramId, hora: horaFinal }
          : t
      ));
    }

    setSelectedTask((prev: any) => ({ ...prev, title: editTitulo.trim(), pictogramId: editPictogramId, hora: horaFinal }));
    AccessibilityInfo.announceForAccessibility(`Tarea actualizada: ${editTitulo}`);
    setEditModalVisible(false);
  };

  const handleDeleteTask = async (task: any) => {
    const esInstanciaRepetitiva = !!task.tareaBaseId && task.tareaBaseId !== '';
    const esTareaBase = task.repeticion && task.repeticion !== 'ninguna' && !esInstanciaRepetitiva;

    if (esInstanciaRepetitiva || esTareaBase) {
      setTaskModalVisible(false);
      await new Promise(r => setTimeout(r, 300));
      const opcion = await mostrarConfirm(
        'Eliminar tarea repetitiva',
        `"${task.title}" se repite ${task.repeticion === 'diaria' || esTareaBase ? 'cada día' : 'cada semana'}. ¿Qué quieres eliminar?`,
        [
          { texto: 'Cancelar', valor: null },
          { texto: 'Solo esta vez', valor: 'esta' },
          { texto: 'Eliminar todas', valor: 'todas', destructivo: true },
        ]
      );

      if (!opcion) return;

      if (opcion === 'esta') {
        if (!task.completed) {
          cancelarTarea(task.id);
          saltadasRef.current += 1;
          if (saltadasRef.current >= 3) disparaNotif('saltadas');
          else disparaNotif('eliminada');
        } else {
          deleteTarea(task.id);
        }
        setTasks(prev => prev.filter(t => t.id !== task.id));
      } else {
        const baseId = task.tareaBaseId && task.tareaBaseId !== '' ? task.tareaBaseId : task.id;
        const hoyStr = hoyAppStr();

 
        const instanciasEnPantalla = tasks.filter(
          t => t.id === baseId || t.tareaBaseId === baseId
        );
        for (const inst of instanciasEnPantalla) {
          if (!inst.completed && inst.fechaDia <= hoyStr) {
            cancelarTarea(inst.id);
          }
        }

        eliminarTareaYRepetitivas(baseId); 
        setTasks(prev => prev.filter(t => t.id !== baseId && t.tareaBaseId !== baseId));
        disparaNotif('eliminada');
      }

    } else {
      setTaskModalVisible(false);
      await new Promise(r => setTimeout(r, 300));
      const confirmado = await mostrarConfirm(
        'Eliminar tarea',
        `¿Seguro que quieres eliminar "${task.title}"?`,
        [
          { texto: 'Cancelar', valor: false },
          { texto: 'Eliminar', valor: true, destructivo: true },
        ]
      );

      if (!confirmado) return;

      if (!task.completed) {
        cancelarTarea(task.id);
        saltadasRef.current += 1;
        if (saltadasRef.current >= 3) disparaNotif('saltadas');
        else disparaNotif('eliminada');
      } else {
        deleteTarea(task.id);
      }
      setTasks(prev => prev.filter(t => t.id !== task.id));
    }
  };

  const hoy          = hoyAppStr();
  const tareasDeHoy  = tasks.filter(t => t.fechaDia === hoy);
  const totalToday   = tareasDeHoy.length;
  const doneToday    = tareasDeHoy.filter(t => t.completed).length;
  const pendingTasks = tareasDeHoy
    .filter(t => !t.completed && t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const tieneHoraA = a.hora && a.hora !== 'Sin hora';
      const tieneHoraB = b.hora && b.hora !== 'Sin hora';
   
      if (tieneHoraA && tieneHoraB) return a.hora.localeCompare(b.hora);
      if (tieneHoraA) return -1; 
      if (tieneHoraB) return 1;  
      return 0; 
    });


  const cerrarModalAnadir = () => {
    setTitulo('');
    setSelectedTime(null);
    setPictogramId(null);
    setPictogramas([]);
    setRepeticion('ninguna');
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20 }}>

      <PerezosoNotif type={notifType} show={showNotif} />
  
      <RachaNotif show={showRachaNotif && !showNotif} racha={rachaNotifVal} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" accessible={false}>

        {/* ── Cabecera ── */}
        <View style={{ paddingTop: 20, paddingBottom: 20 }} accessible={false}>
  
          <View style={{ flexDirection: 'column', padding: 40, justifyContent: 'center', alignItems: 'center', gap: 20 }}
            accessible accessibilityRole="header" accessibilityLabel={`Mis Tareas. ${formattedToday}`}>
            <View accessible={false}>
              <Text style={styles.title} accessibilityElementsHidden importantForAccessibility="no">Mis Tareas</Text>
              <Text style={styles.dateText} accessibilityElementsHidden importantForAccessibility="no">{formattedToday}</Text>
            </View>
          </View>
        
          <View style={styles.searchBar}  accessibilityLabel="Buscar tarea" accessibilityHint="Escribe para filtrar las tareas de hoy" accessibilityRole="search"  >
            <TextInput
              placeholder="Buscar tarea.."
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, fontSize: 16 }}
              returnKeyType="search"
              accessibilityLabel="Buscar tarea"
              accessibilityHint="Escribe para filtrar las tareas de hoy"
              accessibilityRole="search"
              clearButtonMode="while-editing"
            />
         
            <Ionicons name="search" size={20} color="#999" accessibilityElementsHidden importantForAccessibility="no" />
          </View>
        </View>

  
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyBox} accessible accessibilityLiveRegion="polite">
            {totalToday > 0 && doneToday === totalToday ? (
              <>
                <Image source={PEREZOSO_IMAGENES.celebrando} accessibilityLabel="Perezoso celebrando" accessibilityIgnoresInvertColors />
                <Text style={styles.emptyText}>¡Todo completado hoy!</Text>
              </>
            ) : (
              <>
                <Image source={PEREZOSO_IMAGENES.llorando} accessibilityLabel="Perezoso triste" accessibilityIgnoresInvertColors />
                <Text style={styles.emptyText} accessibilityLabel="No tienes tareas para hoy">No tienes tareas para hoy</Text>
                <Text style={styles.emptySubText} accessibilityLabel="Pulsa + para añadir una tarea">Pulsa + para añadir una tarea</Text>
              </>
            )}
          </View>
        ) : (
          pendingTasks.map(item => {
            const mins      = minutosRestantes(item.hora);
            const vencida   = mins !== null && mins < 0;
            const urgente   = mins !== null && mins >= 0 && mins <= 10;
            const horaLabel = item.hora && item.hora !== 'Sin hora' ? `, hora ${item.hora}` : '';
            const estLabel  = vencida ? ', fuera de hora' : urgente ? `, quedan ${mins} minutos` : '';

            return (
              <Pressable
                key={item.id}
                onPress={() => { setSelectedTask(item); setTaskModalVisible(true); }}
                accessible accessibilityRole="button"
                accessibilityLabel={`${item.title}${horaLabel}${estLabel}`}
                accessibilityHint="Pulsa para ver el detalle de la tarea"
                style={({ pressed }) => [{ opacity: pressed && !reduceMotion ? 0.75 : 1 }]}
              >
                <View style={[styles.taskRow, vencida && styles.taskRowLate, urgente && styles.taskRowUrgent]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {item.pictogramId && (
                      <Image source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }} style={styles.pictogram} accessibilityLabel={`Pictograma de ${item.title}`} accessibilityIgnoresInvertColors />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                      {item.repeticion && item.repeticion !== 'ninguna' && (
                        <Text style={{ fontSize: 10, color: PURPLE, fontWeight: '600' }}>
                          {item.repeticion === 'diaria' ? '📅 Diaria' : '📆 Semanal'}
                        </Text>
                      )}
                      {urgente && !vencida && <Text style={{ fontSize: 11, color: ORANGE, fontWeight: '600' }}>¡Quedan {mins} min!</Text>}
                      {vencida && <Text style={{ fontSize: 11, color: RED, fontWeight: '600' }}>⚠ Fuera de hora</Text>}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={[styles.taskTime, vencida && { color: RED }]} accessibilityElementsHidden importantForAccessibility="no">{item.hora}</Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
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
        style={{ position: 'absolute', bottom: 30, right: 25, backgroundColor: PURPLE, width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' }}
        accessible accessibilityRole="button"
        accessibilityLabel="Añadir nueva tarea"
        accessibilityHint="Abre el formulario para crear una nueva tarea de hoy"
      >
        <Ionicons name="add" size={36} color="#FFF" accessibilityElementsHidden importantForAccessibility="no" />
      </Pressable>

      {/* ── MODAL: AÑADIR TAREA ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrarModalAnadir} accessibilityViewIsModal>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled">

              <View style={styles.modalTopBar}>
                <Pressable onPress={cerrarModalAnadir} accessible accessibilityRole="button" accessibilityLabel="Cerrar" style={{ padding: 8 }}>
                  <Ionicons name="close" size={26} color={PURPLE} />
                </Pressable>
                <Text style={styles.modalTopTitle} accessibilityRole="header">Nueva tarea</Text>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Escribe tu tarea..."
                  value={titulo}
                  onChangeText={buscarImagen}
                  style={{ flex: 1, paddingVertical: 10, fontSize: 16 }}
                  accessibilityLabel="Título de la tarea"
                  accessibilityHint="Escribe el nombre de la tarea. Se buscarán pictogramas automáticamente"
                  returnKeyType="done"
                  clearButtonMode="while-editing"
                  autoFocus
                />
                <Pressable onPress={() => setShowPicker(true)} accessible accessibilityRole="button" accessibilityLabel="Seleccionar hora" accessibilityHint="Abre el selector de hora para esta tarea" style={{ padding: 8 }}>
                  <Ionicons name="calendar-outline" size={22} color={PURPLE} />
                </Pressable>
              </View>

              <Text style={styles.timeText} accessibilityLiveRegion="polite" accessibilityLabel={selectedTime ? `Hora seleccionada: ${selectedTime}` : 'Sin hora seleccionada'}>
                {selectedTime ? `Hora: ${selectedTime}` : 'Sin hora seleccionada'}
              </Text>

              {showPicker && Platform.OS !== 'web' && (
                <View>
                  <DateTimePicker value={tempTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleTimeChange} />
                  {Platform.OS === 'ios' && (
                    <Pressable onPress={() => setShowPicker(false)} style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 6 }} accessible accessibilityRole="button" accessibilityLabel="Confirmar hora">
                      <Text style={{ color: '#A77BBE', fontWeight: '700', fontSize: 15 }}>Listo</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {showPicker && Platform.OS === 'web' && (
                <input type="time" onChange={(e) => { setSelectedTime(e.target.value); setShowPicker(false); }} style={{ marginTop: 10, padding: 8, fontSize: 16 }} />
              )}

              {/* ── Selector de pictogramas ── */}
              {pictogramas.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.pictoLabel}>Elige un pictograma:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                    {pictogramas.map((id, i) => (
                      <Pressable
                        key={id}
                        onPress={() => setPictogramId(id)}
                        style={[
                          styles.pictoOpcion,
                          pictogramId === id && styles.pictoOpcionSelec,
                        ]}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Pictograma opción ${i + 1}`}
                        accessibilityState={{ selected: pictogramId === id }}
                      >
                        <Image
                          source={{ uri: `https://static.arasaac.org/pictograms/${id}/${id}_300.png` }}
                          style={styles.pictoImg}
                          accessibilityIgnoresInvertColors
                        />
                      </Pressable>
                    ))}
                 
                    <Pressable
                      onPress={() => setPictogramId(null)}
                      style={[styles.pictoOpcion, styles.pictoNinguno, pictogramId === null && styles.pictoOpcionSelec]}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel="Sin pictograma"
                      accessibilityState={{ selected: pictogramId === null }}
                    >
                      <Ionicons name="close" size={24} color={pictogramId === null ? PURPLE : '#CCC'} />
                      <Text style={[styles.pictoNingunoTxt, pictogramId === null && { color: PURPLE }]}>Ninguno</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (titulo.trim()) {
                    const newTask = {
                      id: `${hoyAppStr()}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
                      title: titulo, pictogramId: pictogramId ?? null,
                      hora: selectedTime ?? 'Sin hora', completed: false, stars: 0,
                      repeticion,
                    };
                    insertTarea(newTask);
                    setTasks(prev => [...prev, { ...newTask, fechaDia: hoyAppStr() }]);
                    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} añadida`);
                    cerrarModalAnadir();
                  }
                }}
                style={styles.btnPrimary}
                accessible accessibilityRole="button"
                accessibilityLabel="Añadir tarea"
                accessibilityHint={titulo.trim() ? `Guardará la tarea ${titulo}` : 'Escribe un título primero'}
              >
                <Text style={styles.btnPrimaryText}>Añadir ✓</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={taskModalVisible} transparent animationType="slide" onRequestClose={() => setTaskModalVisible(false)} accessibilityViewIsModal>
     
        <Pressable style={styles.overlay} onPress={() => setTaskModalVisible(false)} accessible={false}>
    
          <Pressable style={[styles.modalBox, { alignItems: 'center' }]} onPress={e => e.stopPropagation()} accessible={false} importantForAccessibility="yes">

            <Pressable onPress={() => setTaskModalVisible(false)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 8 }} accessible accessibilityRole="button" accessibilityLabel="Cerrar detalle de tarea">
              <Ionicons name="close" size={26} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
            </Pressable>

            <View style={[styles.modalTopBar, { justifyContent: 'center' }]} accessible={false}>
              <Text style={styles.modalTopTitle} accessibilityRole="header">{selectedTask?.title}</Text>
            </View>

            {selectedTask?.pictogramId ? (
              <Image source={{ uri: `https://static.arasaac.org/pictograms/${selectedTask.pictogramId}/${selectedTask.pictogramId}_300.png` }} style={styles.detailPicto} accessibilityLabel={`Pictograma de ${selectedTask?.title}`} accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.detailPictoEmpty} accessibilityElementsHidden importantForAccessibility="no">
                <Ionicons name="document-outline" size={60} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
              </View>
            )}


            <View style={{ marginBottom: 12, padding: 8 }} accessible accessibilityLabel={selectedTask?.hora && selectedTask.hora !== 'Sin hora' ? `Hora: ${selectedTask.hora}` : 'Sin hora asignada'}>
              <Text style={styles.detailTime} accessibilityElementsHidden importantForAccessibility="no">🕐 {selectedTask?.hora ?? 'Sin hora'}</Text>
            </View>

            {selectedTask?.completed ? (
              <View style={styles.detailDoneBox} accessible accessibilityLabel={`Tarea completada con ${selectedTask?.stars ?? 5} de 5 estrellas`}>
                <StarRow count={selectedTask?.stars ?? 5} size={30} />
                <Text style={{ color: GREEN, fontWeight: '700', marginTop: 8, fontSize: 15 }} accessibilityElementsHidden importantForAccessibility="no">¡Tarea completada!</Text>
              </View>
            ) : (
              <View style={{ width: '100%', gap: 8 }} accessible={false}>
                <Pressable
                  onPress={() => handleTareaCompletada(selectedTask)}
                  style={styles.btnPrimary}
                  accessible accessibilityRole="button"
                  accessibilityLabel={`Marcar como realizada la tarea ${selectedTask?.title}`}
                  accessibilityHint="Marca la tarea como completada y suma estrellas"
                >
                  <Text style={styles.btnPrimaryText} accessibilityElementsHidden importantForAccessibility="no">Realizada ✓</Text>
                </Pressable>
                <Pressable
                  onPress={handleAbrirEdicion}
                  style={[styles.btnPrimary, { backgroundColor: '#E8F4FD' }]}
                  accessible accessibilityRole="button"
                  accessibilityLabel={`Editar la tarea ${selectedTask?.title}`}
                  accessibilityHint="Cambia el nombre o el pictograma de la tarea"
                >
                  <Text style={[styles.btnPrimaryText, { color: '#2980B9' }]} accessibilityElementsHidden importantForAccessibility="no">Editar tarea
                    <Ionicons name="pencil" size={16} color="#2980B9" style={{ marginLeft: 6 }} accessibilityElementsHidden importantForAccessibility="no" />  
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteTask(selectedTask)}
                  style={[styles.btnPrimary, { backgroundColor: '#FDE8E8' }]}
                  accessible accessibilityRole="button"
                  accessibilityLabel={`Eliminar la tarea ${selectedTask?.title}`}
                  accessibilityHint="Elimina la tarea y la mueve al historial como cancelada"
                >
                  <Text style={[styles.btnPrimaryText, { color: RED }]} accessibilityElementsHidden importantForAccessibility="no">Eliminar tarea ✕</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      {/* ── MODAL: EDITAR TAREA ── */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)} accessibilityViewIsModal>
        <View style={styles.overlay} accessible={false}>
          <View style={styles.modalBox} accessible={false} importantForAccessibility="yes">
            <ScrollView keyboardShouldPersistTaps="handled" accessible={false}>

              <View style={styles.modalTopBar} accessible={false}>
                <Pressable onPress={() => setEditModalVisible(false)} accessible accessibilityRole="button" accessibilityLabel="Cerrar edición" style={{ padding: 8 }}>
                  <Ionicons name="close" size={26} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
                </Pressable>
                <Text style={styles.modalTopTitle} accessibilityRole="header">Editar tarea</Text>
              </View>

      
              <View style={styles.inputRow} accessible={false}>
                <TextInput
                  value={editTitulo}
                  onChangeText={async (texto) => {
                    setEditTitulo(texto);
                    if (texto.trim().length >= 2) {
                      const ids = await buscarPictogramas(texto, 6);
                      setEditPictogramas(ids);
                    }
                  }}
                  style={{ flex: 1, paddingVertical: 10, fontSize: 16 }}
                  accessibilityLabel="Título de la tarea"
                  returnKeyType="done"
                  clearButtonMode="while-editing"
                  autoFocus
                />
              </View>

              {/* Selector de pictogramas */}
              {editPictogramas.length > 0 && (
                <View style={{ marginTop: 16 }} accessible={false}>
                  <Text style={styles.pictoLabel} accessibilityRole="header">Elige un pictograma</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }} accessible={false}>
                    {editPictogramas.map((id, i) => (
                      <Pressable
                        key={id}
                        onPress={() => setEditPictogramId(id)}
                        style={[styles.pictoOpcion, editPictogramId === id && styles.pictoOpcionSelec]}
                        accessible accessibilityRole="button"
                        accessibilityLabel={`Pictograma opción ${i + 1}${editPictogramId === id ? ', seleccionado' : ''}`}
                        accessibilityState={{ selected: editPictogramId === id }}
                      >
                        <Image source={{ uri: `https://static.arasaac.org/pictograms/${id}/${id}_300.png` }} style={styles.pictoImg} accessibilityIgnoresInvertColors />
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setEditPictogramId(null)}
                      style={[styles.pictoOpcion, styles.pictoNinguno, editPictogramId === null && styles.pictoOpcionSelec]}
                      accessible accessibilityRole="button"
                      accessibilityLabel={`Sin pictograma${editPictogramId === null ? ', seleccionado' : ''}`}
                      accessibilityState={{ selected: editPictogramId === null }}
                    >
                      <Ionicons name="close" size={24} color={editPictogramId === null ? PURPLE : '#CCC'} accessibilityElementsHidden importantForAccessibility="no" />
                      <Text style={[styles.pictoNingunoTxt, editPictogramId === null && { color: PURPLE }]} accessibilityElementsHidden importantForAccessibility="no">Ninguno</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              {/* ── Hora ── */}
              <Text style={[styles.pictoLabel, { marginTop: 16 }]}>Hora (opcional)</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={editHora ?? ''}
                  onChange={e => setEditHora(e.target.value || null)}
                  style={{ padding: 10, fontSize: 15, borderRadius: 10, marginBottom: 8 }}
                />
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowEditPicker(true)}
                    style={[styles.inputRow, { marginBottom: showEditPicker ? 8 : 16 }]}
                    accessible accessibilityRole="button"
                    accessibilityLabel={editHora ? `Hora: ${editHora}. Pulsa para cambiar` : 'Seleccionar hora, opcional'}
                  >
                    <Ionicons name="time-outline" size={18} color={PURPLE} style={{ marginRight: 8 }} accessibilityElementsHidden importantForAccessibility="no" />
                    <Text style={[styles.inputRow, { color: editHora ? '#333' : '#AAA', flex: 1, borderWidth: 0, paddingVertical: 12 }]} accessibilityElementsHidden importantForAccessibility="no">
                      {editHora ?? 'Sin hora seleccionada'}
                    </Text>
                    {editHora && (
                      <Pressable onPress={() => { setEditHora(null); setShowEditPicker(false); }} accessible accessibilityRole="button" accessibilityLabel="Quitar hora" style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
                      </Pressable>
                    )}
                  </Pressable>
                  {showEditPicker && (
                    <View style={{ marginBottom: 8 }} accessible={false}>
                      <DateTimePicker
                        value={editTempTime}
                        mode="time"
                        is24Hour
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          if (Platform.OS === 'android') setShowEditPicker(false);
                          if (date) {
                            setEditTempTime(date);
                            setEditHora(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                          }
                        }}
                      />
                      {Platform.OS === 'ios' && (
                        <Pressable onPress={() => setShowEditPicker(false)} style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 6 }} accessible accessibilityRole="button" accessibilityLabel="Confirmar hora">
                          <Text style={{ color: PURPLE, fontWeight: '700', fontSize: 15 }}>Listo</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}

              <Pressable
                onPress={handleGuardarEdicion}
                style={[styles.btnPrimary, !editTitulo.trim() && { opacity: 0.4 }]}
                accessible accessibilityRole="button"
                accessibilityLabel={editTitulo.trim() ? `Guardar cambios en ${editTitulo}` : 'Escribe un título primero'}
              >
                <Text style={styles.btnPrimaryText} accessibilityElementsHidden importantForAccessibility="no">Guardar cambios ✓</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
   
      {confirmVisible && confirmConfig && (
        <Modal visible={confirmVisible} transparent animationType="fade" accessibilityViewIsModal>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>{confirmConfig.titulo}</Text>
              <Text style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 }}>{confirmConfig.mensaje}</Text>
              <View style={{ gap: 10 }}>
                {confirmConfig.opciones.map((op, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setConfirmVisible(false);
                      confirmResolveRef.current?.(op.valor);
                    }}
                    style={{
                      paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                      backgroundColor: op.destructivo ? '#FDE8E8' : op.valor === null ? '#f5f5f5' : PURPLE_BG,
                      borderWidth: 1,
                      borderColor: op.destructivo ? '#E4A0A0' : op.valor === null ? '#ddd' : PURPLE_LT,
                    }}
                    accessible accessibilityRole="button" accessibilityLabel={op.texto}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 15, color: op.destructivo ? RED : op.valor === null ? '#888' : PURPLE }}>
                      {op.texto}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  root:     { flex: 1, backgroundColor: '#F9FBF8', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
  title:    { fontSize: 30, fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 6 },
  dateText: { textAlign: 'center', color: '#888', marginBottom: 20, fontSize: 17 },

  fullNotifOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBF8', zIndex: 9999, elevation: 9999 },
  fullNotifCard:    { width: '100%', backgroundColor: '#F9FBF8', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', elevation: 12, flexShrink: 1 },
  fullNotifImg:     { width: '70%', aspectRatio: 1, maxHeight: 280, backgroundColor: '#F9FBF8', marginBottom: 16 },
  fullNotifText:    { fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 32, flexShrink: 1 },

  rachaNotif:        { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(26,26,26,0.96)' },
  rachaNotifCard:    { width: '100%', backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, elevation: 18, flexShrink: 1 },
  rachaNotifFire:    { fontSize: 70, marginBottom: 10 },
  rachaNotifTextCol: { flexDirection: 'column', gap: 2, alignItems: 'center', flexShrink: 1 },
  rachaNotifLabel:   { fontSize: 24, color: '#FFB085', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', flexShrink: 1 },
  rachaNotifCount:   { fontSize: 24, color: '#fff', fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  rachaNotifNum:     { fontSize: 46, color: ORANGE, fontWeight: '800' },

  progressCard:   { backgroundColor: PURPLE_BG, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 10, width: '100%', borderWidth: 1.5, borderColor: PURPLE_LT, gap: 2, shadowColor: PURPLE, shadowOpacity: .08, shadowRadius: 8, elevation: 3 },
  progressHeader: { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: 4, gap: 20, paddingVertical: 12, paddingHorizontal: 40, width: '100%' },
  progressLabel:  { fontSize: 20, fontWeight: '700', color: PURPLE },
  progressCount:  { fontSize: 16, color: '#888' },

  searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20, minHeight: 44 },
  emptyBox:     { alignItems: 'center', paddingVertical: 40, width: '100%', height: 200 },
  emptyText:    { fontSize: 26, color: PURPLE, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  emptySubText: { fontSize: 20, color: '#AAA', marginTop: 6 },

  taskRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f2f2', padding: 16, borderRadius: 15, marginBottom: 12, minHeight: 60 },
  taskRowLate:   { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC' },
  taskRowUrgent: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFD9A8' },
  pictogram:     { width: 40, height: 40, marginRight: 10, borderRadius: 6 },
  taskTitle:     { fontSize: 17, flex: 1, color: '#333' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#888' },
  taskTime:      { color: '#888', fontSize: 13 },

  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center' },
  modalBox:      { backgroundColor: PURPLE_BG, borderRadius: 22, padding: 20, width: '90%' },
  modalTopBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTopTitle: { fontSize: 20, fontWeight: '600', color: PURPLE, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'white', minHeight: 44 },
  timeText:      { marginTop: 8, textAlign: 'center', color: '#888', fontSize: 13 },


  pictoLabel:       { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  pictoOpcion:      { width: 80, height: 80, borderRadius: 14, borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 },
  pictoOpcionSelec: { borderColor: PURPLE, borderWidth: 3, backgroundColor: PURPLE_BG },
  pictoImg:         { width: 68, height: 68, borderRadius: 10 },
  pictoNinguno:     { gap: 2 },
  pictoNingunoTxt:  { fontSize: 10, color: '#CCC', fontWeight: '600' },

  btnPrimary:     { backgroundColor: PURPLE_LT, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 16, minHeight: 44 },
  btnPrimaryText: { fontSize: 20, color: PURPLE, fontWeight: '600' },
  btnDelete:      { padding: 12, borderRadius: 15, alignItems: 'center', marginTop: 6, minHeight: 44 },
  btnDeleteText:  { fontSize: 15, color: RED },

  detailPicto:      { width: 160, height: 160, marginVertical: 16, borderRadius: 12 },
  detailPictoEmpty: { width: 160, height: 160, marginVertical: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 12 },
  detailTime:       { color: '#888', fontSize: 20 },
  detailDoneBox:    { alignItems: 'center', paddingVertical: 16, width: '100%' },
  starsPreview:     { backgroundColor: '#FFFBEA', borderRadius: 14, padding: 12, marginBottom: 12, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: GOLD },
  starsPreviewText: { fontSize: 15, fontWeight: '700' },
});