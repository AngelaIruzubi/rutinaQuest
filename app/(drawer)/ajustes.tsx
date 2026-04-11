// app/(drawer)/ajustes.tsx
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useAjustesCtx } from '../../context/AjustesContext';
import { getTareasHistorial } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';

// ─── Colores ──────────────────────────────────────────────────────────────────
const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const PURPLE_DK = '#7B5A9A';
const GREEN     = '#58CC02';
const RED       = '#FF4444';
const ORANGE    = '#FF6B35';
const GOLD      = '#FFD700';

// ─── Sección con título ───────────────────────────────────────────────────────
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      <View style={s.seccionCard}>{children}</View>
    </View>
  );
}

// ─── Fila con switch ──────────────────────────────────────────────────────────
function FilaSwitch({
  icono, label, sub, valor, onChange, color = PURPLE,
}: {
  icono: string; label: string; sub?: string;
  valor: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <View style={s.fila}>
      <View style={[s.filaIcono, { backgroundColor: color + '22' }]}>
        <Ionicons name={icono as any} size={18} color={color} />
      </View>
      <View style={s.filaTexto}>
        <Text style={s.filaLabel}>{label}</Text>
        {sub && <Text style={s.filaSub}>{sub}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ false: '#DDD', true: PURPLE_LT }}
        thumbColor={valor ? PURPLE : '#fff'}
      />
    </View>
  );
}

