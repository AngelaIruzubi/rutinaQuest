// app/(drawer)/testing.tsx
// Panel de testing de gamificación — solo visible en desarrollo (__DEV__)

import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { limpiarTareasViejas, updateUsuario } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';
import {
  avanzarDias,
  getFechaSimulada,
  hoyAppStr,
  setFechaSimulada,
  setHoraSimulada,
} from '../../utils/fecha';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#2E7D32';
const RED       = '#CC3333';
const ORANGE    = '#FF6B35';
const GOLD      = '#FFD700';
const BLUE      = '#1565C0';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function FilaEstado({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <View style={s.fila}>
      <Text style={s.filaLabel}>{label}</Text>
      <Text style={[s.filaValor, color ? { color } : {}]}>{valor}</Text>
    </View>
  );
}

function Btn({ label, onPress, color = PURPLE, small = false }: {
  label: string; onPress: () => void; color?: string; small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSm, { backgroundColor: color, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[s.btnTxt, small && s.btnTxtSm]}>{label}</Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: PURPLE_LT, marginVertical: 2 }} />;
}

// ─── Helpers de notificaciones ────────────────────────────────────────────────

async function pedirPermisos(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function enviarNotificacionInmediata(opts: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  const ok = await pedirPermisos();
  if (!ok) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: opts.title, body: opts.body, data: opts.data ?? {} },
    trigger: null, // inmediata
  });
  return id;
}

