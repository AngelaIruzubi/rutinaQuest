import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PixelRatio,
  Platform,
  Pressable,
  SafeAreaView,
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

// ─── Hook Reduce Motion ───────────────────────────────────────────────────────
function useReduceMotion() {
  const [reducida, setReducida] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducida);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducida);
    return () => sub.remove();
  }, []);
  return reducida;
}

// ─── Estrellas ────────────────────────────────────────────────────────────────
function StarRow({ count = 0, size = 14 }: { count: number; size?: number }) {
  return (
    <Text
      style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}
      accessibilityLabel={`${count} de 5 estrellas`}
    >
      {'★'.repeat(count)}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

// ─── Barra animada ────────────────────────────────────────────────────────────
function BarraProgreso({ pct, color }: { pct: number; color: string }) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: reduceMotion ? 0 : 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View
      style={styles.barBg}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      accessibilityLabel={`Progreso: ${Math.round(pct)} por ciento`}
    >
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

  const a11yLabel = earned
    ? `Medalla de ${cfg.label} conseguida`
    : `Medalla de ${cfg.label}, ${progreso} de ${cfg.req} estrellas, faltan ${cfg.req - progreso}`;

  return (
    <View
      style={[
        styles.medalCard,
        earned && { borderColor: cfg.color, borderWidth: 1.5, backgroundColor: cfg.bgEarned },
      ]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <Text style={{ fontSize: 30, opacity: earned ? 1 : 0.25 }} accessibilityElementsHidden importantForAccessibility="no">
        {cfg.emoji}
      </Text>
      <Text style={[styles.medalLabel, { color: earned ? cfg.color : '#CCC' }]} accessibilityElementsHidden importantForAccessibility="no">
        {cfg.label}
      </Text>
      {earned
        ? <Text style={[styles.medalStatus, { color: cfg.color }]} accessibilityElementsHidden importantForAccessibility="no">¡Conseguida!</Text>
        : <Text style={styles.medalPending} accessibilityElementsHidden importantForAccessibility="no">faltan {cfg.req - progreso}</Text>
      }
      <BarraProgreso pct={pct} color={cfg.color} />
      <Text style={styles.medalCount} accessibilityElementsHidden importantForAccessibility="no">
        {progreso}/{cfg.req}
      </Text>
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

function calcularProgresos(estrellas: number) {
  const progresBronce = Math.min(estrellas, 100);
  const progresPlata  = estrellas >= 100 ? Math.min(estrellas - 100, 200) : 0;
  const progresOro    = estrellas >= 300 ? Math.min(estrellas - 300, 300) : 0;
  return { progresBronce, progresPlata, progresOro };
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getUltimos7Dias(): string[] {
  const dias: string[] = [];
  const hoy = ahoraApp();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    dias.push(localDateStr(d));
  }
  return dias;
}

const LETRAS_DIA: Record<number, string> = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };
const NOMBRES_DIA: Record<number, string> = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

// ─── Hero animado del fuego ───────────────────────────────────────────────────
function FireHero({ racha }: { racha: number }) {
  const reduceMotion = useReduceMotion();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const numAnim   = useRef(new Animated.Value(racha)).current;

  useEffect(() => {
    if (reduceMotion) {
      scaleAnim.setValue(1);
      numAnim.setValue(racha);
      return;
    }
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.18, useNativeDriver: true, speed: 10, bounciness: 14 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 14, bounciness: 6 }),
    ]).start();
    Animated.timing(numAnim, { toValue: racha, duration: 700, useNativeDriver: false }).start();
  }, [racha]);

  return (
    <View
      style={styles.fireHeroWrap}
      accessible
      accessibilityLabel={`Racha de ${racha} días seguidos`}
    >
      <Animated.Text
        style={[styles.fireEmoji, { transform: [{ scale: scaleAnim }] }]}
        accessibilityElementsHidden importantForAccessibility="no"
      >
        🔥
      </Animated.Text>
      <AnimatedRachaNum anim={numAnim} />
      <Text style={styles.fireSubLabel} accessibilityElementsHidden importantForAccessibility="no">
        días seguidos
      </Text>
    </View>
  );
}

function AnimatedRachaNum({ anim }: { anim: Animated.Value }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return (
    <Text style={styles.fireNum} accessibilityElementsHidden importantForAccessibility="no">
      {val}
    </Text>
  );
}

