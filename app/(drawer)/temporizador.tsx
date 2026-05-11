import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
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

type Modo        = 'countdown' | 'cronometro';
type EstadoTimer = 'idle' | 'running' | 'paused' | 'finished';
type ConfigTiempo = { horas: number; minutos: number; segundos: number };

const PURPLE = '#A77BBE';
const C = {
  bg:          '#F5F4F0',
  surface:     '#FFFFFF',
  border:      'rgba(0,0,0,0.08)',
  textPrimary: '#1A1A1A',
  textMuted:   '#7A7A7A',
  textHint:    '#ABABAB',
  accent:      '#A77BBE',
  accentBg:    '#EEEDFE',
  accentText:  '#A77BBE',
  green:  { bg: '#EAF3DE', text: '#3B6D11', solid: '#3B6D11' },
  amber:  { bg: '#FAEEDA', text: '#854F0B', solid: '#854F0B' },
  red:    { bg: '#FCEBEB', text: '#A32D2D', solid: '#A32D2D' },
};



async function pedirPermisosNotificacion() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function dispararNotificacionFin() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '¡Tiempo!',
      body: 'El temporizador ha terminado.',
      sound: true,
    },
    trigger: null, 
  });
}

async function cancelarNotificaciones() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}



const pad         = (n: number): string => String(n).padStart(2, '0'); //Añade 0 a la izquierda
const configToSeg = (c: ConfigTiempo): number => c.horas * 3600 + c.minutos * 60 + c.segundos;

