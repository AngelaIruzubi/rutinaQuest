import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTareas } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';
import { ahoraApp } from '../../utils/fecha';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GOLD      = '#FFD700';
const ORANGE    = '#FF6B35';
const ORANGE_LT = '#FFF2EC';
const ORANGE_BG = '#FFF7F0';

// ─── Estrellas ────────────────────────────────────────────────────────────────
function StarRow({ count = 0, size = 14 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}>
      {'★'.repeat(count)}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

// ─── Barra animada ────────────────────────────────────────────────────────────
function BarraProgreso({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct / 100, duration: 700, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={styles.barBg}>
      <Animated.View style={[styles.barFill, {
        backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}

// ─── Medalla Card ─────────────────────────────────────────────────────────────
function MedalCard({ type, progreso }: { type: 'bronce' | 'plata' | 'oro'; progreso: number }) {
  const cfg = {
    bronce: { color: '#CD7F32', bgEarned: '#FDF5EC', emoji: '🥉', label: 'Bronce', req: 100 },
    plata:  { color: '#C0C0C0', bgEarned: '#F5F5F5', emoji: '🥈', label: 'Plata',  req: 200 },
    oro:    { color: '#FFD700', bgEarned: '#FFFBE6', emoji: '🥇', label: 'Oro',    req: 300 },
  }[type];

  const earned = progreso >= cfg.req;
  const pct    = Math.min((progreso / cfg.req) * 100, 100);

  return (
    <View style={[
      styles.medalCard,
      earned && { borderColor: cfg.color, borderWidth: 1.5, backgroundColor: cfg.bgEarned },
    ]}>
      <Text style={{ fontSize: 30, opacity: earned ? 1 : 0.25 }}>{cfg.emoji}</Text>
      <Text style={[styles.medalLabel, { color: earned ? cfg.color : '#CCC' }]}>{cfg.label}</Text>
      {earned
        ? <Text style={[styles.medalStatus, { color: cfg.color }]}>¡Conseguida!</Text>
        : <Text style={styles.medalPending}>faltan {cfg.req - progreso}</Text>
      }
      <BarraProgreso pct={pct} color={cfg.color} />
      <Text style={styles.medalCount}>{progreso}/{cfg.req}</Text>
    </View>
  );
}

// ─── Grupos por fecha ─────────────────────────────────────────────────────────
function agruparPorFecha(tareas: any[]): { fecha: string; items: any[] }[] {
  const mapa: Record<string, any[]> = {};
  for (const t of tareas) {
    const fecha = t.fechaCompletada ?? 'Hoy';
    if (!mapa[fecha]) mapa[fecha] = [];
    mapa[fecha].push(t);
  }
  return Object.entries(mapa).map(([fecha, items]) => ({ fecha, items }));
}

// ─── Progreso por medalla (basado en estrellas totales) ──────────────────────
// Bronce: 100⭐  |  Plata: 300⭐  |  Oro: 600⭐
function calcularProgresos(estrellas: number) {
  const progresBronce = Math.min(estrellas, 100);
  const progresPlata  = estrellas >= 100 ? Math.min(estrellas - 100, 200) : 0;
  const progresOro    = estrellas >= 300 ? Math.min(estrellas - 300, 300) : 0;
  return { progresBronce, progresPlata, progresOro };
}

// ─── Obtener los últimos 7 días en formato YYYY-MM-DD (hora local, sin UTC) ───
function localDateStr(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function getUltimos7Dias(): string[] {
  const dias: string[] = [];
  const hoy = ahoraApp(); // usa fecha simulada si está activa
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    dias.push(localDateStr(d));
  }
  return dias;
}

// ─── Letra del día de la semana (getDay local: 0=Dom) ────────────────────────
const LETRAS_DIA: Record<number, string> = {
  0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S',
};

// ─── Hero animado del fuego ───────────────────────────────────────────────────
function FireHero({ racha }: { racha: number }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const numAnim   = useRef(new Animated.Value(racha)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.18, useNativeDriver: true, speed: 10, bounciness: 14 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 14, bounciness: 6  }),
    ]).start();
    Animated.timing(numAnim, { toValue: racha, duration: 700, useNativeDriver: false }).start();
  }, [racha]);

  return (
    <View style={styles.fireHeroWrap}>
      <Animated.Text style={[styles.fireEmoji, { transform: [{ scale: scaleAnim }] }]}>
        🔥
      </Animated.Text>
      <AnimatedRachaNum anim={numAnim} />
      <Text style={styles.fireSubLabel}>días seguidos</Text>
    </View>
  );
}

