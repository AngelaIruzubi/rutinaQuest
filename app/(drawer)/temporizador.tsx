import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// ── Tipos ────────────────────────────────────────────────────────────────────

type Modo = 'countdown' | 'cronometro';

type EstadoTimer = 'idle' | 'running' | 'paused' | 'finished';

type ConfigTiempo = {
  horas: number;
  minutos: number;
  segundos: number;
};

// ── Colores ──────────────────────────────────────────────────────────────────

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
  teal:   { bg: '#E1F5EE', text: '#0F6E56', solid: '#0F6E56' },
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

// ── Selector de número (rueda simple con botones) ────────────────────────────

type NumPickerProps = {
  value: number;
  min: number;
  max: number;
  label: string;
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
  label:     { fontSize: 11, color: '#ABABAB', letterSpacing: 0.6, textTransform: 'uppercase' },
  arrow:     { padding: 6 },
  arrowText: { fontSize: 13, color: '#7A7A7A' },
  numBox:    { width: 64, height: 56, backgroundColor: '#F5F4F0', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num:       { fontSize: 26, fontWeight: '600', color: '#1A1A1A' },
});

// ── Modal configurar tiempo ──────────────────────────────────────────────────

type ModalConfigProps = {
  visible: boolean;
  config: ConfigTiempo;
  onConfirm: (c: ConfigTiempo) => void;
  onClose: () => void;
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
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>
          <Text style={m.title}>Configurar tiempo</Text>
          <View style={m.pickers}>
            <NumPicker label="Horas"   value={local.horas}    min={0} max={23} onChange={set('horas')} />
            <Text style={m.sep}>:</Text>
            <NumPicker label="Min"     value={local.minutos}  min={0} max={59} onChange={set('minutos')} />
            <Text style={m.sep}>:</Text>
            <NumPicker label="Seg"     value={local.segundos} min={0} max={59} onChange={set('segundos')} />
          </View>

          {/* Atajos rápidos */}
          <View style={m.shortcuts}>
            {[
              { label: '5 min',  h: 0, min: 5,  s: 0 },
              { label: '25 min', h: 0, min: 25, s: 0 },
              { label: '45 min', h: 0, min: 45, s: 0 },
              { label: '1 h',    h: 1, min: 0,  s: 0 },
            ].map(({ label, h, min, s }) => (
              <TouchableOpacity
                key={label}
                style={[m.chip, local.horas === h && local.minutos === min && local.segundos === s && m.chipActive]}
                onPress={() => setLocal({ horas: h, minutos: min, segundos: s })}
              >
                <Text style={[m.chipText, local.horas === h && local.minutos === min && local.segundos === s && m.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={m.actions}>
            <TouchableOpacity style={m.btnCancel} onPress={onClose}>
              <Text style={m.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.btnConfirm, configToSeg(local) === 0 && m.btnDisabled]}
              onPress={handleConfirm}
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
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  title:         { fontSize: 17, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  pickers:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  sep:           { fontSize: 28, fontWeight: '300', color: '#ABABAB', marginTop: 16 },
  shortcuts:     { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F4F0', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  chipActive:    { backgroundColor: '#EEEDFE', borderColor: '#3C3489' },
  chipText:      { fontSize: 13, color: '#7A7A7A' },
  chipTextActive:{ color: '#3C3489', fontWeight: '500' },
  actions:       { flexDirection: 'row', gap: 10 },
  btnCancel:     { flex: 1, height: 48, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 15, color: '#7A7A7A' },
  btnConfirm:    { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#3C3489', alignItems: 'center', justifyContent: 'center' },
  btnConfirmText:{ fontSize: 15, fontWeight: '600', color: '#FFF' },
  btnDisabled:   { opacity: 0.4 },
});

// ── Componente principal ─────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigTiempo = { horas: 0, minutos: 25, segundos: 0 };

export default function Temporizador() {
  const [modo,          setModo]         = useState<Modo>('countdown');
  const [estado,        setEstado]       = useState<EstadoTimer>('idle');
  const [config,        setConfig]       = useState<ConfigTiempo>(CONFIG_DEFAULT);
  const [tiempoActual,  setTiempoActual] = useState<number>(configToSeg(CONFIG_DEFAULT));
  const [modalVisible,  setModalVisible] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progreso para la barra circular (solo countdown)
  const totalSeg  = configToSeg(config);
  const progreso  = modo === 'countdown' && totalSeg > 0
    ? tiempoActual / totalSeg
    : 0;

  // ── Lógica del tick ────────────────────────────────────────────────────────
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

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (estado === 'finished') return;
    setEstado('running');
  };

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

  // ── Color según estado ─────────────────────────────────────────────────────
  const colorDisplay =
    estado === 'finished' ? C.green.solid :
    estado === 'running'  ? C.accent :
    C.textPrimary;

  // ── Barra circular SVG simplificada (View + border) ───────────────────────
  const radio    = 110;
  const circum   = 2 * Math.PI * radio;
  const offset   = circum * (1 - progreso);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

          <Text style={s.title}>Temporizador</Text>

        {/* Selector de modo */}
        <View style={s.modoWrap}>
          {(['countdown', 'cronometro'] as Modo[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[s.modoBtn, modo === m && s.modoBtnActive]}
              onPress={() => handleModo(m)}
            >
              <Text style={[s.modoBtnText, modo === m && s.modoBtnTextActive]}>
                {m === 'countdown' ? ' Cuenta atrás' : ' Cronómetro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reloj central */}
        <View style={s.clockWrap}>
          {/* Anillo de progreso (solo countdown) */}
          {modo === 'countdown' && (
            <View style={s.ringOuter}>
              <View style={[
                s.ringInner,
                { borderColor: estado === 'finished' ? C.green.solid : estado === 'running' ? C.accent : C.border }
              ]} />
            </View>
          )}

          <View style={s.clockContent}>
            <Text style={[s.timeText, { color: colorDisplay }]}>
              {formatTime(tiempoActual)}
            </Text>
            <Text style={s.estadoLabel}>
              {estado === 'idle'     ? (modo === 'countdown' ? 'Listo' : 'En espera') :
               estado === 'running' ? 'En curso' :
               estado === 'paused'  ? 'Pausado' :
               '¡Tiempo!'}
            </Text>
          </View>
        </View>

        {/* Barra de progreso lineal (countdown) */}
        {modo === 'countdown' && totalSeg > 0 && (
          <View style={s.progressBarWrap}>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, {
                width: `${progreso * 100}%` as any,
                backgroundColor: estado === 'finished' ? C.green.solid : C.accent,
              }]} />
            </View>
            <Text style={s.progressLabel}>
              {Math.round(progreso * 100)}%
            </Text>
          </View>
        )}

        {/* Controles */}
        <View style={s.controls}>
          {/* Reset */}
          <TouchableOpacity style={s.btnSecondary} onPress={handleReset}>
            <Text style={s.btnSecondaryIcon}>↺</Text>
          </TouchableOpacity>

          {/* Play / Pause principal */}
          {estado === 'running' ? (
            <TouchableOpacity style={s.btnPrimary} onPress={handlePause}>
              <Text style={s.btnPrimaryText}>⏸</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btnPrimary, estado === 'finished' && s.btnFinished]}
              onPress={handlePlay}
              disabled={estado === 'finished'}
            >
              <Text style={s.btnPrimaryText}>▶</Text>
            </TouchableOpacity>
          )}

          {/* Config (solo countdown) */}
          {modo === 'countdown' ? (
            <TouchableOpacity style={s.btnSecondary} onPress={() => setModalVisible(true)}>
              <Text style={s.btnSecondaryIcon}>⚙</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.btnSecondaryPlaceholder} />
          )}
        </View>

        {/* Info del tiempo configurado (countdown) */}
        {modo === 'countdown' && (
          <TouchableOpacity style={s.configInfo} onPress={() => setModalVisible(true)}>
            <Text style={s.configInfoText}>
              Tiempo configurado: {config.horas > 0 ? `${config.horas}h ` : ''}
              {config.minutos > 0 ? `${config.minutos}min ` : ''}
              {config.segundos > 0 ? `${config.segundos}seg` : ''}
            </Text>
            <Text style={s.configInfoEdit}>Editar →</Text>
          </TouchableOpacity>
        )}

        

      </ScrollView>

      {/* Modal configuración */}
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

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center' },

  // Selector modo
  modoWrap: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 4,
    marginBottom: 36,
    width: '100%',
  },
   title: {
    fontSize: 30,
    fontWeight: '600',
    color: C.accentText,
    textAlign: 'center',
    marginBottom: 20
  },
  modoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  modoBtnActive: {
    backgroundColor: C.accentBg,
  },
  modoBtnText: {
    fontSize: 14,
    color: C.textMuted,
  },
  modoBtnTextActive: {
    color: C.accentText,
    fontWeight: '600',
  },

  // Reloj
  clockWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  ringOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
  },
  clockContent: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  estadoLabel: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 6,
    letterSpacing: 0.4,
  },

  // Barra progreso
  progressBarWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: C.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },

  // Controles
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  btnPrimary: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFinished: {

    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: 26,
    color: '#FFF',
  },
  btnSecondary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryIcon: {
    fontSize: 20,
    color: C.textMuted,
  },
  btnSecondaryPlaceholder: {
    width: 52,
    height: 52,
  },

  // Info config
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 28,
  },
  configInfoText: {
    fontSize: 13,
    color: C.textMuted,
  },
  configInfoEdit: {
    fontSize: 13,
    color: C.accentText,
    fontWeight: '500',
  },

  // Tarjetas info
  infoGrid: {
    width: '100%',
    gap: 10,
  },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 2,
    flex: 1,
  },
  infoSub: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
    flex: 1,
    flexShrink: 1,
  },
});