const formatTime = (totalSeg: number): string => {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

const formatTimeA11y = (totalSeg: number): string => { //conversión a lenguaje natural para VoiceOver
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const partes: string[] = [];
  if (h > 0) partes.push(`${h} hora${h > 1 ? 's' : ''}`);
  if (m > 0) partes.push(`${m} minuto${m > 1 ? 's' : ''}`);
  if (s > 0 || partes.length === 0) partes.push(`${s} segundo${s !== 1 ? 's' : ''}`);
  return partes.join(' y ');
};


type NumPickerProps = { value: number; min: number; max: number; label: string; onChange: (v: number) => void };

function NumPicker({ value, min, max, label, onChange }: NumPickerProps) {
  const inc = () => onChange(value >= max ? min : value + 1);
  const dec = () => onChange(value <= min ? max : value - 1);

  return (
    <View style={p.wrap} accessible={false}>
      <Text style={p.label} accessibilityElementsHidden importantForAccessibility="no">{label}</Text>
      <TouchableOpacity onPress={inc} style={p.arrow} accessible accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} accessibilityHint={`Valor actual: ${value}`}>
        <Text style={p.arrowText}>▲</Text>
      </TouchableOpacity>
      <View style={p.numBox} accessible accessibilityLabel={`${label}: ${value}`}>
        <Text style={p.num} accessibilityElementsHidden importantForAccessibility="no">{pad(value)}</Text>
      </View>
      <TouchableOpacity onPress={dec} style={p.arrow} accessible accessibilityRole="button" accessibilityLabel={`Reducir ${label}`} accessibilityHint={`Valor actual: ${value}`}>
        <Text style={p.arrowText}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const p = StyleSheet.create({
  wrap:      { alignItems: 'center', gap: 4 },
  label:     { fontSize: 11, color: '#ABABAB', letterSpacing: 0.6, textTransform: 'uppercase' },
  arrow:     { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 13, color: '#7A7A7A' },
  numBox:    { width: 64, height: 56, backgroundColor: '#F5F4F0', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num:       { fontSize: 26, fontWeight: '600', color: '#1A1A1A' },
});


type ModalConfigProps = { visible: boolean; config: ConfigTiempo; onConfirm: (c: ConfigTiempo) => void; onClose: () => void };

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={m.overlay} onPress={onClose} accessible accessibilityRole="button" accessibilityLabel="Cerrar configuración">
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()} accessible={false}>
          <Text style={m.title} accessibilityRole="header">Configurar tiempo</Text>

          <View style={m.pickers} accessible={false}>
            <NumPicker label="Horas" value={local.horas}    min={0} max={23} onChange={set('horas')} />
            <Text style={m.sep} accessibilityElementsHidden importantForAccessibility="no">:</Text>
            <NumPicker label="Min"   value={local.minutos}  min={0} max={59} onChange={set('minutos')} />
            <Text style={m.sep} accessibilityElementsHidden importantForAccessibility="no">:</Text>
            <NumPicker label="Seg"   value={local.segundos} min={0} max={59} onChange={set('segundos')} />
          </View>

          <View style={m.shortcuts} accessible={false}>
            {[
              { label: '5 minutos',  h: 0, min: 5,  s: 0 },
              { label: '25 minutos', h: 0, min: 25, s: 0 },
              { label: '45 minutos', h: 0, min: 45, s: 0 },
              { label: '1 hora',     h: 1, min: 0,  s: 0 },
            ].map(({ label, h, min, s }) => {
              const activo = local.horas === h && local.minutos === min && local.segundos === s;
              return (
                <TouchableOpacity
                  key={label}
                  style={[m.chip, activo && m.chipActive]}
                  onPress={() => setLocal({ horas: h, minutos: min, segundos: s })}
                  accessible accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: activo }}
                >
                  <Text style={[m.chipText, activo && m.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={m.actions} accessible={false}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose} accessible accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={m.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btnConfirm, configToSeg(local) === 0 && m.btnDisabled]}
              onPress={handleConfirm}
              disabled={configToSeg(local) === 0}
              accessible accessibilityRole="button"
              accessibilityLabel="Aplicar tiempo configurado"
              accessibilityState={{ disabled: configToSeg(local) === 0 }}
            >
              <Text style={m.btnConfirmText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  title:          { fontSize: 17, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  pickers:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  sep:            { fontSize: 28, fontWeight: '300', color: '#ABABAB', marginTop: 16 },
  shortcuts:      { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F4F0', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chipActive:     { backgroundColor: '#EEEDFE', borderColor: PURPLE },
  chipText:       { fontSize: 13, color: '#7A7A7A' },
  chipTextActive: { color:PURPLE, fontWeight: '500' },
  actions:        { flexDirection: 'row', gap: 10 },
  btnCancel:      { flex: 1, height: 48, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  btnCancelText:  { fontSize: 15, color: '#7A7A7A' },
  btnConfirm:     { flex: 1, height: 48, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  btnDisabled:    { opacity: 0.4 },
});

// ─── Componente principal ─────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigTiempo = { horas: 0, minutos: 5, segundos: 0 };

export default function Temporizador() {
  const [modo,         setModo]         = useState<Modo>('countdown');
  const [estado,       setEstado]       = useState<EstadoTimer>('idle');
  const [config,       setConfig]       = useState<ConfigTiempo>(CONFIG_DEFAULT);
  const [tiempoActual, setTiempoActual] = useState<number>(configToSeg(CONFIG_DEFAULT));
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeg = configToSeg(config);
  const progreso = modo === 'countdown' && totalSeg > 0 ? tiempoActual / totalSeg : 0;

  useEffect(() => {
    if (Platform.OS !== 'web') pedirPermisosNotificacion();
  }, []);

  const tick = useCallback(() => {
    setTiempoActual(prev => {
      if (modo === 'countdown') {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setEstado('finished');
          if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 400, 200, 400]);
            dispararNotificacionFin(); // notificación inmediata al llegar a 0
          }
          AccessibilityInfo.announceForAccessibility('¡Tiempo terminado!');
          return 0;
        }
        return prev - 1;
      } else {
        return prev + 1;
      }
    });
  }, [modo]);

  useEffect(() => {
    if (estado === 'running') {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [estado, tick]);

  const handlePlay = () => {
    if (estado === 'finished') return;
    if (Platform.OS !== 'web') cancelarNotificaciones();
    setEstado('running');
    AccessibilityInfo.announceForAccessibility(
      modo === 'countdown'
        ? `Cuenta atrás iniciada: ${formatTimeA11y(tiempoActual)}`
        : 'Cronómetro iniciado'
    );
  };

  const handlePause = () => {
    setEstado('paused');
    if (Platform.OS !== 'web') cancelarNotificaciones();
    AccessibilityInfo.announceForAccessibility('Temporizador pausado');
  };

  const handleReset = () => {
    setEstado('idle');
    if (Platform.OS !== 'web') cancelarNotificaciones();
    setTiempoActual(modo === 'countdown' ? configToSeg(config) : 0);
    AccessibilityInfo.announceForAccessibility('Temporizador reiniciado');
  };

  const handleModo = (nuevo: Modo) => {
    if (Platform.OS !== 'web') cancelarNotificaciones();
    setModo(nuevo);
    setEstado('idle');
    setTiempoActual(nuevo === 'countdown' ? configToSeg(config) : 0);
  };

  const handleConfig = (nueva: ConfigTiempo) => {
    if (Platform.OS !== 'web') cancelarNotificaciones();
    setConfig(nueva);
    setEstado('idle');
    setTiempoActual(configToSeg(nueva));
    setModalVisible(false);
    AccessibilityInfo.announceForAccessibility(`Tiempo configurado: ${formatTimeA11y(configToSeg(nueva))}`);
  };

  const colorDisplay =
    estado === 'finished' ? C.green.solid :
    estado === 'running'  ? C.accent :
    C.textPrimary;

  const estadoLabel =
    estado === 'idle'    ? (modo === 'countdown' ? 'Listo' : 'En espera') :
    estado === 'running' ? 'En curso' :
    estado === 'paused'  ? 'Pausado' :
    '¡Tiempo!';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} accessible={false}>

        <Text style={s.title} accessibilityRole="header">Temporizador</Text>

        <Pressable onPress={() => router.replace('/')} style={s.btnInicio} accessible accessibilityRole="button" accessibilityLabel="Ir a Inicio">
          <Ionicons name="home-outline" size={16} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={s.btnInicioTxt}>Inicio</Text>
        </Pressable>

        {/* Selector de modo */}
        <View style={s.modoWrap} accessible={false}>
          {(['countdown', 'cronometro'] as Modo[]).map(md => (
            <TouchableOpacity
              key={md}
              style={[s.modoBtn, modo === md && s.modoBtnActive]}
              onPress={() => handleModo(md)}
              accessible accessibilityRole="button"
              accessibilityLabel={md === 'countdown' ? 'Cuenta atrás' : 'Cronómetro'}
              accessibilityState={{ selected: modo === md }}
            >
              <Text style={[s.modoBtnText, modo === md && s.modoBtnTextActive]}>
                {md === 'countdown' ? 'Cuenta atrás' : 'Cronómetro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reloj central */}
        <View style={s.clockWrap} accessible accessibilityLabel={`${formatTimeA11y(tiempoActual)}. ${estadoLabel}`} accessibilityLiveRegion="none">
          {modo === 'countdown' && (
            <View style={s.ringOuter} accessibilityElementsHidden importantForAccessibility="no">
              <View style={[s.ringInner, { borderColor: estado === 'finished' ? C.green.solid : estado === 'running' ? C.accent : C.border }]} />
            </View>
          )}
          <View style={s.clockContent}>
            <Text style={[s.timeText, { color: colorDisplay }]} accessibilityElementsHidden importantForAccessibility="no">
              {formatTime(tiempoActual)}
            </Text>
            <Text style={s.estadoLabel} accessibilityElementsHidden importantForAccessibility="no">
              {estadoLabel}
            </Text>
          </View>
        </View>

        {modo === 'countdown' && totalSeg > 0 && (
          <View style={s.progressBarWrap} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progreso * 100) }} accessibilityLabel={`Progreso: ${Math.round(progreso * 100)} por ciento`}>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${progreso * 100}%` as any, backgroundColor: estado === 'finished' ? C.green.solid : C.accent }]} />
            </View>
            <Text style={s.progressLabel} accessibilityElementsHidden importantForAccessibility="no">
              {Math.round(progreso * 100)}%
            </Text>
          </View>
        )}

        {/* Controles */}
        <View style={s.controls} accessible={false}>
          <TouchableOpacity style={s.btnSecondary} onPress={handleReset} accessible accessibilityRole="button" accessibilityLabel="Reiniciar">
            <Ionicons name="refresh" size={24} color={C.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
          </TouchableOpacity>

          {estado === 'running' ? (
            <TouchableOpacity style={s.btnPrimary} onPress={handlePause} accessible accessibilityRole="button" accessibilityLabel="Pausar">
              <Ionicons name="pause" size={32} color="#FFF" accessibilityElementsHidden importantForAccessibility="no" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btnPrimary, estado === 'finished' && s.btnFinished]}
              onPress={handlePlay}
              disabled={estado === 'finished'}
              accessible accessibilityRole="button"
              accessibilityLabel={estado === 'paused' ? 'Reanudar' : 'Iniciar'}
              accessibilityState={{ disabled: estado === 'finished' }}
            >
              <Ionicons name="play" size={32} color="#FFF" accessibilityElementsHidden importantForAccessibility="no" />
            </TouchableOpacity>
          )}

          {modo === 'countdown' ? (
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalVisible(true)} accessible accessibilityRole="button" accessibilityLabel="Configurar tiempo">
              <Ionicons name="settings-outline" size={22} color={C.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
            </TouchableOpacity>
          ) : (
            <View style={s.btnSecondaryPlaceholder} accessibilityElementsHidden importantForAccessibility="no" />
          )}
        </View>

        {modo === 'countdown' && (
          <TouchableOpacity style={s.configInfo} onPress={() => setModalVisible(true)} accessible accessibilityRole="button" accessibilityLabel={`Tiempo configurado: ${formatTimeA11y(totalSeg)}. Pulsa para editar`}>
            <Text style={s.configInfoText} accessibilityElementsHidden importantForAccessibility="no">
              Tiempo configurado: {config.horas > 0 ? `${config.horas}h ` : ''}
              {config.minutos > 0 ? `${config.minutos}min ` : ''}
              {config.segundos > 0 ? `${config.segundos}seg` : ''}
            </Text>
            <Text style={s.configInfoEdit} accessibilityElementsHidden importantForAccessibility="no">Editar →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <ModalConfig visible={modalVisible} config={config} onConfirm={handleConfig} onClose={() => setModalVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center' },

  title: { fontSize: 30, fontWeight: '800', color: C.accentText, textAlign: 'center', marginBottom: 20 },

  btnInicio:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: PURPLE + '18', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8, minHeight: 44 },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: 13 },

  modoWrap:          { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, padding: 4, marginBottom: 36, width: '100%' },
  modoBtn:           { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  modoBtnActive:     { backgroundColor: C.accentBg },
  modoBtnText:       { fontSize: 14, color: C.textMuted },
  modoBtnTextActive: { color: C.accentText, fontWeight: '600' },

  clockWrap:    { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ringOuter:    { position: 'absolute', width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center' },
  ringInner:    { width: 220, height: 220, borderRadius: 110, borderWidth: 3 },
  clockContent: { alignItems: 'center' },
  timeText:     { fontSize: 52, fontWeight: '300', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  estadoLabel:  { fontSize: 13, color: C.textMuted, marginTop: 6, letterSpacing: 0.4 },

  progressBarWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  progressBarBg:   { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressLabel:   { fontSize: 12, color: C.textMuted, minWidth: 32, textAlign: 'right' },

  controls:               { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  btnPrimary:             { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  btnFinished:            { opacity: 0.5 },
  btnPrimaryText:         { fontSize: 26, color: '#FFF' },
  btnSecondary:           { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryIcon:       { fontSize: 20, color: C.textMuted },
  btnSecondaryPlaceholder:{ width: 52, height: 52 },

  configInfo:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.surface, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, marginBottom: 28, minHeight: 44 },
  configInfoText: { fontSize: 13, color: C.textMuted },
  configInfoEdit: { fontSize: 13, color: C.accentText, fontWeight: '500' },

  infoGrid:  { width: '100%', gap: 10 },
  infoCard:  { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon:  { fontSize: 20, marginTop: 1 },
  infoTitle: { fontSize: 14, fontWeight: '500', color: C.textPrimary, marginBottom: 2, flex: 1 },
  infoSub:   { fontSize: 12, color: C.textMuted, lineHeight: 17, flex: 1, flexShrink: 1 },
});