function AnimatedRachaNum({ anim }: { anim: Animated.Value }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return <Text style={styles.fireNum}>{val}</Text>;
}

// ─── Línea semanal de días ────────────────────────────────────────────────────
// Marca los últimos `racha` días consecutivos desde hoy, igual que la notif
function SemanaRacha({ racha }: { racha: number }) {
  const ultimos7 = getUltimos7Dias(); // [hace6días, ..., ayer, hoy]
  const rachaActiva = Math.min(racha, 7);

  return (
    <View style={styles.semanaWrap}>
      {ultimos7.map((fecha, idx) => {
        // Los últimos `rachaActiva` días desde el final están activos
        const activo = idx >= (7 - rachaActiva);
        const esHoy  = idx === 6;
        const [fy, fm, fd] = fecha.split('-').map(Number);
        const letraIdx = new Date(fy, fm - 1, fd).getDay();
        const letra    = LETRAS_DIA[letraIdx] ?? '?';

        return (
          <View key={fecha} style={styles.diaCelda}>
            <View style={[
              styles.diaDot,
              activo && styles.diaDotActivo,
              esHoy && !activo && styles.diaDotHoy,
            ]}>
              {activo
                ? <Text style={styles.diaFire}>🔥</Text>
                : <Text style={[styles.diaLetra, esHoy && { color: ORANGE }]}>{letra}</Text>
              }
            </View>
            <Text style={[styles.diaNombreLetra, esHoy && { color: ORANGE, fontWeight: '700' }]}>
              {esHoy ? 'Hoy' : letra}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const TABS = ['Estrellas', 'Racha', 'Medallas'];

export default function Progreso() {
  const [tab, setTab]             = useState(0);
  const [completadas, setCompletadas] = useState<any[]>([]);
  const gami = useGamificacion();

  useFocusEffect(
    useCallback(() => {
      const rows = getTareas();
      const hechas = rows
        .filter((r: any) => r.completed === 1)
        .map((r: any) => ({ ...r }))
        .reverse();
      setCompletadas(hechas);
    }, [])
  );

  const totalEstrellas = completadas.reduce((acc, t) => acc + (t.stars ?? 5), 0);
  const grupos = agruparPorFecha(completadas.slice(0, 30));
  const { progresBronce, progresPlata, progresOro } = calcularProgresos(gami.estrellas);

  // ── Estadísticas calculadas desde la BD ──────────────────────────────────
  // Mejor día: fecha con más estrellas ganadas
  const porFecha: Record<string, number> = {};
  for (const t of completadas) {
    const f = t.fechaCompletada ?? t.fechaDia ?? '';
    if (f) porFecha[f] = (porFecha[f] ?? 0) + (t.stars ?? 5);
  }
  const mejorDiaEntrada = Object.entries(porFecha).sort((a, b) => b[1] - a[1])[0];
  const mejorDia        = mejorDiaEntrada ? { fecha: mejorDiaEntrada[0], estrellas: mejorDiaEntrada[1] } : null;

  // A tiempo (5⭐) vs tarde (3⭐)
  const aTiempo = completadas.filter(t => (t.stars ?? 5) === 5).length;
  const tarde   = completadas.filter(t => (t.stars ?? 5) === 3).length;
  const pctTiempo = completadas.length > 0 ? Math.round((aTiempo / completadas.length) * 100) : 0;

  const nextMedal = (() => {
    if (gami.estrellas < 100) return { label: 'Bronce 🥉', req: 100, color: '#CD7F32', progreso: progresBronce };
    if (gami.estrellas < 300) return { label: 'Plata 🥈',  req: 200, color: '#C0C0C0', progreso: progresPlata  };
    if (gami.estrellas < 600) return { label: 'Oro 🥇',    req: 300, color: GOLD,      progreso: progresOro    };
    return null;
  })();

  return (
    <View style={styles.root}>

      <Text style={styles.title}>Tu progreso</Text>

      {/* ── Pestañas ── */}
      <View style={styles.tabRow}>
        {TABS.map((label, i) => (
          <TouchableOpacity
            key={label}
            style={[styles.tabBtn, tab === i && styles.tabBtnActive]}
            onPress={() => setTab(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, tab === i && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══ ESTRELLAS ══ */}
      {tab === 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Total estrellas */}
          <View style={styles.bigStatsRow}>
            <View style={styles.bigStat}>
              <Text style={styles.bigStatNum}>{gami.estrellas ?? 0}</Text>
              <Text style={styles.bigStatLabel}>⭐ Estrellas totales</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Estadísticas</Text>

          {/* Mejor día */}
          <View style={styles.statCard}>
            <View style={styles.statCardLeft}>
              <Text style={styles.statCardEmoji}>🏅</Text>
              <View>
                <Text style={styles.statCardTitle}>Mejor día</Text>
                <Text style={styles.statCardSub}>
                  {mejorDia ? mejorDia.fecha : 'Sin datos aún'}
                </Text>
              </View>
            </View>
            <Text style={styles.statCardVal}>
              {mejorDia ? `${mejorDia.estrellas} ⭐` : '—'}
            </Text>
          </View>

          {/* A tiempo vs tarde */}
          <View style={styles.statCard}>
            <View style={styles.statCardLeft}>
              <Text style={styles.statCardEmoji}>⏱️</Text>
              <View>
                <Text style={styles.statCardTitle}>A tiempo vs tarde</Text>
                <Text style={styles.statCardSub}>{pctTiempo}% completadas a tiempo</Text>
              </View>
            </View>
            <View style={styles.statCardBadges}>
              <View style={[styles.statBadge, { backgroundColor: '#E8F8E8' }]}>
                <Text style={[styles.statBadgeTxt, { color: '#2E7D32' }]}>✓ {aTiempo}</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.statBadgeTxt, { color: '#E65100' }]}>⏰ {tarde}</Text>
              </View>
            </View>
          </View>

          {/* Barra a tiempo */}
          {completadas.length > 0 && (
            <View style={styles.tiempoBarWrap}>
              <View style={styles.tiempoBar}>
                <View style={[styles.tiempoBarFill, { width: `${pctTiempo}%` }]} />
              </View>
              <View style={styles.tiempoBarLabels}>
                <Text style={styles.tiempoBarLabelVerde}>A tiempo {pctTiempo}%</Text>
                <Text style={styles.tiempoBarLabelNaranja}>Tarde {100 - pctTiempo}%</Text>
              </View>
            </View>
          )}

          {completadas.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Completa tareas para ver tus estadísticas</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ══ RACHA ══ */}
      {tab === 1 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Hero: fuego grande + número animado */}
          <FireHero racha={gami.racha} />

          {/* Línea semanal */}
          <Text style={styles.sectionLabel}>Esta semana</Text>
          <View style={styles.semanaCard}>
            <SemanaRacha racha={gami.racha} />
          </View>

         
          {gami.racha === 0 && (
            <View style={styles.rachaVaciaBox}>
              <Text style={styles.rachaVaciaEmoji}>💤</Text>
              <Text style={styles.rachaVaciaText}>Completa una tarea hoy{'\n'}para empezar tu racha</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ══ MEDALLAS ══ */}
      {tab === 2 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
           {nextMedal && (
            <View style={[styles.nextBox, { borderColor: nextMedal.color }]}>
              <Text style={[styles.nextTitle, { color: nextMedal.color }]}>
                Siguiente: {nextMedal.label}
              </Text>
              <BarraProgreso
                pct={Math.min((nextMedal.progreso / nextMedal.req) * 100, 100)}
                color={nextMedal.color}
              />
              <Text style={styles.nextDetail}>
                {nextMedal.progreso} / {nextMedal.req} ⭐ — faltan {nextMedal.req - nextMedal.progreso}
              </Text>
            </View>
          )}

          <View style={styles.medalsRow}>
            <MedalCard type="bronce" progreso={progresBronce} />
            <MedalCard type="plata"  progreso={progresPlata}  />
            <MedalCard type="oro"    progreso={progresOro}    />
          </View>

         
        </ScrollView>
      )}

    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 18,
  },
  title: { fontSize: 30, fontWeight: '600', color: PURPLE, textAlign: 'center', marginBottom: 16 },

  tabRow: { flexDirection: 'row', backgroundColor: PURPLE_BG, borderRadius: 14, padding: 3, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: PURPLE_LT },
  tabLabel: { fontSize: 20, color: '#999' },
  tabLabelActive: { color: PURPLE, fontWeight: '600' },

  bigStatsRow: { flexDirection: 'column', gap: 10, marginBottom: 18 },
  bigStat: { flexDirection: 'row', justifyContent: 'space-between',backgroundColor: PURPLE_BG, borderRadius: 16, padding: 18, alignItems: 'center', gap: 4 },
  bigStatNum: { fontSize: 30, fontWeight: '700', color: PURPLE, lineHeight: 42 },
  bigStatLabel: { fontSize: 26, color: '#888', textAlign: 'center' },

  sectionLabel: { fontSize: 11, color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },

  grupoFecha: { fontSize: 11, color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  histItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EDF9EF', padding: 13, borderRadius: 14, marginBottom: 8 },
  histTitle: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 2 },
  histTime:  { color: '#888', fontSize: 12 },
  emptyBox:  { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 15, color: '#AAA', fontWeight: '600', textAlign: 'center' },

  barBg: { height: 5, backgroundColor: '#EEE', borderRadius: 3, marginTop: 8, width: '100%', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  // ── Hero fuego ──────────────────────────────────────────────────────────────
  fireHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  fireEmoji: {
    fontSize: 80,
    lineHeight: 90,
  },
  fireNum: {
    fontSize: 72,
    fontWeight: '800',
    color: ORANGE,
    lineHeight: 80,
    letterSpacing: -2,
  },
  fireSubLabel: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Línea semanal ────────────────────────────────────────────────────────────
  semanaCard: {
    backgroundColor: ORANGE_BG,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    marginBottom: 4,
  },
  semanaWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  diaCelda: {
    alignItems: 'center',
    gap: 6,
  },
  diaDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0EAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaDotActivo: {
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  diaDotHoy: {
    borderWidth: 2,
    borderColor: ORANGE,
    backgroundColor: ORANGE_LT,
  },
  diaFire: {
    fontSize: 20,
  },
  diaLetra: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BBB',
  },
  diaNombreLetra: {
    fontSize: 10,
    color: '#AAA',
    fontWeight: '500',
  },

  // ── Tarjetas estadísticas ────────────────────────────────────────────────────
  rachaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ORANGE_BG, padding: 14, borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#FFE0CC',
  },
  rachaCardEmoji: { fontSize: 20, width: 30, textAlign: 'center' },
  rachaCardTitle: { fontSize: 13, color: '#333', fontWeight: '600' },
  rachaCardSub:   { fontSize: 11, color: '#AAA', marginTop: 2 },
  rachaBadge: {
    fontSize: 13, fontWeight: '700', color: ORANGE,
    backgroundColor: ORANGE_LT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },

  rachaVaciaBox: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    backgroundColor: '#F8F8F8', borderRadius: 16, marginTop: 12,
  },
  rachaVaciaEmoji: { fontSize: 36 },
  rachaVaciaText:  { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 22 },

  // ── Medallas ─────────────────────────────────────────────────────────────────
  medalsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  medalCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: PURPLE_LT, borderRadius: 16, padding: 10, alignItems: 'center' },
  medalLabel: { fontWeight: '700', fontSize: 20, marginTop: 4 },
  medalStatus: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  medalPending: { fontSize: 15, color: '#AAA', marginTop: 2, textAlign: 'center' },
  medalCount: { fontSize: 15, color: '#BBB', marginTop: 4 },

  nextBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5,flexDirection: 'column', alignItems: 'center', gap: 10 },
  nextTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  nextDetail: { fontSize: 15, color: '#888', marginTop: 6, textAlign: 'center' },

  // ── Penalización ─────────────────────────────────────────────────────────────
  penalBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF0F0', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FFCCCC', marginBottom: 14,
  },
  penalEmoji:  { fontSize: 28 },
  penalTitle:  { fontSize: 13, fontWeight: '700', color: '#CC3333' },
  penalSub:    { fontSize: 11, color: '#AA4444', marginTop: 2 },
  penalNum:    { fontSize: 18, fontWeight: '800', color: '#CC3333' },


  // ── Estadísticas estrellas ───────────────────────────────────────────────────
  statCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PURPLE_BG, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: PURPLE_LT,
  },
  statCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statCardEmoji: { fontSize: 28 },
  statCardTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  statCardSub:   { fontSize: 11, color: '#AAA', marginTop: 2 },
  statCardVal:   { fontSize: 18, fontWeight: '800', color: PURPLE },
  statCardBadges:{ flexDirection: 'row', gap: 6 },
  statBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statBadgeTxt:  { fontSize: 13, fontWeight: '700' },

  tiempoBarWrap:       { marginBottom: 16 },
  tiempoBar:           { height: 10, backgroundColor: '#FFD0A8', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  tiempoBarFill:       { height: '100%', backgroundColor: PURPLE, borderRadius: 6 },
  tiempoBarLabels:     { flexDirection: 'row', justifyContent: 'space-between' },
  tiempoBarLabelVerde:  { fontSize: 11, color: PURPLE, fontWeight: '600' },
  tiempoBarLabelNaranja:{ fontSize: 11, color: '#E65100', fontWeight: '600' },

  notaBox: { backgroundColor: PURPLE_BG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: PURPLE_LT },
  notaText: { fontSize: 12, color: '#666', lineHeight: 19 },
});