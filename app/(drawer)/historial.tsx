import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getTareasHistorial } from '../../database/database';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const GREEN_LT  = '#EDF9EF';
const RED       = '#FF4444';
const RED_LT    = '#FFF0F0';
const GOLD      = '#FFD700';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
const FECHA_SIMULADA = '04/05/2026'; 
  function hoySimulado() {
  return FECHA_SIMULADA ?? new Date().toISOString().slice(0, 10);
}

function diasDeSemana(lunes: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function etiquetaSemana(lunes: Date): string {
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${lunes.toLocaleDateString('es-ES', opts)} – ${domingo.toLocaleDateString('es-ES', opts)}`;
}

const DIAS_CORTOS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

// ─── Estrellas ────────────────────────────────────────────────────────────────
function StarRow({ count = 0, size = 13 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}>
      {'★'.repeat(Math.max(0, count))}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(Math.max(0, 5 - count))}</Text>
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Historial() {
  const [search,       setSearch]       = useState('');
  const [historial,    setHistorial]    = useState<any[]>([]);
  const [semanaActual, setSemanaActual] = useState(() => lunesDe(new Date()));

  const hoy = hoySimulado();

  // Día seleccionado — por defecto hoy
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  // ── Recargar cada vez que el usuario entra en esta pantalla ───────────────
  useFocusEffect(
    useCallback(() => {
      const rows = getTareasHistorial();
      setHistorial(rows);
    }, [])
  );

const esMismaSemanaque = (lunes: Date) => {
  const lunesHoy = lunesDe(new Date());
  return lunes.toISOString().slice(0, 10) === lunesHoy.toISOString().slice(0, 10);
};
 
const irAnterior = () => {
  setSemanaActual(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 7);
    setDiaSeleccionado(d.toISOString().slice(0, 10));
    return d;
  });
};
 
const irSiguiente = () => {
  setSemanaActual(prev => {
    // Solo avanzar si la semana actual NO es ya la semana de hoy
    if (esMismaSemanaque(prev)) return prev;
    const d = new Date(prev);
    d.setDate(d.getDate() + 7);
    // Si la nueva semana ya es la de hoy, seleccionar hoy; si no, el lunes
    const nuevaEsHoy = esMismaSemanaque(d);
    setDiaSeleccionado(nuevaEsHoy ? hoy : d.toISOString().slice(0, 10));
    return d;
  });
};
 
// Y sustituye la línea de esEstaSemana por:
const esEstaSemana = esMismaSemanaque(semanaActual);

  const dias = diasDeSemana(semanaActual);

  // ── Tareas del día seleccionado ───────────────────────────────────────────
  const tareasDelDia = historial.filter(t => {
    const fecha = t.fechaCompletada ?? t.fechaDia ?? '';
    return fecha === diaSeleccionado &&
           t.title.toLowerCase().includes(search.toLowerCase());
  });

  const completadas = tareasDelDia.filter(t => t.estado === 'completada');
  const canceladas  = tareasDelDia.filter(t => t.estado === 'cancelada');

  // ── Nombre largo del día seleccionado ─────────────────────────────────────
  const nombreDiaSeleccionado = new Date(diaSeleccionado + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Historial</Text>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <TextInput
            placeholder="Buscar tarea..."
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 15 }}
          />
          <Ionicons name="search" size={18} color="#999" />
        </View>

        {/* ── Selector de semana ── */}
        <View style={styles.weekSelector}>
          <Pressable onPress={irAnterior} style={styles.weekArrow}>
            <Ionicons name="chevron-back" size={22} color={PURPLE} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.weekLabel}>{etiquetaSemana(semanaActual)}</Text>
          </View>
          <Pressable
            onPress={irSiguiente}
            disabled={esEstaSemana}
            style={[styles.weekArrow, esEstaSemana && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-forward" size={22} color={PURPLE} />
          </Pressable>
        </View>

        {/* ── Botones de días L-M-X-J-V-S-D ── */}
        <View style={styles.daysStrip}>
          {dias.map(fecha => {
            const seleccionado = fecha === diaSeleccionado;
            const esHoy        = fecha === hoy;
            const nombreCorto  = DIAS_CORTOS[new Date(fecha + 'T12:00:00').getDay()];

            // Puntos de actividad
            const nComp = historial.filter(
              t => (t.fechaCompletada ?? t.fechaDia) === fecha && t.estado === 'completada'
            ).length;
            const nCanc = historial.filter(
              t => (t.fechaCompletada ?? t.fechaDia) === fecha && t.estado === 'cancelada'
            ).length;

            return (
              <Pressable
                key={fecha}
                onPress={() => setDiaSeleccionado(fecha)}
                style={[
                  styles.dayBtn,
                  seleccionado && styles.dayBtnSelected,
                  esHoy && !seleccionado && styles.dayBtnHoy,
                ]}
              >
                <Text style={[
                  styles.dayBtnLabel,
                  seleccionado && { color: 'white', fontWeight: '700' },
                  esHoy && !seleccionado && { color: PURPLE, fontWeight: '700' },
                ]}>
                  {nombreCorto}
                </Text>
                {/* Indicadores de actividad */}
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
                  {nComp > 0 && <View style={[styles.dot, { backgroundColor: seleccionado ? 'white' : GREEN }]} />}
                  {nCanc > 0 && <View style={[styles.dot, { backgroundColor: seleccionado ? '#ffcccc' : RED }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Cabecera del día seleccionado ── */}
        <View style={styles.diaHeader}>
          <Text style={styles.diaNombre}>
            {diaSeleccionado === hoy
              ? `Hoy · ${nombreDiaSeleccionado}`
              : nombreDiaSeleccionado.charAt(0).toUpperCase() + nombreDiaSeleccionado.slice(1)}
          </Text>
          {tareasDelDia.length > 0 && (
            <View style={styles.diaBadgesRow}>
              <View style={[styles.diaBadge, { backgroundColor: GREEN_LT }]}>
                <Text style={[styles.diaBadgeText, { color: GREEN }]}>✓ {completadas.length}</Text>
              </View>
              <View style={[styles.diaBadge, { backgroundColor: RED_LT }]}>
                <Text style={[styles.diaBadgeText, { color: RED }]}>✕ {canceladas.length}</Text>
              </View>
            </View>
          )}
        </View>

        {tareasDelDia.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin tareas este día</Text>
            <Text style={styles.emptySubText}>Pulsa otro día para ver su historial</Text>
          </View>
        ) : (
          <View style={styles.columnasRow}>

            {/* Columna REALIZADAS */}
            <View style={styles.columna}>
              <View style={[styles.columnaHeader, { backgroundColor: GREEN_LT, borderColor: GREEN }]}>
                <Text style={[styles.columnaHeaderText, { color: GREEN }]}>✓ Realizadas</Text>
              </View>
              {completadas.length === 0 ? (
                <Text style={styles.columnEmpty}>Ninguna</Text>
              ) : (
                completadas.map(item => (
                  <View key={item.id} style={[styles.tareaCard, { borderLeftColor: GREEN }]}>
                    {item.pictogramId && (
                      <Image
                        source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }}
                        style={styles.pictogram}
                      />
                    )}
                    <Text style={styles.tareaTitle} numberOfLines={2}>{item.title}</Text>
                    <StarRow count={item.stars ?? 5} size={12} />
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={styles.tareaHora}>{item.hora}</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Columna CANCELADAS */}
            <View style={styles.columna}>
              <View style={[styles.columnaHeader, { backgroundColor: RED_LT, borderColor: RED }]}>
                <Text style={[styles.columnaHeaderText, { color: RED }]}>✕ Canceladas</Text>
              </View>
              {canceladas.length === 0 ? (
                <Text style={styles.columnEmpty}>Ninguna</Text>
              ) : (
                canceladas.map(item => (
                  <View key={item.id} style={[styles.tareaCard, { borderLeftColor: RED, opacity: 0.75 }]}>
                    {item.pictogramId && (
                      <Image
                        source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }}
                        style={styles.pictogram}
                      />
                    )}
                    <Text style={[styles.tareaTitle, { textDecorationLine: 'line-through', color: '#888' }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={styles.tareaHora}>{item.hora}</Text>
                    )}
                  </View>
                ))
              )}
            </View>

          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  titulo: { fontSize: 30, fontWeight: '700', color: PURPLE, marginBottom: 20 },
  sectionTitle: { fontSize: 30, fontWeight: '700', color: PURPLE, marginBottom: 10 },

  // Stats globales
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1, backgroundColor: PURPLE_BG,
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: PURPLE_LT,
  },
  statNum:   { fontSize: 26, fontWeight: '800', color: PURPLE },
  statLabel: { fontSize: 10, color: '#888', marginTop: 3, textAlign: 'center' },

  // Medallas
  medalCard: {
    flex: 1, backgroundColor: 'white',
    borderWidth: 2, borderColor: PURPLE_LT,
    borderRadius: 14, padding: 10, alignItems: 'center',
  },
  medalLabel:   { fontWeight: '700', fontSize: 11, marginTop: 4 },
  medalSub:     { fontSize: 9, color: '#AAA', marginTop: 2, textAlign: 'center' },
  medalBarBg:   { backgroundColor: '#EEE', borderRadius: 4, height: 5, marginTop: 7, overflow: 'hidden' },
  medalBarFill: { height: '100%', borderRadius: 4 },
  medalCount:   { fontSize: 9, color: '#BBB', marginTop: 4 },

  // Siguiente medalla
  nextBox:  { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5 },
  nextText: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' },

  // Búsqueda

   searchBar: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#f3f2f2', borderRadius: 25,
    paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20,
  },


  // Selector de semana
  weekSelector: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: PURPLE_BG, borderRadius: 16,
    paddingVertical: 10, paddingHorizontal: 6,
    marginBottom: 12, borderWidth: 1.5, borderColor: PURPLE_LT,
  },
  weekArrow:    { padding: 6 },
  weekLabel:    { fontSize: 20, fontWeight: '700', color: PURPLE, textAlign: 'center' },
  weekSubLabel: { fontSize: 11, color: '#AAA', marginTop: 2 },

  // Stats de la semana
  weekStats: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    marginBottom: 14,
  },
  weekStatText: { fontSize: 13, color: '#888', fontWeight: '600' },

  // Franja de días
  daysStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%',
    backgroundColor: '#FAFAFA', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8,
    marginBottom: 20, borderWidth: 1, borderColor: '#EEE',
  },
  
  dayBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 12, marginHorizontal: 2,
  },
  dayBtnSelected: { backgroundColor: PURPLE },
  dayBtnHoy:      { backgroundColor: PURPLE_LT },
  dayBtnLabel:    { fontSize: 11, color: '#AAA', fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3 }
  ,

  // Cabecera de día
   diaHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  diaNombre:    { fontSize: 14, fontWeight: '700', color: '#555', flex: 1, textTransform: 'capitalize' },
  diaBadgesRow: { flexDirection: 'row', gap: 6 },
  diaBadge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  diaBadgeText: { fontSize: 12, fontWeight: '700' },

  // Items de historial
   columnasRow: { flexDirection: 'row', gap: 12 },
  columna:     { flex: 1 },
  columnaHeader: {
    borderRadius: 10, borderWidth: 1.5,
    paddingVertical: 7, alignItems: 'center',
    marginBottom: 10,
  },
  columnaHeaderText: { fontSize: 13, fontWeight: '700' },
  columnEmpty:       { fontSize: 12, color: '#CCC', textAlign: 'center', marginTop: 12 },

  // Tarjeta de tarea
  tareaCard: {
    backgroundColor: '#FAFAFA', borderRadius: 12,
    padding: 10, marginBottom: 8,
    borderLeftWidth: 3,
  },
  pictogram:  { width: 36, height: 36, borderRadius: 6, marginBottom: 6 },
  tareaTitle: { fontSize: 13, color: '#333', fontWeight: '600', marginBottom: 4 },
  tareaHora:  { fontSize: 11, color: '#AAA', marginTop: 2 },
  // Empty
  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyText:    { fontSize: 16, color: '#AAA', fontWeight: '600', textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#CCC', marginTop: 6 },

  // Normas
  rulesBox: { backgroundColor: PURPLE_BG, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: PURPLE_LT },
  ruleRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ruleIcon: { fontSize: 17, width: 26, textAlign: 'center' },
  ruleText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
});