// ─── Línea semanal ────────────────────────────────────────────────────────────
function SemanaRacha({ racha }: { racha: number }) {
  const ultimos7   = getUltimos7Dias();
  const rachaActiva = Math.min(racha, 7);

  // Descripción completa para VoiceOver
  const descripcion = ultimos7.map((fecha, idx) => {
    const activo  = idx >= (7 - rachaActiva);
    const esHoy   = idx === 6;
    const [fy, fm, fd] = fecha.split('-').map(Number);
    const letraIdx = new Date(fy, fm - 1, fd).getDay();
    const nombre   = NOMBRES_DIA[letraIdx] ?? '';
    return `${esHoy ? 'Hoy' : nombre}: ${activo ? 'racha activa' : 'sin racha'}`;
  }).join(', ');

  return (
    <View
      style={styles.semanaWrap}
      accessible
      accessibilityLabel={`Últimos 7 días: ${descripcion}`}
    >
      {ultimos7.map((fecha, idx) => {
        const activo = idx >= (7 - rachaActiva);
        const esHoy  = idx === 6;
        const [fy, fm, fd] = fecha.split('-').map(Number);
        const letraIdx = new Date(fy, fm - 1, fd).getDay();
        const letra    = LETRAS_DIA[letraIdx] ?? '?';

        return (
          <View
            key={fecha}
            style={styles.diaCelda}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
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
  const [tab,        setTab]        = useState(0);
  const [completadas, setCompletadas] = useState<any[]>([]);
  const gami   = useGamificacion();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const rows  = getTareas();
      const hechas = rows
        .filter((r: any) => r.completed === 1)
        .map((r: any) => ({ ...r }))
        .reverse();
      setCompletadas(hechas);
      gami.recargar();
    }, [gami.recargar])
  );

  const totalEstrellas = completadas.reduce((acc, t) => acc + (t.stars ?? 5), 0);
  const grupos = agruparPorFecha(completadas.slice(0, 30));
  const { progresBronce, progresPlata, progresOro } = calcularProgresos(gami.estrellas);

  const porFecha: Record<string, number> = {};
  for (const t of completadas) {
    const f = t.fechaCompletada ?? t.fechaDia ?? '';
    if (f) porFecha[f] = (porFecha[f] ?? 0) + (t.stars ?? 5);
  }
  const mejorDiaEntrada = Object.entries(porFecha).sort((a, b) => b[1] - a[1])[0];
  const mejorDia = mejorDiaEntrada ? { fecha: mejorDiaEntrada[0], estrellas: mejorDiaEntrada[1] } : null;

  const aTiempo   = completadas.filter(t => (t.stars ?? 5) === 5).length;
  const tarde     = completadas.filter(t => (t.stars ?? 5) === 3).length;
  const pctTiempo = completadas.length > 0 ? Math.round((aTiempo / completadas.length) * 100) : 0;

  const nextMedal = (() => {
    if (gami.estrellas < 100) return { label: 'Bronce', req: 100, color: '#CD7F32', progreso: progresBronce };
    if (gami.estrellas < 300) return { label: 'Plata',  req: 200, color: '#C0C0C0', progreso: progresPlata  };
    if (gami.estrellas < 600) return { label: 'Oro',    req: 300, color: GOLD,      progreso: progresOro    };
    return null;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <View style={styles.root}>

      <Text style={styles.title} accessibilityRole="header">Progreso</Text>

      <Pressable
        onPress={() => router.replace('/')}
        style={styles.btnInicio}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Ir a Inicio"
      >
        <Ionicons name="home-outline" size={16} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={styles.btnInicioTxt}>Inicio</Text>
      </Pressable>

      {/* ── Pestañas ── */}
      <View
        style={styles.tabRow}
        accessible={false}
        accessibilityRole="tablist"
      >
        {TABS.map((label, i) => (
          <TouchableOpacity
            key={label}
            style={[styles.tabBtn, tab === i && styles.tabBtnActive]}
            onPress={() => setTab(i)}
            activeOpacity={0.7}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: tab === i }}
          >
            <Text style={[styles.tabLabel, tab === i && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══ ESTRELLAS ══ */}
      {tab === 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>

          {/* Total estrellas */}
          <View style={styles.bigStatsRow}>
            <View
              style={styles.bigStat}
              accessible
              accessibilityLabel={`${gami.estrellas ?? 0} estrellas totales`}
            >
              <Text style={styles.bigStatNum} accessibilityElementsHidden importantForAccessibility="no">
                {gami.estrellas ?? 0}
              </Text>
              <Text style={styles.bigStatLabel} accessibilityElementsHidden importantForAccessibility="no">
                ⭐ Estrellas totales
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel} accessibilityRole="header">Estadísticas</Text>

          {/* Mejor día */}
          <View
            style={styles.statCard}
            accessible
            accessibilityLabel={
              mejorDia
                ? `Mejor día: ${mejorDia.fecha}, ${mejorDia.estrellas} estrellas`
                : 'Mejor día: sin datos aún'
            }
          >
            <View style={styles.statCardLeft}>
              <Text style={styles.statCardEmoji} accessibilityElementsHidden importantForAccessibility="no">🏅</Text>
              <View>
                <Text style={styles.statCardTitle} accessibilityElementsHidden importantForAccessibility="no">Mejor día</Text>
                <Text style={styles.statCardSub} accessibilityElementsHidden importantForAccessibility="no">
                  {mejorDia ? mejorDia.fecha : 'Sin datos aún'}
                </Text>
              </View>
            </View>
            <Text style={styles.statCardVal} accessibilityElementsHidden importantForAccessibility="no">
              {mejorDia ? `${mejorDia.estrellas} ⭐` : '—'}
            </Text>
          </View>

          {completadas.length === 0 && (
            <View style={styles.emptyBox} accessible accessibilityLiveRegion="polite">
              <Text style={styles.emptyText}>Completa tareas para ver tus estadísticas</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ══ RACHA ══ */}
      {tab === 1 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>

          <FireHero racha={gami.racha} />

          <Text style={styles.sectionLabel} accessibilityRole="header">Esta semana</Text>
          <View style={styles.semanaCard}>
            <SemanaRacha racha={gami.racha} />
          </View>

          {gami.racha === 0 && (
            <View
              style={styles.rachaVaciaBox}
              accessible
              accessibilityLabel="Sin racha activa. Completa una tarea hoy para empezar tu racha"
            >
              <Text style={styles.rachaVaciaEmoji} accessibilityElementsHidden importantForAccessibility="no">💤</Text>
              <Text style={styles.rachaVaciaText} accessibilityElementsHidden importantForAccessibility="no">
                Completa una tarea hoy{'\n'}para empezar tu racha
              </Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ══ MEDALLAS ══ */}
      {tab === 2 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>

          {nextMedal && (
            <View
              style={[styles.nextBox, { borderColor: nextMedal.color }]}
              accessible
              accessibilityLabel={`Siguiente medalla: ${nextMedal.label}. ${nextMedal.progreso} de ${nextMedal.req} estrellas, faltan ${nextMedal.req - nextMedal.progreso}`}
            >
              <Text style={[styles.nextTitle, { color: nextMedal.color }]} accessibilityElementsHidden importantForAccessibility="no">
                Siguiente: {nextMedal.label}
              </Text>
              <BarraProgreso
                pct={Math.min((nextMedal.progreso / nextMedal.req) * 100, 100)}
                color={nextMedal.color}
              />
              <Text style={styles.nextDetail} accessibilityElementsHidden importantForAccessibility="no">
                {nextMedal.progreso} / {nextMedal.req} ⭐ — faltan {nextMedal.req - nextMedal.progreso}
              </Text>
            </View>
          )}

          <View
            style={styles.medalsRow}
            accessible={false}
            accessibilityLabel="Cuadrícula de medallas"
          >
            <MedalCard type="bronce" progreso={progresBronce} />
            <MedalCard type="plata"  progreso={progresPlata}  />
            <MedalCard type="oro"    progreso={progresOro}    />
          </View>

        </ScrollView>
      )}

    </View>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
// Escala fuentes respetando accesibilidad pero sin romper layout
const fs = (size: number) => {
  const scale = Math.min(PixelRatio.getFontScale(), 1.4);
  return Math.round(size * scale);
};

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingHorizontal: 18 },
  title: { fontSize: fs(30), fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 16 },

  tabRow:       { flexDirection: 'row', backgroundColor: PURPLE_BG, borderRadius: 14, padding: 3, marginBottom: 20 },
  tabBtn:       { flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center', minHeight: 44 },
  tabBtnActive: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: PURPLE_LT },
  tabLabel:     { fontSize: fs(14), color: '#999' },
  tabLabelActive: { color: PURPLE, fontWeight: '600' },

  bigStatsRow: { flexDirection: 'column', gap: 10, marginBottom: 18 },
  bigStat:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: PURPLE_BG, borderRadius: 16, padding: 18, alignItems: 'center', gap: 4 },
  bigStatNum:  { fontSize: fs(26), fontWeight: '700', color: PURPLE, lineHeight: fs(42) },
  bigStatLabel:{ fontSize: fs(14), color: '#888', textAlign: 'center', flexShrink: 1 },

  sectionLabel: { fontSize: fs(11), color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  grupoFecha:   { fontSize: fs(11), color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  histItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EDF9EF', padding: 13, borderRadius: 14, marginBottom: 8 },
  histTitle:    { fontSize: fs(14), color: '#333', fontWeight: '600', marginBottom: 2, flexShrink: 1 },
  histTime:     { color: '#888', fontSize: fs(12) },
  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyText:    { fontSize: fs(15), color: '#AAA', fontWeight: '600', textAlign: 'center' },

  barBg:   { height: 5, backgroundColor: '#EEE', borderRadius: 3, marginTop: 8, width: '100%', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  fireHeroWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 4 },
  fireEmoji:    { fontSize: fs(80), lineHeight: fs(90) },
  fireNum:      { fontSize: fs(72), fontWeight: '800', color: ORANGE, lineHeight: fs(80), letterSpacing: -2 },
  fireSubLabel: { fontSize: fs(16), color: '#888', fontWeight: '500', marginTop: 2 },

  btnInicio:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: PURPLE + '18', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8, minHeight: 44 },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: fs(13) },

  semanaCard: { backgroundColor: ORANGE_BG, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: '#FFE0CC', marginBottom: 4 },
  semanaWrap: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  diaCelda:   { alignItems: 'center', gap: 6 },
  diaDot:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0EAEA', alignItems: 'center', justifyContent: 'center' },
  diaDotActivo: { backgroundColor: ORANGE, shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  diaDotHoy:  { borderWidth: 2, borderColor: ORANGE, backgroundColor: ORANGE_LT },
  diaFire:    { fontSize: fs(20) },
  diaLetra:   { fontSize: fs(12), fontWeight: '700', color: '#BBB' },
  diaNombreLetra: { fontSize: fs(10), color: '#AAA', fontWeight: '500' },

  rachaCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ORANGE_BG, padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFE0CC' },
  rachaCardEmoji: { fontSize: fs(20), width: 30, textAlign: 'center' },
  rachaCardTitle: { fontSize: fs(13), color: '#333', fontWeight: '600', flexShrink: 1 },
  rachaCardSub:   { fontSize: fs(11), color: '#AAA', marginTop: 2 },
  rachaBadge:     { fontSize: fs(13), fontWeight: '700', color: ORANGE, backgroundColor: ORANGE_LT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  rachaVaciaBox:  { alignItems: 'center', paddingVertical: 24, gap: 8, backgroundColor: '#F8F8F8', borderRadius: 16, marginTop: 12 },
  rachaVaciaEmoji:{ fontSize: fs(36) },
  rachaVaciaText: { fontSize: fs(14), color: '#AAA', textAlign: 'center', lineHeight: fs(22) },

  medalsRow:    { flexDirection: 'row', gap: 8, marginBottom: 18 },
  medalCard:    { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: PURPLE_LT, borderRadius: 16, padding: 10, alignItems: 'center' },
  medalLabel:   { fontWeight: '700', fontSize: fs(14), marginTop: 4 },
  medalStatus:  { fontSize: fs(12), fontWeight: '600', marginTop: 2 },
  medalPending: { fontSize: fs(11), color: '#AAA', marginTop: 2, textAlign: 'center' },
  medalCount:   { fontSize: fs(11), color: '#BBB', marginTop: 4 },

  nextBox:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5, flexDirection: 'column', alignItems: 'center', gap: 10 },
  nextTitle:  { fontSize: fs(16), fontWeight: '700', marginBottom: 8 },
  nextDetail: { fontSize: fs(13), color: '#888', marginTop: 6, textAlign: 'center' },

  penalBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF0F0', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#FFCCCC', marginBottom: 14 },
  penalEmoji: { fontSize: fs(28) },
  penalTitle: { fontSize: fs(13), fontWeight: '700', color: '#CC3333', flexShrink: 1 },
  penalSub:   { fontSize: fs(11), color: '#AA4444', marginTop: 2 },
  penalNum:   { fontSize: fs(18), fontWeight: '800', color: '#CC3333' },

  statCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PURPLE_BG, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: PURPLE_LT },
  statCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statCardEmoji: { fontSize: fs(28) },
  statCardTitle: { fontSize: fs(14), fontWeight: '700', color: '#333', flexShrink: 1 },
  statCardSub:   { fontSize: fs(12), color: '#AAA', marginTop: 2 },
  statCardVal:   { fontSize: fs(20), fontWeight: '800', color: PURPLE },
  statCardBadges:{ flexDirection: 'row', gap: 6 },
  statBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statBadgeTxt:  { fontSize: fs(12), fontWeight: '700' },

  tiempoBarWrap:        { marginBottom: 16 },
  tiempoBar:            { height: 10, backgroundColor: '#FFD0A8', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  tiempoBarFill:        { height: '100%', backgroundColor: PURPLE, borderRadius: 6 },
  tiempoBarLabels:      { flexDirection: 'row', justifyContent: 'space-between' },
  tiempoBarLabelVerde:  { fontSize: fs(11), color: PURPLE, fontWeight: '600' },
  tiempoBarLabelNaranja:{ fontSize: fs(11), color: '#E65100', fontWeight: '600' },

  notaBox:  { backgroundColor: PURPLE_BG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: PURPLE_LT },
  notaText: { fontSize: fs(12), color: '#666', lineHeight: fs(19) },
});