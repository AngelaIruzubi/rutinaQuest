import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';

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
  bg:          '#F5F4F0',
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
      <Text style={p.label}>{label}</Text>
      <TouchableOpacity onPress={inc} style={p.arrow}>
        <Text style={p.arrowText}>▲</Text>
      </TouchableOpacity>
      <View style={p.numBox}>
        <Text style={p.num}>{pad(value)}</Text>
      </View>
      <TouchableOpacity onPress={dec} style={p.arrow}>
        <Text style={p.arrowText}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const p = StyleSheet.create({
  wrap:      { alignItems: 'center', gap: 4 },
  label:     { fontSize: 11, color: C.textHint, letterSpacing: 0.6, textTransform: 'uppercase' },
  arrow:     { padding: 6 },
  arrowText: { fontSize: 13, color: C.textMuted },
  numBox:    { width: 64, height: 56, backgroundColor: C.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num:       { fontSize: 26, fontWeight: '600', color: C.textPrimary },
});

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
          <Text style={modal.title}>Configurar tiempo</Text>
          <View style={modal.pickers}>
            <NumPicker label="Horas"   value={local.horas}    min={0} max={23} onChange={set('horas')} />
            <Text style={modal.sep}>:</Text>
            <NumPicker label="Min"     value={local.minutos}  min={0} max={59} onChange={set('minutos')} />
            <Text style={modal.sep}>:</Text>
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
              <Text style={modal.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnConfirm, configToSeg(local) === 0 && modal.btnDisabled]}
              onPress={handleConfirm}
            >
              <Text style={modal.btnConfirmText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  title:          { fontSize: 17, fontWeight: '600', color: C.textPrimary, textAlign: 'center', marginBottom: 24 },
  pickers:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  sep:            { fontSize: 28, fontWeight: '300', color: C.textHint, marginTop: 16 },
  shortcuts:      { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  chipActive:     { backgroundColor: Colors.purpleLt, borderColor: Colors.purpleDk },
  chipText:       { fontSize: 13, color: C.textMuted },
  chipTextActive: { color: Colors.purpleDk, fontWeight: '500' },
  actions:        { flexDirection: 'row', gap: 10 },
  btnCancel:      { flex: 1, height: 48, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  btnCancelText:  { fontSize: 15, color: C.textMuted },
  btnConfirm:     { flex: 1, height: 48, borderRadius: 12, backgroundColor: Colors.purpleDk, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  btnDisabled:    { opacity: 0.4 },
});

// ── Componente principal ─────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigTiempo = { horas: 0, minutos: 25, segundos: 0 };

export default function Temporizador() {
  const router = useRouter();
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeg = configToSeg(config);
  const progreso = modo === 'countdown' && totalSeg > 0
    ? tiempoActual / totalSeg
    : 0;

  // ── Tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setTiempoActual(prev => {
      if (modo === 'countdown') {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setEstado('finished');
          if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
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

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handlePlay  = () => { if (estado !== 'finished') setEstado('running'); };
  const handlePause = () => setEstado('paused');
  const handleReset = () => {
    setEstado('idle');
    setTiempoActual(modo === 'countdown' ? configToSeg(config) : 0);
  };
  const handleModo = (nuevo: Modo) => {
    setModo(nuevo);
    setEstado('idle');
    setTiempoActual(nuevo === 'countdown' ? configToSeg(config) : 0);
  };
  const handleConfig = (nueva: ConfigTiempo) => {
    setConfig(nueva);
    setEstado('idle');
    setTiempoActual(configToSeg(nueva));
    setModalVisible(false);
  };

  // ── Color según estado ────────────────────────────────────────────────────
  const colorDisplay =
    estado === 'finished' ? C.green.solid :
    estado === 'running'  ? Colors.purple :
    C.textPrimary;

  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView contentContainerStyle={estilos.container} showsVerticalScrollIndicator={false}>

        <Text style={[estilos.title, ts.title, ts.title]}>Temporizador</Text>

        {/* Botón Inicio */}
        <Pressable
          onPress={() => router.replace('/')}
          style={estilos.btnInicio}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ir a Inicio"
        >
          <Ionicons name="home-outline" size={16} color={Colors.purple} />
          <Text style={estilos.btnInicioTxt}>Inicio</Text>
        </Pressable>

        {/* Selector de modo */}
        <View style={estilos.modoWrap}>
          {(['countdown', 'cronometro'] as Modo[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[estilos.modoBtn, modo === m && estilos.modoBtnActive]}
              onPress={() => handleModo(m)}
            >
              <Text style={[estilos.modoBtnText, modo === m && estilos.modoBtnTextActive]}>
                {m === 'countdown' ? ' Cuenta atrás' : ' Cronómetro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reloj central */}
        <View style={estilos.clockWrap}>
          {modo === 'countdown' && (
            <View style={estilos.ringOuter}>
              <View style={[
                estilos.ringInner,
                { borderColor: estado === 'finished' ? C.green.solid : estado === 'running' ? Colors.purple : C.border },
              ]} />
            </View>
          )}
          <View style={estilos.clockContent}>
            <Text style={[estilos.timeText, { color: colorDisplay }]}>
              {formatTime(tiempoActual)}
            </Text>
            <Text style={[estilos.estadoLabel, ts.estadoLabel, ts.estadoLabel]}>
              {estado === 'idle'     ? (modo === 'countdown' ? 'Listo' : 'En espera') :
               estado === 'running' ? 'En curso' :
               estado === 'paused'  ? 'Pausado' :
               '¡Tiempo!'}
            </Text>
          </View>
        </View>

        {/* Barra de progreso lineal */}
        {modo === 'countdown' && totalSeg > 0 && (
          <View style={estilos.progressBarWrap}>
            <View style={estilos.progressBarBg}>
              <View style={[estilos.progressBarFill, {
                width: `${progreso * 100}%` as any,
                backgroundColor: estado === 'finished' ? C.green.solid : Colors.purple,
              }]} />
            </View>
            <Text style={estilos.progressLabel}>{Math.round(progreso * 100)}%</Text>
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
            <Pressable style={estilos.btnPrimary} onPress={handlePause}>
              <Ionicons name="pause" size={30} color={Colors.white} />
            </Pressable>
          ) : (
            <Pressable
              style={[estilos.btnPrimary, estado === 'finished' && estilos.btnFinished]}
              onPress={handlePlay}
              disabled={estado === 'finished'}
            >
              <Ionicons name="play" size={30} color={Colors.white} />
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
            <Text style={estilos.configInfoText}>
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
    fontSize: 30, fontWeight: '800',
    color: Colors.purple,
    textAlign: 'center', marginBottom: 24,
  },

  // Selector modo
  modoWrap: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    padding: 4, marginBottom: 36, width: '100%',
  },
  modoBtn:          { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  modoBtnActive:    { backgroundColor: Colors.purpleLt },
  modoBtnText:      { fontSize: 14, color: C.textMuted },
  modoBtnTextActive:{ color: Colors.purple, fontWeight: '600' },

  // Reloj
  clockWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ringOuter: { position: 'absolute', width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 220, height: 220, borderRadius: 110, borderWidth: 3 },
  clockContent:  { alignItems: 'center' },
  timeText:      { fontSize: 52, fontWeight: '300', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  estadoLabel:   { fontSize: 13, color: C.textMuted, marginTop: 6, letterSpacing: 0.4 },

  // Barra progreso
  progressBarWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  progressBarBg:   { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressLabel:   { fontSize: 12, color: C.textMuted, minWidth: 32, textAlign: 'right' },

  // Controles
  controls:               { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  btnPrimary:             { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center' },
  btnFinished:            { opacity: 0.5 },
  btnPrimaryText:         { fontSize: 26, color: Colors.white },
  btnSecondary:           { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryIcon:       { fontSize: 20, color: C.textMuted },
  btnSecondaryPlaceholder:{ width: 52, height: 52 },

  // Info config
  configInfo:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.surface, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, marginBottom: 28 },
  configInfoText: { fontSize: 13, color: C.textMuted },
  configInfoEdit: { fontSize: 13, color: Colors.purple, fontWeight: '500' },

  // Botón inicio
  btnInicio:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.purple + '18', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20, minHeight: 44 },
  btnInicioTxt: { color: Colors.purple, fontWeight: '600', fontSize: 13 },

  // Tarjetas info
  infoGrid:  { width: '100%', gap: 10 },
  infoCard:  { backgroundColor: C.surface, borderRadius: 14, borderWidth: 0.5, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon:  { fontSize: 20, marginTop: 1 },
  infoTitle: { fontSize: 14, fontWeight: '500', color: C.textPrimary, marginBottom: 2, flex: 1 },
  infoSub:   { fontSize: 12, color: C.textMuted, lineHeight: 17, flex: 1, flexShrink: 1 },
});