// ─── Fila de opciones (radio) ─────────────────────────────────────────────────
function FilaOpciones<T extends string>({
  icono, label, opciones, valor, onChange, color = PURPLE,
}: {
  icono: string; label: string;
  opciones: { valor: T; etiqueta: string }[];
  valor: T; onChange: (v: T) => void; color?: string;
}) {
  return (
    <View style={s.filaOpciones}>
      <View style={s.fila}>
        <View style={[s.filaIcono, { backgroundColor: color + '22' }]}>
          <Ionicons name={icono as any} size={18} color={color} />
        </View>
        <Text style={s.filaLabel}>{label}</Text>
      </View>
      <View style={s.opcionesRow}>
        {opciones.map(op => (
          <Pressable
            key={op.valor}
            onPress={() => onChange(op.valor)}
            style={[
              s.opcionBtn,
              valor === op.valor && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text style={[
              s.opcionTxt,
              valor === op.valor && { color: '#fff', fontWeight: '700' },
            ]}>
              {op.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Fila de acción ───────────────────────────────────────────────────────────
function FilaAccion({
  icono, label, sub, onPress, color = PURPLE, destructivo = false,
}: {
  icono: string; label: string; sub?: string;
  onPress: () => void; color?: string; destructivo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.fila, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.filaIcono, { backgroundColor: (destructivo ? RED : color) + '22' }]}>
        <Ionicons name={icono as any} size={18} color={destructivo ? RED : color} />
      </View>
      <View style={s.filaTexto}>
        <Text style={[s.filaLabel, destructivo && { color: RED }]}>{label}</Text>
        {sub && <Text style={s.filaSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CCC" />
    </Pressable>
  );
}

// ─── Separador ────────────────────────────────────────────────────────────────
function Sep() {
  return <View style={s.sep} />;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Ajustes() {
  const { ajustes, colores, escala, actualizar, reset } = useAjustesCtx();
  const gami = useGamificacion();

  const [exportando, setExportando] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exportando) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [exportando]);

  // ── Exportar historial como texto compartible ─────────────────────────────
  const exportarHistorial = async () => {
    setExportando(true);
    try {
      const historial = getTareasHistorial() as any[];
      if (historial.length === 0) {
        Alert.alert('Sin historial', 'Aún no tienes tareas completadas para exportar.');
        return;
      }

      // Agrupar por fecha
      const grupos: Record<string, any[]> = {};
      for (const t of historial) {
        const fecha = t.fechaCompletada ?? t.fechaDia ?? 'Sin fecha';
        if (!grupos[fecha]) grupos[fecha] = [];
        grupos[fecha].push(t);
      }

      const totalEstrellas = historial
        .filter(t => t.estado === 'completada')
        .reduce((acc, t) => acc + (t.stars ?? 5), 0);

      const completadas = historial.filter(t => t.estado === 'completada').length;
      const canceladas  = historial.filter(t => t.estado === 'cancelada').length;

      // Construir texto del historial
      const lineas: string[] = [
        '═══════════════════════════════',
        '       🌟 RutinaQuest 🌟',
        '     Historial de actividad',
        '═══════════════════════════════',
        '',
        `⭐ Estrellas totales: ${gami.estrellas}`,
        `🔥 Racha actual: ${gami.racha} días`,
        `✅ Completadas: ${completadas}`,
        `❌ Canceladas: ${canceladas}`,
        '',
        '───────────────────────────────',
      ];

      for (const [fecha, tareas] of Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30)) {
        lineas.push('');
        lineas.push(`📅 ${fecha}`);
        for (const t of tareas) {
          const estrellitas = '★'.repeat(t.stars ?? 5) + '☆'.repeat(5 - (t.stars ?? 5));
          const estado = t.estado === 'completada' ? '✅' : '❌';
          lineas.push(`  ${estado} ${t.title}${t.hora && t.hora !== 'Sin hora' ? ` · ${t.hora}` : ''} ${estrellitas}`);
        }
      }

      lineas.push('');
      lineas.push('═══════════════════════════════');
      lineas.push(`Exportado desde RutinaQuest`);
      lineas.push(new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }));

      await Share.share({
        message: lineas.join('\n'),
        title: 'Mi historial de RutinaQuest',
      });
    } finally {
      setExportando(false);
    }
  };

  // ── Compartir tarjeta de perfil ───────────────────────────────────────────
  const compartirPerfil = async () => {
    const medallaEmoji = gami.medalla
      ? ({ bronce: '🥉', plata: '🥈', oro: '🥇' } as any)[gami.medalla]
      : '🎮';

    const tarjeta = [
      '┌─────────────────────────────┐',
      '│       🌟 RutinaQuest        │',
      '├─────────────────────────────┤',
      `│  ${medallaEmoji} Mi perfil              │`,
      '│                             │',
      `│  ⭐ Estrellas: ${String(gami.estrellas).padEnd(13)}│`,
      `│  🔥 Racha:    ${String(gami.racha + ' días').padEnd(13)}│`,
      `│  ✅ Tareas:   ${String(gami.totalHecho).padEnd(13)}│`,
      `│  🏅 Medalla:  ${String(gami.medalla ? gami.medalla.charAt(0).toUpperCase() + gami.medalla.slice(1) : 'Sin medalla').padEnd(13)}│`,
      '│                             │',
      '│  ¡Jugando con RutinaQuest!  │',
      '└─────────────────────────────┘',
    ].join('\n');

    await Share.share({
      message: tarjeta,
      title: 'Mi perfil de RutinaQuest',
    });
  };

  // ── Reset ajustes ─────────────────────────────────────────────────────────
  const confirmarReset = () => {
    Alert.alert(
      'Restablecer ajustes',
      '¿Volver a los ajustes por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: reset },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[s.root, { backgroundColor: colores.fondo }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.titulo, { fontSize: 30 * escala, color: colores.purple }]}>Ajustes</Text>

      {/* ── APARIENCIA ── */}
      <Seccion titulo="🎨  Apariencia">
        <FilaOpciones
          icono="sunny-outline"
          label="Tema"
          opciones={[
            { valor: 'claro',  etiqueta: '☀️ Claro'  },
            { valor: 'oscuro', etiqueta: '🌙 Oscuro' },
            { valor: 'auto',   etiqueta: '⚙️ Auto'   },
          ]}
          valor={ajustes.tema}
          onChange={v => actualizar({ tema: v })}
        />
        <Sep />
        <FilaOpciones
          icono="text-outline"
          label="Tamaño de texto"
          opciones={[
            { valor: 'pequeño',    etiqueta: 'Pequeño'  },
            { valor: 'normal',     etiqueta: 'Normal'   },
            { valor: 'grande',     etiqueta: 'Grande'   },
            { valor: 'muy_grande', etiqueta: 'Muy gde.' },
          ]}
          valor={ajustes.tamanoTexto}
          onChange={v => actualizar({ tamanoTexto: v })}
        />
        <Sep />
        <FilaSwitch
          icono="contrast-outline"
          label="Alto contraste"
          sub="Mejora la legibilidad"
          valor={ajustes.altoContraste}
          onChange={v => actualizar({ altoContraste: v })}
          color="#333"
        />
      </Seccion>

      {/* ── INTERACCIÓN ── */}
      <Seccion titulo="⚡  Interacción">
        <FilaSwitch
          icono="phone-portrait-outline"
          label="Vibración"
          sub="Al completar tareas"
          valor={ajustes.vibracion}
          onChange={v => actualizar({ vibracion: v })}
          color={ORANGE}
        />
        <Sep />
        <FilaSwitch
          icono="notifications-outline"
          label="Notificaciones"
          sub="Alertas de la app"
          valor={ajustes.notificaciones}
          onChange={v => actualizar({ notificaciones: v })}
          color={PURPLE}
        />
        {ajustes.notificaciones && (
          <>
            <Sep />
            <FilaSwitch
              icono="timer-outline"
              label="Aviso 5 minutos"
              sub="Antes de que venza una tarea"
              valor={ajustes.notifCincoMin}
              onChange={v => actualizar({ notifCincoMin: v })}
              color={PURPLE}
            />
            <Sep />
            <FilaSwitch
              icono="partly-sunny-outline"
              label="Aviso mediodía"
              sub="Si no has empezado"
              valor={ajustes.notifMitadDia}
              onChange={v => actualizar({ notifMitadDia: v })}
              color={ORANGE}
            />
            <Sep />
            <FilaSwitch
              icono="moon-outline"
              label="Aviso fin de día"
              sub="A las 21h si quedan tareas"
              valor={ajustes.notifFinDia}
              onChange={v => actualizar({ notifFinDia: v })}
              color="#555"
            />
          </>
        )}
      </Seccion>

      {/* ── PRIVACIDAD ── */}
      <Seccion titulo="🔒  Privacidad">
        <FilaSwitch
          icono="share-social-outline"
          label="Compartir historial"
          sub="Permite exportar y compartir tu actividad"
          valor={ajustes.compartirHistorial}
          onChange={v => actualizar({ compartirHistorial: v })}
          color={GREEN}
        />
      </Seccion>

      {/* ── EXPORTAR Y COMPARTIR ── */}
      <Seccion titulo="📤  Exportar y compartir">
        <FilaAccion
          icono="document-text-outline"
          label="Exportar historial"
          sub="Comparte tu actividad como texto"
          onPress={exportarHistorial}
          color={PURPLE}
        />
        <Sep />
        <FilaAccion
          icono="person-circle-outline"
          label="Compartir mi perfil"
          sub="Tarjeta con tus estadísticas"
          onPress={compartirPerfil}
          color={ORANGE}
        />
      </Seccion>

      {/* ── ESTADÍSTICAS RÁPIDAS ── */}
      <Seccion titulo="📊  Resumen">
        <View style={s.statsGrid}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{gami.estrellas}</Text>
            <Text style={s.statLbl}>⭐ Estrellas</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statNum}>{gami.racha}</Text>
            <Text style={s.statLbl}>🔥 Racha</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: gami.medalla ? GOLD : '#CCC' }]}>
              {gami.medalla
                ? ({ bronce: '🥉', plata: '🥈', oro: '🥇' } as any)[gami.medalla]
                : '—'}
            </Text>
            <Text style={s.statLbl}>Medalla</Text>
          </View>
        </View>
      </Seccion>

      {/* ── RESTABLECER ── */}
      <Seccion titulo="⚙️  Avanzado">
        <FilaAccion
          icono="refresh-outline"
          label="Restablecer ajustes"
          sub="Volver a los valores por defecto"
          onPress={confirmarReset}
          destructivo
        />
      </Seccion>

      {/* Versión */}
      <Text style={s.version}>RutinaQuest · v1.0</Text>

    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  titulo: {
    fontWeight: '700', color: PURPLE,
    textAlign: 'center', marginBottom: 24,
  },

  seccion:       { marginBottom: 20 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', color: '#BBB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  seccionCard:   { backgroundColor: PURPLE_BG, borderRadius: 18, paddingVertical: 4, paddingHorizontal: 14, borderWidth: 1, borderColor: PURPLE_LT },

  fila:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  filaIcono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { flex: 1 },
  filaLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  filaSub:   { fontSize: 11, color: '#AAA', marginTop: 1 },

  filaOpciones: { paddingVertical: 10, gap: 8 },
  opcionesRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 46 },
  opcionBtn:    { borderRadius: 20, borderWidth: 1.5, borderColor: PURPLE_LT, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  opcionTxt:    { fontSize: 12, color: '#666' },

  sep: { height: 1, backgroundColor: PURPLE_LT, marginHorizontal: -14 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  statItem:  { alignItems: 'center', gap: 4 },
  statNum:   { fontSize: 28, fontWeight: '800', color: PURPLE },
  statLbl:   { fontSize: 11, color: '#AAA' },

  version: { textAlign: 'center', color: '#CCC', fontSize: 11, marginTop: 8, marginBottom: 20 },
});
