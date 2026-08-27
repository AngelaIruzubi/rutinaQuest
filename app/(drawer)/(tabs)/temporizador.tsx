import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppFonts, Colors } from '../../../constants/theme';
import { useAjustesCtx } from '../../../context/AjustesContext';
import { useTemporizadorTarea } from '../../../context/TemporizadorContext';

// ── Tipos ────────────────────────────────────────────────────────────────────

type Modo        = 'countdown' | 'cronometro';
type EstadoTimer = 'idle' | 'running' | 'paused' | 'finished';

type ConfigTiempo = {
  horas:    number;
  minutos:  number;
  segundos: number;
};

// ── Colores ──────────────────────────────────────────────────────────────────
// Colors.purple, Colors.purpleLt vienen de theme.ts
// Los colores semánticos del temporizador (green/amber/red) son propios de esta pantalla

const C = {
  bg:          '#FBF6F0',
  surface:     '#FFFFFF',
  border:      'rgba(0,0,0,0.08)',
  textPrimary: '#1A1A1A',
  textMuted:   '#7A7A7A',
  textHint:    '#ABABAB',
  green: { bg: '#EAF3DE', text: '#3B6D11', solid: '#3B6D11' },
  amber: { bg: '#FAEEDA', text: '#854F0B', solid: '#854F0B' },
  red:   { bg: '#FCEBEB', text: '#A32D2D', solid: '#A32D2D' },
  teal:  { bg: '#E1F5EE', text: '#0F6E56', solid: '#0F6E56' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number): string => String(n).padStart(2, '0');

const formatTime = (totalSeg: number): string => {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

const configToSeg = (c: ConfigTiempo): number =>
  c.horas * 3600 + c.minutos * 60 + c.segundos;

// ── Arrastrar el anillo para ajustar el tiempo, tipo ruleta ─────────────────
// A diferencia de un selector normal, esto es un ajuste RELATIVO: mientras
// arrastras (incluso con el temporizador en marcha) cada vuelta completa
// suma o resta un minuto respecto al valor actual, en vez de saltar a una
// posición absoluta — así se puede afinar el tiempo dentro del propio
// minuto sin tener que parar la cuenta atrás.
const SEG_POR_VUELTA = 60;

function useArrastreAnillo(
  activo: boolean,
  onDelta: (deltaSeg: number) => void,
  onSoltar?: () => void,
  onAgarrar?: () => void,
) {
  const ref = useRef<View>(null);
  const centro = useRef({ x: 0, y: 0 });
  const anguloAnterior = useRef(0);
  const acumulado = useRef(0);
  const activoRef = useRef(activo);
  const onDeltaRef = useRef(onDelta);
  const onSoltarRef = useRef(onSoltar);
  const onAgarrarRef = useRef(onAgarrar);
  useEffect(() => {
    activoRef.current = activo;
    onDeltaRef.current = onDelta;
    onSoltarRef.current = onSoltar;
    onAgarrarRef.current = onAgarrar;
  });

  const calcularAngulo = (pageX: number, pageY: number) =>
    Math.atan2(pageY - centro.current.y, pageX - centro.current.x);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activoRef.current,
      onMoveShouldSetPanResponder: () => activoRef.current,
      // El ScrollView que envuelve el reloj puede quedarse con el gesto a
      // nivel nativo en cuanto detecta el más mínimo movimiento vertical —
      // pedirlo en fase de "capture" ayuda, pero no basta del todo (sobre
      // todo en iOS), así que además se desactiva el scroll del todo
      // mientras se toca el anillo (ver onAgarrar/onSoltar más abajo).
      onStartShouldSetPanResponderCapture: () => activoRef.current,
      onMoveShouldSetPanResponderCapture: () => activoRef.current,
      onPanResponderGrant: (evt) => {
        if (!activoRef.current) return;
        onAgarrarRef.current?.();
        acumulado.current = 0;
        const { pageX, pageY } = evt.nativeEvent;
        ref.current?.measureInWindow((x, y, w, h) => {
          centro.current = { x: x + w / 2, y: y + h / 2 };
          anguloAnterior.current = calcularAngulo(pageX, pageY);
        });
      },
      onPanResponderMove: (evt) => {
        if (!activoRef.current) return;
        const { pageX, pageY } = evt.nativeEvent;
        const actual = calcularAngulo(pageX, pageY);
        let delta = actual - anguloAnterior.current;
        // Evita un salto grande cuando el dedo cruza el límite -180°/180°
        // (la parte de abajo del círculo).
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        anguloAnterior.current = actual;

        acumulado.current += (delta / (Math.PI * 2)) * SEG_POR_VUELTA;
        const entero = Math.trunc(acumulado.current);
        if (entero !== 0) {
          acumulado.current -= entero;
          onDeltaRef.current(entero);
        }
      },
      onPanResponderRelease: () => onSoltarRef.current?.(),
      onPanResponderTerminate: () => onSoltarRef.current?.(),
    }),
  ).current;

  return { ref, panHandlers: responder.panHandlers };
}