async function programarNotificacion(opts: {
  title: string;
  body: string;
  segundos: number;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  const ok = await pedirPermisos();
  if (!ok) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: opts.title, body: opts.body, data: opts.data ?? {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: opts.segundos },
  });
  return id;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Testing() {
  const gami = useGamificacion() as any;

  const [fechaInput, setFechaInput]   = useState(hoyAppStr());
  const [log, setLog]                 = useState<string[]>([]);
  const [notifIds, setNotifIds]       = useState<string[]>([]);
  const [_, forceUpdate]              = useState(0);

  const refresh = () => forceUpdate(n => n + 1);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 60));
  }, []);

  const registrarId = (id: string | null, nombre: string) => {
    if (id) {
      setNotifIds(prev => [...prev, id]);
      addLog(`🔔 ${nombre} programada — id: ${id.slice(0, 8)}…`);
    } else {
      addLog(`❌ ${nombre}: sin permisos o error`);
    }
  };

  // ── Aplicar fecha ────────────────────────────────────────────────────────
  const aplicarFecha = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInput)) {
      Alert.alert('Formato incorrecto', 'Usa YYYY-MM-DD'); return;
    }
    setFechaSimulada(fechaInput);
    addLog(`📅 Fecha → ${fechaInput}`);
    refresh();
  };

  const usarReal = () => {
    setFechaSimulada(null);
    const real = localDateStr(new Date());
    setFechaInput(real);
    addLog(`🕐 Fecha real → ${real}`);
    refresh();
  };

  const avanzar = (n: number) => {
    const nueva = avanzarDias(n);
    setFechaInput(nueva);
    addLog(`⏩ +${n} día(s) → ${nueva}`);
    refresh();
  };

  // ── Simular arranque ─────────────────────────────────────────────────────
  const simularArranque = () => {
    const hoy = hoyAppStr();
    addLog(`🚀 Arranque en ${hoy}`);
    try {
      const res = limpiarTareasViejas() as any;
      const canceladas  = res.canceladasAyer  ?? 0;
      const completadas = res.completadasAyer ?? 0;
      addLog(`   canceladasAyer=${canceladas}  completadasAyer=${completadas}`);

      if (canceladas + completadas === 0) {
        addLog('   Sin tareas el día anterior → sin penalización');
        refresh(); return;
      }
      if (completadas === 0) {
        addLog('   0 completadas → -20 ⭐');
        (gami.penalizarFinDia(canceladas, 0) as any).then((r: any) => {
          addLog(`   Penalización aplicada: -${r.penalizacion} ⭐ (${r.penalizacion > 0 ? 'OK' : 'ya aplicada'})`);
          refresh();
        });
      } else if (canceladas > 0) {
        addLog(`   ${completadas} hechas + ${canceladas} sin hacer → -10 ⭐`);
        (gami.penalizarFinDia(canceladas, completadas) as any).then((r: any) => {
          addLog(`   Penalización aplicada: -${r.penalizacion} ⭐ (${r.penalizacion > 0 ? 'OK' : 'ya aplicada'})`);
          refresh();
        });
      } else {
        addLog('   Todo completado → sin penalización ✅');
      }
    } catch (e: any) {
      addLog(`   ❌ Error: ${e.message}`);
    }
    refresh();
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    Alert.alert('Reset completo', '¿Borrar todo el estado de gamificación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Resetear', style: 'destructive', onPress: () => {
        if (Platform.OS === 'web') localStorage.removeItem('juego_state');
        addLog('🗑️ Estado borrado — reinicia la app');
      }},
    ]);
  };

  // ── Notificaciones ───────────────────────────────────────────────────────

  const notifRecordatorioTarea = async () => {
    const id = await enviarNotificacionInmediata({
      title: '📋 Tarea próxima',
      body:  'Tienes una tarea programada en 5 minutos. ¡No la olvides!',
      data:  { tipo: 'recordatorio_tarea' },
    });
    registrarId(id, 'Recordatorio tarea (inmediata)');
  };

  const notifRecordatorioTarea5min = async () => {
    const id = await programarNotificacion({
      title:    '📋 Tarea próxima',
      body:     'Tienes una tarea programada ahora mismo. ¡Empieza!',
      segundos: 300,
      data:     { tipo: 'recordatorio_tarea' },
    });
    registrarId(id, 'Recordatorio tarea (+5 min)');
  };

  const notifFinDia = async () => {
    const id = await enviarNotificacionInmediata({
      title: '🌙 Fin de día',
      body:  `Tienes tareas sin completar. Perderás ${gami.racha > 0 ? '10' : '20'} ⭐ si no las terminas.`,
      data:  { tipo: 'fin_dia' },
    });
    registrarId(id, 'Fin de día (inmediata)');
  };

  const notifPenalizacion = async () => {
    const id = await enviarNotificacionInmediata({
      title: '⚠️ Penalización aplicada',
      body:  'No completaste tus tareas de ayer. Se han descontado estrellas.',
      data:  { tipo: 'penalizacion' },
    });
    registrarId(id, 'Penalización (inmediata)');
  };

  const notifLogroMedalla = async (medalla: 'bronce' | 'plata' | 'oro') => {
    const emojis = { bronce: '🥉', plata: '🥈', oro: '🥇' };
    const nombres = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' };
    const id = await enviarNotificacionInmediata({
      title: `${emojis[medalla]} ¡Medalla de ${nombres[medalla]}!`,
      body:  `Has conseguido la medalla de ${nombres[medalla]}. ¡Sigue así!`,
      data:  { tipo: 'logro_medalla', medalla },
    });
    registrarId(id, `Logro medalla ${nombres[medalla]}`);
  };

  const notifRachaEnPeligro = async () => {
    const racha = gami.racha ?? 0;
    const id = await enviarNotificacionInmediata({
      title: '🔥 ¡Tu racha está en peligro!',
      body:  racha > 0
        ? `Llevas ${racha} día(s) de racha. Completa alguna tarea hoy para mantenerla.`
        : 'Completa una tarea hoy para empezar tu racha.',
      data: { tipo: 'racha_peligro', racha },
    });
    registrarId(id, 'Racha en peligro (inmediata)');
  };

  const cancelarTodasNotifs = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setNotifIds([]);
    addLog('🗑️ Todas las notificaciones programadas canceladas');
  };

  const verProgramadas = async () => {
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    if (programadas.length === 0) {
      addLog('📭 No hay notificaciones programadas');
    } else {
      addLog(`📬 ${programadas.length} notificación(es) programada(s):`);
      programadas.forEach(n => {
        addLog(`   • ${n.content.title} — id: ${n.identifier.slice(0, 8)}…`);
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const esSimulada     = getFechaSimulada() !== null;
  const fechaActual    = hoyAppStr();
  const medallaLabel   = gami.medalla
    ? ({ bronce: '🥉 Bronce', plata: '🥈 Plata', oro: '🥇 Oro' } as any)[gami.medalla]
    : '— Sin medalla';
  const penalizaciones: any[] = gami.historialPenalizaciones ?? [];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 60 }}>

      <Text style={s.title}>🧪 Testing</Text>
      <Text style={s.sub}>Panel de gamificación — solo desarrollo</Text>

      {/* ── Estado del hook ── */}
      <Text style={s.section}>ESTADO DEL HOOK</Text>
      <View style={s.card}>
        <FilaEstado label="📅 Fecha activa"    valor={fechaActual}                       color={esSimulada ? ORANGE : GREEN} />
        <FilaEstado label="🔧 Simulada"        valor={esSimulada ? `✅ ${getFechaSimulada()}` : '❌ No'} />
        <FilaEstado label="🆕 Día nuevo"       valor={gami.esDiaNuevo ? 'Sí' : 'No'}    color={gami.esDiaNuevo ? GREEN : '#AAA'} />
        <Divider />
        <FilaEstado label="⭐ Estrellas"       valor={String(gami.estrellas ?? 0)}        color={PURPLE} />
        <FilaEstado label="🔥 Racha"           valor={`${gami.racha} días`}               color={ORANGE} />
        <FilaEstado label="🏅 Medalla"         valor={medallaLabel}                       color={gami.medalla ? GOLD : '#AAA'} />
        <FilaEstado label="✅ Tareas hoy"      valor={String(gami.tareasCompletasHoy)}    color={GREEN} />
        <Divider />
        <FilaEstado label="📆 fechaHoy"        valor={gami.fechaHoy ?? '—'} />
        <FilaEstado label="📆 ultimaFecha"     valor={gami.ultimaFecha ?? '—'} />
        <FilaEstado label="🔒 Penal. aplicada" valor={gami.penalizacionAplicada ? 'Sí ⚠️' : 'No'} color={gami.penalizacionAplicada ? RED : GREEN} />
        <FilaEstado label="⏳ Cargando"        valor={gami.cargando ? 'Sí' : 'No'} />
      </View>

      {/* ── Historial de penalizaciones ── */}
      <Text style={s.section}>HISTORIAL DE PENALIZACIONES ({penalizaciones.length})</Text>
      <View style={s.card}>
        {penalizaciones.length === 0 ? (
          <Text style={s.empty}>Sin penalizaciones registradas</Text>
        ) : (
          penalizaciones.map((p: any, i: number) => (
            <View key={i} style={s.penalFila}>
              <View>
                <Text style={s.penalFecha}>{p.fecha}</Text>
                <Text style={s.penalMotivo}>{p.motivo ?? '—'}</Text>
              </View>
              <Text style={s.penalPuntos}>{p.puntos} ⭐</Text>
            </View>
          ))
        )}
      </View>

      {/* ── Control de fecha ── */}
      <Text style={s.section}>CONTROL DE FECHA</Text>
      <View style={s.card}>
        <Text style={s.inputLabel}>Fecha simulada (YYYY-MM-DD)</Text>
        <View style={s.inputRow}>
          <TextInput
            value={fechaInput}
            onChangeText={setFechaInput}
            style={s.input}
            placeholder="2026-05-10"
            keyboardType="numeric"
            maxLength={10}
          />
          <Btn label="Aplicar" onPress={aplicarFecha} small />
        </View>
        <View style={s.btnRow}>
          <Btn label="+1 día"  onPress={() => avanzar(1)} color={PURPLE} small />
          <Btn label="+2 días" onPress={() => avanzar(2)} color={PURPLE} small />
          <Btn label="+7 días" onPress={() => avanzar(7)} color={PURPLE} small />
        </View>
        <Btn label="🕐 Usar fecha real" onPress={usarReal} color="#555" />

        <Divider />
        <Text style={s.inputLabel}>Simular hora</Text>
        <View style={s.btnRow}>
          <Btn label="🕛 12:00" onPress={() => { setHoraSimulada(12, 0); addLog('🕛 Hora → 12:00'); }} color={PURPLE} small />
          <Btn label="🕘 21:00" onPress={() => { setHoraSimulada(21, 0); addLog('🕘 Hora → 21:00'); }} color={PURPLE} small />
          <Btn label="⏱ Real"  onPress={() => { setHoraSimulada(null, null); addLog('⏱ Hora real'); }}  color="#555"   small />
        </View>

        <Divider />
        <Text style={s.inputLabel}>Ajustar puntos</Text>
        <View style={s.btnRow}>
          <Btn label="🥇 610 pts (Oro)"   onPress={() => { updateUsuario({ puntos: 610 }); addLog('⭐ Puntos → 610 (Oro)');   refresh(); }} color={GOLD}   small />
          <Btn label="🥈 305 pts (Plata)" onPress={() => { updateUsuario({ puntos: 305 }); addLog('⭐ Puntos → 305 (Plata)'); refresh(); }} color="#AAA"   small />
        </View>
      </View>

      {/* ── Notificaciones ── */}
      <Text style={s.section}>NOTIFICACIONES ({notifIds.length} disparadas)</Text>
      <View style={s.card}>

        <Text style={s.inputLabel}>📋 Recordatorio de tarea</Text>
        <View style={s.btnRow}>
          <Btn label="Inmediata"  onPress={notifRecordatorioTarea}      color={BLUE}  small />
          <Btn label="+5 min"     onPress={notifRecordatorioTarea5min}  color={BLUE}  small />
        </View>

        <Divider />
        <Text style={s.inputLabel}>🌙 Fin de día / penalización</Text>
        <View style={s.btnRow}>
          <Btn label="Aviso fin día"   onPress={notifFinDia}       color={ORANGE} small />
          <Btn label="Penalización"    onPress={notifPenalizacion} color={RED}    small />
        </View>

        <Divider />
        <Text style={s.inputLabel}>🏅 Logros y medallas</Text>
        <View style={s.btnRow}>
          <Btn label="🥉 Bronce" onPress={() => notifLogroMedalla('bronce')} color="#CD7F32" small />
          <Btn label="🥈 Plata"  onPress={() => notifLogroMedalla('plata')}  color="#AAA"    small />
          <Btn label="🥇 Oro"    onPress={() => notifLogroMedalla('oro')}    color={GOLD}    small />
        </View>

        <Divider />
        <Text style={s.inputLabel}>🔥 Racha en peligro</Text>
        <Btn label={`Racha en peligro (actual: ${gami.racha ?? 0} días)`} onPress={notifRachaEnPeligro} color={ORANGE} />

        <Divider />
        <Text style={s.inputLabel}>Gestión</Text>
        <View style={s.btnRow}>
          <Btn label="📬 Ver programadas"  onPress={verProgramadas}      color={PURPLE} small />
          <Btn label="🗑️ Cancelar todas"   onPress={cancelarTodasNotifs} color={RED}    small />
        </View>
      </View>

      {/* ── Simular arranque ── */}
      <Text style={s.section}>SIMULAR ARRANQUE DE APP</Text>
      <View style={s.card}>
        <Text style={s.helpTxt}>
          Ejecuta limpiarTareasViejas en la fecha activa, detecta
          canceladas/completadas del día anterior y aplica la penalización.
        </Text>
        <Btn label="🚀 Simular arranque" onPress={simularArranque} color={ORANGE} />
      </View>

      {/* ── Reset ── */}
      <Text style={s.section}>ZONA PELIGROSA</Text>
      <View style={[s.card, { borderColor: RED, borderWidth: 1.5 }]}>
        <Btn label="🗑️ Reset completo del estado" onPress={reset} color={RED} />
      </View>

      {/* ── Log ── */}
      <Text style={s.section}>LOG ({log.length})</Text>
      <View style={[s.card, { backgroundColor: '#111' }]}>
        {log.length === 0
          ? <Text style={{ color: '#555', fontSize: 12 }}>Sin actividad...</Text>
          : log.map((l, i) => <Text key={i} style={s.logLine}>{l}</Text>)
        }
      </View>

    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { fontSize: 26, fontWeight: '800', color: PURPLE, textAlign: 'center' },
  sub:   { fontSize: 13, color: '#AAA', textAlign: 'center', marginBottom: 20 },

  section: { fontSize: 10, fontWeight: '700', color: '#BBB', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 6 },

  card: { backgroundColor: PURPLE_BG, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: PURPLE_LT },

  fila:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filaLabel: { fontSize: 13, color: '#555' },
  filaValor: { fontSize: 14, fontWeight: '700', color: '#333' },

  penalFila:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF0F0', borderRadius: 10, padding: 10 },
  penalFecha:  { fontSize: 12, fontWeight: '700', color: RED },
  penalMotivo: { fontSize: 11, color: '#AA4444', marginTop: 2 },
  penalPuntos: { fontSize: 16, fontWeight: '800', color: RED },

  empty: { fontSize: 13, color: '#AAA', textAlign: 'center', paddingVertical: 8 },

  inputLabel: { fontSize: 12, color: '#888' },
  inputRow:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: PURPLE_LT,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  btnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn:    { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSm:  { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnTxtSm: { fontSize: 12 },

  helpTxt: { fontSize: 12, color: '#888', lineHeight: 18 },

  logLine: { fontSize: 11, color: '#0f0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
});
