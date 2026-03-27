// ─────────────────────────────────────────────────────────────────────────────
// app/(tabs)/historial.tsx  (o screens/Historial.tsx según tu estructura)
// Muestra todas las tareas completadas con sus estrellas
// ─────────────────────────────────────────────────────────────────────────────
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { getTareas } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const GOLD      = '#FFD700';
const ORANGE    = '#FF6B35';

// ─── Estrellas ────────────────────────────────────────────────────────────────
function StarRow({ count = 0, size = 15 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}>
      {'★'.repeat(count)}<Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

// ─── Medalla Card ─────────────────────────────────────────────────────────────
function MedalCard({ type, totalHecho }: { type: 'bronce' | 'plata' | 'oro'; totalHecho: number }) {
  const cfg = {
    bronce: { color: '#CD7F32', emoji: '🥉', label: 'Bronce', req: 50  },
    plata:  { color: '#C0C0C0', emoji: '🥈', label: 'Plata',  req: 200 },
    oro:    { color: '#FFD700', emoji: '🥇', label: 'Oro',    req: 400 },
  }[type];
  const earned = totalHecho >= cfg.req;
  const pct    = Math.min((totalHecho / cfg.req) * 100, 100);
  const faltan = Math.max(0, cfg.req - totalHecho);

  return (
    <View style={[
      styles.medalCard,
      earned && { borderColor: cfg.color, backgroundColor: cfg.color + '15',
        shadowColor: cfg.color, shadowOpacity: .35, shadowRadius: 8, elevation: 5 }
    ]}>
      <Text style={{ fontSize: 32, opacity: earned ? 1 : .25 }}>{cfg.emoji}</Text>
      <Text style={[styles.medalLabel, { color: earned ? cfg.color : '#CCC' }]}>{cfg.label}</Text>
      {earned
        ? <Text style={[styles.medalSub, { color: cfg.color, fontWeight: '700' }]}>¡Conseguida!</Text>
        : <Text style={styles.medalSub}>Faltan {faltan}</Text>
      }
      <View style={styles.medalBarBg}>
        <View style={[styles.medalBarFill, { width: `${pct}%` as any, backgroundColor: cfg.color }]} />
      </View>
      <Text style={styles.medalCount}>{totalHecho}/{cfg.req}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agrupar tareas por fecha
// ─────────────────────────────────────────────────────────────────────────────
function agruparPorFecha(tareas: any[]): { fecha: string; items: any[] }[] {
  const mapa: Record<string, any[]> = {};
  for (const t of tareas) {
    const fecha = t.fechaCompletada ?? 'Hoy';
    if (!mapa[fecha]) mapa[fecha] = [];
    mapa[fecha].push(t);
  }
  return Object.entries(mapa).map(([fecha, items]) => ({ fecha, items }));
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Progreso() {
  const [search,     setSearch]     = useState('');
  const [completadas, setCompletadas] = useState<any[]>([]);
  const gami = useGamificacion();

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

  const grupos = agruparPorFecha(filtradas);

  // Estrella promedio
  const totalEstrellas = completadas.reduce((acc, t) => acc + (t.stars ?? 5), 0);
  const promedioEst    = completadas.length > 0
    ? (totalEstrellas / completadas.length).toFixed(1)
    : '0';

  // Próxima medalla
  const nextMedal = (() => {
    if (gami.totalHecho < 50)  return { label: 'Bronce 🥉', req: 50,  color: '#CD7F32' };
    if (gami.totalHecho < 200) return { label: 'Plata 🥈',  req: 200, color: '#C0C0C0' };
    if (gami.totalHecho < 400) return { label: 'Oro 🥇',    req: 400, color: GOLD      };
    return null;
  })();

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Título ── */}
        <Text style={styles.title}>Tu progreso</Text>

        {/* ── Stats resumen — 3 cajas (como en el Figma) ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{gami.estrellas}</Text>
            <Text style={styles.statLabel}>⭐ Estrellas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{gami.racha}</Text>
            <Text style={styles.statLabel}>🔥 Racha</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{gami.totalHecho}</Text>
            <Text style={styles.statLabel}>✅ Completadas</Text>
          </View>
        </View>

        {/* ── Racha semanal ── */}
        <View style={styles.streakBox}>
          <Text style={[styles.sectionTitle, { color: ORANGE, marginBottom: 10 }]}>🔥 Racha de días</Text>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {['L','M','X','J','V','S','D'].map((d, i) => (
              <View key={d} style={[styles.dayDot, i < gami.racha && { backgroundColor: ORANGE }]}>
                <Text style={{ fontSize: 9, color: i < gami.racha ? 'white' : '#BBB', fontWeight: '700' }}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Medallas ── */}
        <Text style={styles.sectionTitle}>🏅 Medallas</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <MedalCard type="bronce" totalHecho={gami.totalHecho} />
          <MedalCard type="plata"  totalHecho={gami.totalHecho} />
          <MedalCard type="oro"    totalHecho={gami.totalHecho} />
        </View>

        {/* ── Siguiente medalla con barra ── */}
        {nextMedal && (
          <View style={[styles.nextBox, { borderColor: nextMedal.color }]}>
            <Text style={[styles.sectionTitle, { color: nextMedal.color, marginBottom: 8 }]}>
              Siguiente: {nextMedal.label}
            </Text>
            <View style={{ height: 12, backgroundColor: '#EEE', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{
                height: 12, borderRadius: 6,
                backgroundColor: nextMedal.color,
                width: `${Math.min((gami.totalHecho / nextMedal.req) * 100, 100)}%`,
              }} />
            </View>
            <Text style={styles.nextText}>
              {gami.totalHecho} / {nextMedal.req} tareas — faltan {nextMedal.req - gami.totalHecho}
            </Text>
          </View>
        )}

        {/* ── Normas del juego ── */}
        <Text style={styles.sectionTitle}>📖 Normas del juego</Text>
        <View style={styles.rulesBox}>
          {[
            { icon: '⭐', text: 'Tarea con hora, completada antes → +5 estrellas' },
            { icon: '🌟', text: 'Tarea con hora, completada después → +3 estrellas' },
            { icon: '✨', text: 'Tarea sin hora → siempre +5 estrellas' },
            { icon: '❌', text: 'Sin completar ninguna tarea en el día → -10 estrellas' },
            { icon: '🔥', text: 'La racha sube si completas tareas días seguidos' },
            { icon: '🥉', text: 'Medalla Bronce: 50 tareas completadas' },
            { icon: '🥈', text: 'Medalla Plata: 200 tareas completadas' },
            { icon: '🥇', text: 'Medalla Oro: 400 tareas completadas' },
          ].map(({ icon, text }, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleIcon}>{icon}</Text>
              <Text style={styles.ruleText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── Historial de tareas completadas ── */}
        <Text style={styles.sectionTitle}>📋 Historial</Text>

        <View style={styles.searchBar}>
          <TextInput
            placeholder="Buscar en historial..."
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 15 }}
          />
          <Ionicons name="search" size={18} color="#999" />
        </View>

        {completadas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aún no has completado ninguna tarea</Text>
            <Text style={styles.emptySubText}>¡Completa tareas para verlas aquí!</Text>
          </View>
        ) : filtradas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin resultados para "{search}"</Text>
          </View>
        ) : (
          grupos.map(({ fecha, items }) => (
            <View key={fecha}>
              <Text style={styles.grupoFecha}>{fecha}</Text>
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
                    <Text style={{ fontSize: 10, color: GREEN, fontWeight: '700' }}>✓</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  title: { fontSize: 30, fontWeight: '600', color: PURPLE, textAlign: 'center', marginBottom: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: PURPLE_BG,
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: PURPLE_LT,
    shadowColor: PURPLE, shadowOpacity: .08, shadowRadius: 4, elevation: 2,
  },
  statNum:   { fontSize: 28, fontWeight: '800', color: PURPLE },
  statLabel: { fontSize: 10, color: '#888', marginTop: 3, textAlign: 'center' },

  // Racha
  streakBox: {
    backgroundColor: '#FFF7F0', borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FFE0CC', alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#555', marginBottom: 10 },
  dayDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },

  // Medallas
  medalCard: {
    flex: 1, backgroundColor: 'white',
    borderWidth: 2, borderColor: PURPLE_LT,
    borderRadius: 16, padding: 12, alignItems: 'center',
  },
  medalLabel:   { fontWeight: '700', fontSize: 12, marginTop: 4 },
  medalSub:     { fontSize: 10, color: '#AAA', marginTop: 2, textAlign: 'center' },
  medalBarBg:   { backgroundColor: '#EEE', borderRadius: 4, height: 6, marginTop: 8, width: '100%', overflow: 'hidden' },
  medalBarFill: { height: '100%', borderRadius: 4 },
  medalCount:   { fontSize: 9, color: '#BBB', marginTop: 4 },

  // Siguiente medalla
  nextBox:  { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5 },
  nextText: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' },

  // Normas
  rulesBox: { backgroundColor: PURPLE_BG, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: PURPLE_LT },
  ruleRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  ruleIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  ruleText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },

  // Búsqueda
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f2f2', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, marginBottom: 16,
  },

  // Empty
  emptyBox:    { alignItems: 'center', paddingVertical: 30 },
  emptyText:   { fontSize: 16, color: '#AAA', fontWeight: '600', textAlign: 'center' },
  emptySubText:{ fontSize: 13, color: '#CCC', marginTop: 6 },

  // Historial
  grupoFecha: { fontSize: 12, color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  histItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EDF9EF', padding: 14, borderRadius: 14, marginBottom: 10,
  },
  pictogram: { width: 38, height: 38, marginRight: 10, borderRadius: 6 },
  histTitle: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 3 },
  histTime:  { color: '#888', fontSize: 12, marginBottom: 2 },
});