// ── Selector de número ───────────────────────────────────────────────────────

type NumPickerProps = {
  value:    number;
  min:      number;
  max:      number;
  label:    string;
  onChange: (v: number) => void;
};

function NumPicker({ value, min, max, label, onChange }: NumPickerProps) {
  const inc = () => onChange(value >= max ? min : value + 1);
  const dec = () => onChange(value <= min ? max : value - 1);

  return (
    <View style={p.wrap}>
      <Text allowFontScaling={false} style={p.label}>{label}</Text>
      <TouchableOpacity onPress={inc} style={p.arrow}>
        <Text allowFontScaling={false} style={p.arrowText}>▲</Text>
      </TouchableOpacity>
      <View style={p.numBox}>
        <Text maxFontSizeMultiplier={1} style={p.num}>{pad(value)}</Text>
      </View>
      <TouchableOpacity onPress={dec} style={p.arrow}>
        <Text allowFontScaling={false} style={p.arrowText}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const p = StyleSheet.create({
  wrap:      { alignItems: 'center', gap: 4 },
  label:     { fontSize: 11, color: C.textHint, fontFamily: AppFonts.bodyBold, letterSpacing: 0.6, textTransform: 'uppercase' },
  arrow:     { padding: 6 },
  arrowText: { fontSize: 13, color: C.textMuted },
  numBox:    { width: 64, height: 56, backgroundColor: C.bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  num:       { fontSize: 26, fontFamily: AppFonts.displayBold, color: C.textPrimary },
});

// ── Anillo de progreso circular ──────────────────────────────────────────────

type ProgressRingProps = {
  size:        number;
  strokeWidth: number;
  progreso:    number; // 0 a 1
  color:       string;
  bgColor:     string;
};

function ProgressRing({ size, strokeWidth, progreso, color, bgColor }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progresoClamp = Math.max(0, Math.min(1, progreso));
  const dashoffset = circumference * (1 - progresoClamp);

  // Bola en el extremo del arco — sin ella, arrastrar "a ciegas" (sin ver
  // qué punto exacto se está moviendo) es lo que hacía que el gesto se
  // sintiera a trompicones. Se calcula en coordenadas normales de pantalla
  // (0 = arriba, avanza en sentido horario), que es justo cómo se ve ya el
  // anillo gracias al rotate:-90deg del Svg.
  const anguloBola = progresoClamp * Math.PI * 2;
  const bolaSize = strokeWidth + 14;
  const bolaX = size / 2 + radius * Math.sin(anguloBola) - bolaSize / 2;
  const bolaY = size / 2 - radius * Math.cos(anguloBola) - bolaSize / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={bgColor} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: bolaX,
          top: bolaY,
          width: bolaSize,
          height: bolaSize,
          borderRadius: bolaSize / 2,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      />
    </View>
  );
}

// ── Modal configurar tiempo ──────────────────────────────────────────────────

type ModalConfigProps = {
  visible:   boolean;
  config:    ConfigTiempo;
  onConfirm: (c: ConfigTiempo) => void;
  onClose:   () => void;
};

function ModalConfig({ visible, config, onConfirm, onClose }: ModalConfigProps) {
  const [local, setLocal] = useState<ConfigTiempo>(config);

  useEffect(() => { if (visible) setLocal(config); }, [visible]);

  const set = (field: keyof ConfigTiempo) => (v: number) =>
    setLocal(prev => ({ ...prev, [field]: v }));

  const handleConfirm = () => {
    if (configToSeg(local) === 0) return;
    onConfirm(local);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose}>
        <Pressable style={modal.sheet} onPress={e => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text  style={modal.title}>Configurar tiempo</Text>
          <View style={modal.pickers}>
            <NumPicker label="Horas"   value={local.horas}    min={0} max={23} onChange={set('horas')} />
            <Text allowFontScaling={false} style={modal.sep}>:</Text>
            <NumPicker label="Min"     value={local.minutos}  min={0} max={59} onChange={set('minutos')} />
            <Text allowFontScaling={false} style={modal.sep}>:</Text>
            <NumPicker label="Seg"     value={local.segundos} min={0} max={59} onChange={set('segundos')} />
          </View>

          {/* Atajos rápidos */}
          <View style={modal.shortcuts}>
            {[
              { label: '5 min',  h: 0, min: 5,  s: 0 },
              { label: '25 min', h: 0, min: 25, s: 0 },
              { label: '45 min', h: 0, min: 45, s: 0 },
              { label: '1 h',    h: 1, min: 0,  s: 0 },
            ].map(({ label, h, min, s }) => (
              <TouchableOpacity
                key={label}
                style={[
                  modal.chip,
                  local.horas === h && local.minutos === min && local.segundos === s && modal.chipActive,
                ]}
                onPress={() => setLocal({ horas: h, minutos: min, segundos: s })}
              >
                <Text style={[
                  modal.chipText,
                  local.horas === h && local.minutos === min && local.segundos === s && modal.chipTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modal.actions}>
            <TouchableOpacity style={modal.btnCancel} onPress={onClose}>
              <Text allowFontScaling={false} style={modal.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnConfirm, configToSeg(local) === 0 && modal.btnDisabled]}
              onPress={handleConfirm}
            >
              <Text allowFontScaling={false} style={modal.btnConfirmText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '85%' },
  title:          { fontSize: 18, fontFamily: AppFonts.displayBold, color: C.textPrimary, textAlign: 'center', marginBottom: 24 },
  pickers:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  sep:            { fontSize: 28, fontWeight: '300', color: C.textHint, marginTop: 16 },
  shortcuts:      { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  chipActive:     { backgroundColor: Colors.purpleLt, borderColor: Colors.purpleDk },
  chipText:       { fontSize: 13, color: C.textMuted, fontFamily: AppFonts.body },
  chipTextActive: { color: Colors.purpleDk, fontFamily: AppFonts.bodyBold },
  actions:        { flexDirection: 'row', gap: 10 },
  btnCancel:      { flex: 1, height: 48, borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  btnCancelText:  { fontSize: 15, color: C.textMuted, fontFamily: AppFonts.bodyBold },
  btnConfirm:     { flex: 1, height: 48, borderRadius: 14, backgroundColor: Colors.purpleDk, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { fontSize: 15, fontFamily: AppFonts.bodyBold, color: Colors.white },
  btnDisabled:    { opacity: 0.4 },
});

// ── Componente principal ─────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigTiempo = { horas: 0, minutos: 25, segundos: 0 };

export default function Temporizador() {
  const router = useRouter();
  const {
    activo: tareaTimer,
    tiempoActualSeg: tareaTiempoActual,
    pausar: pausarTarea,
    reanudar: reanudarTarea,
    resetear: resetearTarea,
    ajustarSeg: ajustarTareaSeg,
    confirmarAjuste: confirmarAjusteTarea,
  } = useTemporizadorTarea();
  const { escala, colores } = useAjustesCtx();
  const ts = useMemo(() => ({
    title: { fontSize: Math.round(30 * escala) },
    estadoLabel: { fontSize: Math.round(13 * escala) },
  }), [escala]);
  const fs = (n: number) => Math.round(n * escala);
  const [modo,         setModo]        = useState<Modo>('countdown');
  const [estado,       setEstado]      = useState<EstadoTimer>('idle');
  const [config,       setConfig]      = useState<ConfigTiempo>(CONFIG_DEFAULT);
  const [tiempoActual, setTiempoActual]= useState<number>(configToSeg(CONFIG_DEFAULT));
  const [modalVisible, setModalVisible]= useState<boolean>(false);
  // Mientras se toca el anillo se desactiva el scroll de la pantalla del
  // todo — de lo contrario, el ScrollView puede quedarse con el gesto a
  // nivel nativo (sobre todo en iOS) y el arrastre deja de notarse.
  const [scrollHabilitado, setScrollHabilitado] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Marca de tiempo absoluta (reloj del sistema), no un contador de "ticks":
  // así, si el intervalo se congela en segundo plano, al volver se recalcula
  // el tiempo real transcurrido en vez de quedarse parado.
  const finAbsolutoRef = useRef<number | null>(null); // countdown: cuándo debe llegar a 0
  const inicioAbsolutoRef = useRef<number | null>(null); // cronómetro: desde cuándo cuenta
  const notifIdRef = useRef<string | null>(null);

  const totalSeg = configToSeg(config);
  const progreso = modo === 'countdown' && totalSeg > 0
    ? tiempoActual / totalSeg
    : 0;

  // Arrastrar el anillo ajusta el tiempo relativo (± segundos), incluso con
  // el temporizador en marcha — solo no tiene sentido cuando ya ha terminado.
  // Nunca puede superar el tiempo configurado (ni bajar de 0): si no, la
  // barra de progreso se pasaba de 100% (p.ej. 137%) al arrastrar de más.
  const ajustarLibre = (deltaSeg: number) => {
    setTiempoActual((prev) => {
      const nuevo = Math.max(0, Math.min(totalSeg, prev + deltaSeg));
      const deltaReal = nuevo - prev;
      if (estado === 'running' && finAbsolutoRef.current != null) {
        finAbsolutoRef.current += deltaReal * 1000;
      }
      return nuevo;
    });
  };
  const confirmarAjusteLibre = async () => {
    if (estado !== 'running' || finAbsolutoRef.current == null) return;
    if (Platform.OS === 'web') return;
    if (notifIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      } catch {}
    }
    try {
      notifIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ ¡Tiempo cumplido!',
          body: 'Tu temporizador ha terminado',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(finAbsolutoRef.current),
        },
      });
    } catch {}
  };
  const arrastreLibre = useArrastreAnillo(
    modo === 'countdown' && estado !== 'finished',
    ajustarLibre,
    () => {
      confirmarAjusteLibre();
      setScrollHabilitado(true);
    },
    () => setScrollHabilitado(false),
  );
  const arrastreTarea = useArrastreAnillo(
    tareaTimer != null && tareaTimer.estado !== 'finished',
    ajustarTareaSeg,
    () => {
      confirmarAjusteTarea();
      setScrollHabilitado(true);
    },
    () => setScrollHabilitado(false),
  );

  const cancelarNotifPendiente = useCallback(async () => {
    if (notifIdRef.current && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      } catch {}
      notifIdRef.current = null;
    }
  }, []);

  // ── Recalcular tiempo a partir del reloj real ──────────────────────────────
  const recomputar = useCallback(() => {
    if (modo === 'countdown') {
      if (finAbsolutoRef.current == null) return;
      const restanteSeg = Math.max(
        0,
        Math.ceil((finAbsolutoRef.current - Date.now()) / 1000),
      );
      setTiempoActual(restanteSeg);
      if (restanteSeg <= 0) {
        setEstado('finished');
        if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
        cancelarNotifPendiente();
      }
    } else {
      if (inicioAbsolutoRef.current == null) return;
      setTiempoActual(
        Math.floor((Date.now() - inicioAbsolutoRef.current) / 1000),
      );
    }
  }, [modo, cancelarNotifPendiente]);

  useEffect(() => {
    if (estado === 'running') {
      intervalRef.current = setInterval(recomputar, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [estado, recomputar]);

  // Al volver a primer plano, recalcular al instante (no esperar al próximo tick)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && estado === 'running') recomputar();
    });
    return () => sub.remove();
  }, [estado, recomputar]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handlePlay = async () => {
    if (estado === 'finished') return;
    if (modo === 'countdown') {
      finAbsolutoRef.current = Date.now() + tiempoActual * 1000;
      if (Platform.OS !== 'web') {
        try {
          notifIdRef.current = await Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ ¡Tiempo cumplido!',
              body: 'Tu temporizador ha terminado',
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(finAbsolutoRef.current),
            },
          });
        } catch {}
      }
    } else {
      inicioAbsolutoRef.current = Date.now() - tiempoActual * 1000;
    }
    setEstado('running');
  };
  const handlePause = () => {
    setEstado('paused');
    cancelarNotifPendiente();
  };
  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEstado('idle');
    setTiempoActual(modo === 'countdown' ? configToSeg(config) : 0);
    finAbsolutoRef.current = null;
    inicioAbsolutoRef.current = null;
    cancelarNotifPendiente();
  };
  const handleModo = (nuevo: Modo) => {
    setModo(nuevo);
    setEstado('idle');
    setTiempoActual(nuevo === 'countdown' ? configToSeg(config) : 0);
    finAbsolutoRef.current = null;
    inicioAbsolutoRef.current = null;
    cancelarNotifPendiente();
  };
  const handleConfig = (nueva: ConfigTiempo) => {
    setConfig(nueva);
    setEstado('idle');
    setTiempoActual(configToSeg(nueva));
    finAbsolutoRef.current = null;
    cancelarNotifPendiente();
    setModalVisible(false);
  };

  // ── Color según estado ────────────────────────────────────────────────────
  const colorDisplay =
    estado === 'finished' ? C.green.solid :
    estado === 'running'  ? Colors.purple :
    C.textPrimary;

  // ── Temporizador vinculado a una tarea (desde el botón ▶ de la lista) ─────
  // Vive en un contexto global (no en este componente) para que siga
  // corriendo aunque el usuario salga de esta pantalla o minimice la app.
  if (tareaTimer) {
    const progresoTarea =
      tareaTimer.duracionTotalSeg > 0
        ? tareaTiempoActual / tareaTimer.duracionTotalSeg
        : 0;
    const terminado = tareaTimer.estado === 'finished';

    return (
      <SafeAreaView style={estilos.safe}>
        <ScrollView
          contentContainerStyle={estilos.container}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollHabilitado}
        >

          <View style={estilos.tareaHeaderRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.purpleDk} />
            <Text style={estilos.tareaHeaderTxt} numberOfLines={2}>{tareaTimer.tareaTitulo}</Text>
          </View>

          <View
            ref={arrastreTarea.ref}
            style={estilos.clockWrap}
            {...arrastreTarea.panHandlers}
          >
            <View style={estilos.ringOuter}>
              <ProgressRing
                size={220}
                strokeWidth={9}
                progreso={progresoTarea}
                color={terminado ? C.green.solid : Colors.purple}
                bgColor={C.border}
              />
            </View>
            <View style={estilos.clockContent}>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={[estilos.timeText, { color: terminado ? C.green.solid : C.textPrimary }]}
              >
                {formatTime(tareaTiempoActual)}
              </Text>
              <Text allowFontScaling={false} style={estilos.estadoLabel}>
                {terminado ? '¡Tiempo!' : tareaTimer.estado === 'running' ? 'En curso' : 'Pausado'}
              </Text>
            </View>
          </View>
          {!terminado && (
            <Text style={[estilos.arrastreHint, { fontSize: fs(13) }]} allowFontScaling={false}>
              Puedes tocar y mover el círculo para cambiar el tiempo
            </Text>
          )}

          {terminado ? (
            <View style={{ width: '100%', alignItems: 'center', gap: 14 }}>
              <Text style={estilos.tareaFinTxt} allowFontScaling={false}>
                Ya puedes volver y marcar la tarea como realizada.
              </Text>
              <Pressable style={estilos.btnVolver} onPress={() => router.back()}>
                <Text allowFontScaling={false} style={estilos.btnVolverTxt}>Volver a mis tareas</Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.controls}>
              <TouchableOpacity style={estilos.btnSecondary} onPress={resetearTarea}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>

              {tareaTimer.estado === 'running' ? (
                <Pressable style={estilos.btnPrimaryWrap} onPress={pausarTarea}>
                  <LinearGradient
                    colors={['#C9A9DB', Colors.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={estilos.btnPrimary}
                  >
                    <Ionicons name="pause" size={30} color={Colors.white} />
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable style={estilos.btnPrimaryWrap} onPress={reanudarTarea}>
                  <LinearGradient
                    colors={['#C9A9DB', Colors.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={estilos.btnPrimary}
                  >
                    <Ionicons name="play" size={30} color={Colors.white} />
                  </LinearGradient>
                </Pressable>
              )}

              <View style={estilos.btnSecondaryPlaceholder} />
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView
        contentContainerStyle={estilos.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollHabilitado}
      >

        <Text style={estilos.title}>Temporizador</Text>

        {/* Selector de modo */}
        <View style={estilos.modoWrap}>
          {(['countdown', 'cronometro'] as Modo[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[estilos.modoBtn, modo === m && estilos.modoBtnActive]}
              onPress={() => handleModo(m)}
            >
              <Text  style={[estilos.modoBtnText, modo === m && estilos.modoBtnTextActive]}>
                {m === 'countdown' ? ' Cuenta atrás' : ' Cronómetro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reloj central */}
        <View
          ref={arrastreLibre.ref}
          style={estilos.clockWrap}
          {...arrastreLibre.panHandlers}
        >
          {modo === 'countdown' && (
            <View style={estilos.ringOuter}>
              <ProgressRing
                size={220}
                strokeWidth={9}
                progreso={progreso}
                color={estado === 'finished' ? C.green.solid : Colors.purple}
                bgColor={C.border}
              />
            </View>
          )}
          <View style={estilos.clockContent}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[estilos.timeText, { color: colorDisplay }]}
            >
              {formatTime(tiempoActual)}
            </Text>
            <Text allowFontScaling={false} style={estilos.estadoLabel}>
              {estado === 'idle'     ? (modo === 'countdown' ? 'Listo' : 'En espera') :
               estado === 'running' ? 'En curso' :
               estado === 'paused'  ? 'Pausado' :
               '¡Tiempo!'}
            </Text>
          </View>
        </View>
        {modo === 'countdown' && estado !== 'finished' && (
          <Text style={[estilos.arrastreHint, { fontSize: fs(13) }]} allowFontScaling={false}>
            Puedes tocar y mover el círculo para cambiar el tiempo
          </Text>
        )}

        {/* Barra de progreso lineal */}
        {modo === 'countdown' && totalSeg > 0 && (
          <View style={estilos.progressBarWrap}>
            <View style={estilos.progressBarBg}>
              {estado === 'finished' ? (
                <View style={[estilos.progressBarFill, {
                  width: `${progreso * 100}%` as any,
                  backgroundColor: C.green.solid,
                }]} />
              ) : (
                <LinearGradient
                  colors={[Colors.purpleLt, Colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[estilos.progressBarFill, { width: `${progreso * 100}%` as any }]}
                />
              )}
            </View>
            <Text allowFontScaling={false} style={estilos.progressLabel}>{Math.round(progreso * 100)}%</Text>
          </View>
        )}

        {/* Controles */}
        <View style={estilos.controls}>
          {/* Reset */}
          <TouchableOpacity style={estilos.btnSecondary} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={22} color={C.textMuted} />
          </TouchableOpacity>

          {/* Play / Pause */}
          {estado === 'running' ? (
            <Pressable style={estilos.btnPrimaryWrap} onPress={handlePause}>
              <LinearGradient
                colors={['#C9A9DB', Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={estilos.btnPrimary}
              >
                <Ionicons name="pause" size={30} color={Colors.white} />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={[estilos.btnPrimaryWrap, estado === 'finished' && estilos.btnFinished]}
              onPress={handlePlay}
              disabled={estado === 'finished'}
            >
              <LinearGradient
                colors={['#C9A9DB', Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={estilos.btnPrimary}
              >
                <Ionicons name="play" size={30} color={Colors.white} />
              </LinearGradient>
            </Pressable>
          )}

          {/* Config (solo countdown) */}
          {modo === 'countdown' ? (
            <Pressable style={estilos.btnSecondary} onPress={() => setModalVisible(true)}>
              <Ionicons name="settings-outline" size={20} color={C.textMuted} />
            </Pressable>
          ) : (
            <View style={estilos.btnSecondaryPlaceholder} />
          )}
        </View>

        {/* Info del tiempo configurado */}
        {modo === 'countdown' && (
          <TouchableOpacity style={estilos.configInfo} onPress={() => setModalVisible(true)}>
            <Text style={estilos.configInfoText} allowFontScaling={false}>
              Tiempo configurado: {config.horas > 0 ? `${config.horas}h ` : ''}
              {config.minutos > 0 ? `${config.minutos}min ` : ''}
              {config.segundos > 0 ? `${config.segundos}seg` : ''}
            </Text>
            <Text style={estilos.configInfoEdit}>Editar →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <ModalConfig
        visible={modalVisible}
        config={config}
        onConfirm={handleConfig}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },

  title: {
    fontSize: 26, fontFamily: AppFonts.displayBold,
    color: '#3A3342',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },

  // Temporizador vinculado a una tarea
  tareaHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'stretch',
    backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border,
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 28,
  },
  tareaHeaderTxt: { flex: 1, fontSize: 16, fontFamily: AppFonts.displayBold, color: '#3A3342' },
  tareaFinTxt: { fontSize: 14, fontFamily: AppFonts.body, color: C.textMuted, textAlign: 'center' },
  btnVolver: {
    backgroundColor: Colors.purpleDk, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  btnVolverTxt: { fontSize: 15, fontFamily: AppFonts.bodyBold, color: Colors.white },

  // Selector modo
  modoWrap: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 16, borderWidth: 0.5, borderColor: C.border,
    padding: 4, marginBottom: 36, width: '100%',
  },
  modoBtn:          { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  modoBtnActive:    { backgroundColor: Colors.purpleLt },
  modoBtnText:      { fontSize: 14, color: C.textMuted, fontFamily: AppFonts.bodyBold },
  modoBtnTextActive:{ color: Colors.purpleDk },

  // Reloj
  clockWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ringOuter: { position: 'absolute', width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center' },
  clockContent:  { alignItems: 'center' },
  arrastreHint: {
    fontSize: 13,
    fontFamily: AppFonts.body,
    color: C.textHint,
    textAlign: 'center',
    marginTop: -18,
    marginBottom: 22,
  },
  timeText:      { fontSize: 52, maxWidth: 190, textAlign: 'center', fontFamily: AppFonts.displaySemibold, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  estadoLabel:   { fontSize: 13, color: Colors.purpleDk, fontFamily: AppFonts.bodyBold, marginTop: 6, letterSpacing: 0.4 },

  // Barra progreso
  progressBarWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  progressBarBg:   { flex: 1, height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 7, borderRadius: 4 },
  progressLabel:   { fontSize: 12, color: C.textMuted, fontFamily: AppFonts.bodyBold, minWidth: 32, textAlign: 'right' },

  // Controles
  controls:               { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  btnPrimaryWrap: {
    width: 76, height: 76, borderRadius: 38,
    shadowColor: Colors.purple, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnPrimary:             { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  btnFinished:            { opacity: 0.5 },
  btnPrimaryText:         { fontSize: 26, color: Colors.white },
  btnSecondary:           { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryIcon:       { fontSize: 20, color: C.textMuted },
  btnSecondaryPlaceholder:{ width: 56, height: 56 },

  // Info config
  configInfo:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, marginBottom: 28 },
  configInfoText: { fontSize: 13, color: C.textMuted, fontFamily: AppFonts.body },
  configInfoEdit: { fontSize: 13, color: Colors.purpleDk, fontFamily: AppFonts.bodyBold },

  // Tarjetas info
  infoGrid:  { width: '100%', gap: 10 },
  infoCard:  { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon:  { fontSize: 20, marginTop: 1 },
  infoTitle: { fontSize: 14, fontFamily: AppFonts.bodyBold, color: C.textPrimary, marginBottom: 2, flex: 1 },
  infoSub:   { fontSize: 12, color: C.textMuted, fontFamily: AppFonts.body, lineHeight: 17, flex: 1, flexShrink: 1 },
});