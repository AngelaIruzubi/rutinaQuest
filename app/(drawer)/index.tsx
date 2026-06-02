import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { ModalDetalleTarea } from '../../components/modals/ModalDetalleTarea';
import { ModalNuevaTarea } from '../../components/modals/ModalNuevaTarea';
import { Colors } from '../../constants/theme';
import { useTareasHoy } from '../../hooks/useTareasHoy';
import { Tarea } from '../../types/tarea';
import { capitalize } from '../../utils/fechaFormato';
import { minutosRestantes, parseTiempoLim } from '../../utils/tiempo';

import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View
} from 'react-native';

import {
  cancelarTarea,
  deleteTarea,
  eliminarTareaYRepetitivas,
  generarTareasRepetitivas,
  insertTarea,
  limpiarTareasViejas,
  updateTareaBaseCompleta,
  updateTareaCompletada,
  updateTareaHora,
  updateTareaTituloPicto
} from '../../database/database';

import { PEREZOSO_IMAGENES } from '../../constants/notiConfig';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useGamificacion } from '../../hooks/useGamificacion';

import { ModalConfirm } from '../../components/modals/ModalConfirm';
import { ModalEditarTarea } from '../../components/modals/ModalEditarTarea';
import { PerezosoNotif } from '../../components/notifs/PerezosoNotif';
import { RachaNotif } from '../../components/notifs/RachaNotif';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { ahoraApp, ahoraAppMs, hoyAppStr, setFechaSimulada, setHoraSimulada } from '../../utils/fecha';
import { detectarMedalla } from '../../utils/gamificacion';

if (__DEV__) {
  setFechaSimulada('2026-08-11');
  setHoraSimulada(12, 0);
}

const PURPLE    = Colors.purple;
const ORANGE    = Colors.orange;
const RED       = Colors.red;

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


export default function Home() {

  const [modalVisible,     setModalVisible]     = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);  // ← añadir aquí
  const [search,           setSearch]           = useState('');
  const [selectedTask,     setSelectedTask]     = useState<Tarea | null>(null);
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
  const { tasks, setTasks, cargarTareas } = useTareasHoy()
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

  const today          = ahoraApp();

  const formattedToday = `${capitalize(today.toLocaleDateString('es-ES', { weekday: 'long' }))}, ${today.getDate()} de ${capitalize(today.toLocaleDateString('es-ES', { month: 'long' }))} de ${today.getFullYear()}`;

  const handleTareaCompletada = async (task: Tarea) => {
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
    const medalla = detectarMedalla(prevTotal, newTotal);
    
    if      (medalla)    disparaNotif(medalla);
    else if (!tieneHora) disparaNotif('sinHora');
    else if (enTiempo)   disparaNotif('ontime');
    else                 disparaNotif('late')

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
    const handleAbrirEdicion = () => {
    setTaskModalVisible(false);
    setEditModalVisible(true);
  };

  const handleDeleteTask = async (task: Tarea) => {
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
      <ModalNuevaTarea
        visible={modalVisible}
        onCerrar={() => setModalVisible(false)}
        onGuardar={(tarea) => {
          insertTarea(tarea);
          setTasks(prev => [...prev, { ...tarea, fechaDia: hoyAppStr() } as Tarea]);
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
          onGuardar={(titulo, pictogramId, hora) => {
            if (!selectedTask) return;
            const horaFinal = hora ?? 'Sin hora';
            const esInstanciaRepetitiva = !!selectedTask.tareaBaseId && selectedTask.tareaBaseId !== '';
            const esTareaBase = selectedTask.repeticion && selectedTask.repeticion !== 'ninguna' && !esInstanciaRepetitiva;

            if (esInstanciaRepetitiva || esTareaBase) {
              setEditModalVisible(false);
              setTimeout(async () => {
                const opcion = await mostrarConfirm(
                  'Editar tarea repetitiva', '¿Qué quieres cambiar?',
                  [
                    { texto: 'Cancelar',       valor: null },
                    { texto: 'Solo esta vez',  valor: 'esta' },
                    { texto: 'Todas las veces', valor: 'todas' },
                  ]
                );
                if (!opcion) return;
                if (opcion === 'esta') {
                  updateTareaTituloPicto(selectedTask.id, titulo, pictogramId);
                  updateTareaHora(selectedTask.id, horaFinal);
                  setTasks(prev => prev.map(t =>
                    t.id === selectedTask.id ? { ...t, title: titulo, pictogramId, hora: horaFinal } : t
                  ));
                } else {
                  const baseId = esInstanciaRepetitiva ? selectedTask.tareaBaseId : selectedTask.id;
                  updateTareaBaseCompleta(baseId, titulo, pictogramId, horaFinal);
                  setTasks(prev => prev.map(t =>
                    (t.id === baseId || t.tareaBaseId === baseId)
                      ? { ...t, title: titulo, pictogramId, hora: horaFinal } : t
                  ));
                }
                setSelectedTask(prev => prev ? { ...prev, title: titulo, pictogramId, hora: horaFinal } : prev);
              }, 300);
            } else {
              updateTareaTituloPicto(selectedTask.id, titulo, pictogramId);
              updateTareaHora(selectedTask.id, horaFinal);
              setTasks(prev => prev.map(t =>
                t.id === selectedTask.id ? { ...t, title: titulo, pictogramId, hora: horaFinal } : t
              ));
              setSelectedTask(prev => prev ? { ...prev, title: titulo, pictogramId, hora: horaFinal } : prev);
              setEditModalVisible(false);
            }
          }}
        />
   
      {confirmVisible && confirmConfig && (
        <ModalConfirm
          visible={confirmVisible}
          titulo={confirmConfig.titulo}
          mensaje={confirmConfig.mensaje}
          opciones={confirmConfig.opciones}
          onOpcion={(valor) => {
            setConfirmVisible(false);
            confirmResolveRef.current?.(valor);
          }}
        />
      )}
    </View>
  );
}



const styles = StyleSheet.create({

  title:    { fontSize: 30, fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 6 },
  dateText: { textAlign: 'center', color: '#888', marginBottom: 20, fontSize: 17 },

  searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20, minHeight: 44 },
  emptyBox:     { alignItems: 'center', paddingVertical: 40, width: '100%', height: 200 },
  emptyText:    { fontSize: 26, color: PURPLE, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  emptySubText: { fontSize: 20, color: '#AAA', marginTop: 6 },

  taskRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f2f2', padding: 16, borderRadius: 15, marginBottom: 12, minHeight: 60 },
  taskRowLate:   { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC' },
  taskRowUrgent: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFD9A8' },
  pictogram:     { width: 40, height: 40, marginRight: 10, borderRadius: 6 },
  taskTitle:     { fontSize: 17, flex: 1, color: '#333' },
  taskTime:      { color: '#888', fontSize: 13 },
  
});