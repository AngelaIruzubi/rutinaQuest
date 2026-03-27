import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { getTareas } from '../../database/database';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';



function lunesDe(fecha: string | Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0=dom, 1=lun...
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasDeSemana(lunes: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10); // "2025-03-24"
  });
}

function etiquetaSemana(lunes: Date): string {
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const lunesStr = lunes.toLocaleDateString('es-ES', opciones);
  const domingoStr = domingo.toLocaleDateString('es-ES', opciones);
  
  return `${lunesStr} - ${domingoStr}`;
}

const DIAS_CORTOS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];



// ─────────────────────────────────────────────────────────────────────────────
export default function Histroial() {
  const [search,     setSearch]     = useState('');
  const [completadas, setCompletadas] = useState<any[]>([]);


  const [semanaActual, setSemanaActual] = useState(() => lunesDe(new Date()));

  

  useEffect(() => {
    const rows = getTareas();
    const hechas = rows
      .filter((r: any) => r.completed === 1)
      .map((r: any) => ({ ...r }))
      .reverse(); // más recientes primero
    setCompletadas(hechas);
  }, []);

  const filtradas = completadas.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

const irSemanaAnterior = () => {
    setSemanaActual(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };
  const irSemanaSiguiente = () => {
    setSemanaActual(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const esEstaSemana = lunesDe(new Date()).toISOString().slice(0, 10) === semanaActual.toISOString().slice(0, 10);

  // ── Días de la semana seleccionada ─────────────────────────────────────────
  const dias = diasDeSemana(semanaActual);

  // ── Tareas filtradas por semana y búsqueda ─────────────────────────────────
  const tareasEnSemana = completadas.filter(t =>
    dias.includes(t.fechaCompletada) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por día
  const porDia = dias.map(fecha => ({
    fecha,
    items: tareasEnSemana.filter(t => t.fechaCompletada === fecha),
  }));

  // ── Stats de la semana ─────────────────────────────────────────────────────
  const estrellasSemana = tareasEnSemana.reduce((acc, t) => acc + (t.stars ?? 5), 0);
  const tareasSemana    = tareasEnSemana.length;
  const GOLD      = '#FFD700';
  function StarRow({ count = 0, size = 15 }: { count: number; size?: number }) {
    return (
      <Text style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}>
        {'★'.repeat(count)}<Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
      </Text>
    );
  }
  


  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40,
        flexDirection:'column', gap:20, justifyContent:'center', alignItems:'center'
       }}>

        <Text style={styles.sectionTitle}>Historial</Text>

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

        {/* Selector de semana */}
        <View style={styles.weekSelector}>
          <Pressable onPress={irSemanaAnterior} style={styles.weekArrow}>
            <Ionicons name="chevron-back" size={22} color={PURPLE} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', width:'100%', justifyContent:'center' }}>
            <Text style={styles.weekLabel}>{etiquetaSemana(semanaActual)}</Text>
          </View>

          <Pressable
            onPress={irSemanaSiguiente}
            style={[styles.weekArrow, esEstaSemana && { opacity: 0.3 }]}
            disabled={esEstaSemana}
          >
            <Ionicons name="chevron-forward" size={22} color={PURPLE} />
          </Pressable>
        </View>

        {/* Mini resumen de la semana 
        <View style={styles.weekStats}>
          <Text style={styles.weekStatText}>
            {tareasSemana} tarea{tareasSemana !== 1 ? 's' : ''} completada{tareasSemana !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.weekStatText}>·</Text>
          <Text style={styles.weekStatText}>{estrellasSemana} ⭐</Text>
        </View>*/}

        {/* ── Franja de días de la semana ── */}
        <View style={styles.daysStrip}>
          {dias.map((fecha, i) => {
            const count   = completadas.filter(t => t.fechaCompletada === fecha).length;
            const esHoy   = fecha === new Date().toISOString().slice(0, 10);
            const tieneTareas = count > 0;
            return (
              <View key={fecha} style={styles.dayCol}>
                <Text style={[styles.dayName, esHoy && { color: PURPLE, fontWeight: '700' }]}>
                  {DIAS_CORTOS[i]}
                </Text>
                <View style={[
                  styles.dayDot,
                  tieneTareas && { backgroundColor: PURPLE },
                  esHoy && !tieneTareas && { borderWidth: 2, borderColor: PURPLE },
                ]}>
                  {tieneTareas && (
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>{count}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Lista de tareas agrupadas por día ── */}
        {porDia.every(d => d.items.length === 0) ? (
          <View style={styles.emptyBox}>
            {completadas.length === 0 ? (
              <>
                <Text style={styles.emptyText}>Aún no has completado ninguna tarea</Text>
                <Text style={styles.emptySubText}>¡Completa tareas para verlas aquí!</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>Sin tareas esta semana</Text>
                <Text style={styles.emptySubText}>Navega a otras semanas con las flechas</Text>
              </>
            )}
          </View>
        ) : (
          porDia
            .filter(d => d.items.length > 0)
            .map(({ fecha, items }) => {
              const fechaObj  = new Date(fecha + 'T00:00:00');
              const esHoy     = fecha === new Date().toISOString().slice(0, 10);
              const nombreDia = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

              return (
                <View key={fecha} style={{ marginBottom: 16,  width:'50%', alignItems:'center'}}>
                  {/* Cabecera del día */}
                  <View style={styles.diaHeader}>
                    <Text style={[styles.diaLabel, esHoy && { color: PURPLE }]}>
                      {esHoy ? `Hoy · ${nombreDia}` : nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}
                    </Text>
                  </View>

                  {/* Tareas del día */}
                  {items.map(item => (
                    <View key={item.id} style={styles.histItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {item.pictogramId && (
                          <Image
                            source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }}
                            style={styles.pictogram}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.histTitle} numberOfLines={1}>{item.title}</Text>
                          <StarRow count={item.stars ?? 5} size={14} />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {item.hora && item.hora !== 'Sin hora' && (
                          <Text style={styles.histTime}>{item.hora}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
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
  pageTitle: { fontSize: 30, fontWeight: '700', color: PURPLE, marginBottom: 20 },
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
  medalBarBg:   { backgroundColor: '#EEE', borderRadius: 4, height: 5, marginTop: 7, width: '100%', overflow: 'hidden' },
  medalBarFill: { height: '100%', borderRadius: 4 },
  medalCount:   { fontSize: 9, color: '#BBB', marginTop: 4 },

  // Siguiente medalla
  nextBox:  { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5 },
  nextText: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' },

  // Búsqueda
  searchBar: {
    flexDirection: 'row', alignItems: 'center', width:'100%',
    backgroundColor: '#f3f2f2', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, marginBottom: 14,
  },

  // Selector de semana
  weekSelector: {
    flexDirection: 'row', alignItems: 'center', width:'100%',
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
    flexDirection: 'row', justifyContent: 'space-between', width:'50%',
    backgroundColor: '#FAFAFA', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8,
    marginBottom: 20, borderWidth: 1, borderColor: '#EEE',
  },
  dayCol:  { alignItems: 'center', gap: 6 },
  dayName: { fontSize: 11, color: '#AAA', fontWeight: '600' },
  dayDot:  {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEE',
    alignItems: 'center', justifyContent: 'center',
  },

  // Cabecera de día
  diaHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  diaLabel:      { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'capitalize' },
  diaStarsBadge: { backgroundColor: PURPLE_BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  diaStarsText:  { fontSize: 11, color: PURPLE, fontWeight: '700' },

  // Items de historial
  histItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width:'100%',
    backgroundColor: '#EDF9EF', padding: 13, borderRadius: 13, marginBottom: 8,
  },
  pictogram: { width: 36, height: 36, marginRight: 10, borderRadius: 6 },
  histTitle: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 3 },
  histTime:  { color: '#888', fontSize: 12, marginBottom: 2 },

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
