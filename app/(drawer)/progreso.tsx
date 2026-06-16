import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { BarraProgreso } from '../../components/ui/BarraProgreso';
import { useAjustesCtx } from '../../context/AjustesContext';
import { getTareas } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { Tarea } from '../../types/tarea';
import { ahoraApp } from '../../utils/fecha';
import { toLocalDateStr } from '../../utils/fechaFormato';
import { calcularProgresos } from '../../utils/gamificacion';

// ─── Colores ──────────────────────────────────────────────────────────────────
const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GOLD      = '#FFD700';
const ORANGE    = '#FF6B35';
const ORANGE_LT = '#FFF2EC';
const ORANGE_BG = '#FFF7F0';

const fs = (size: number) => Math.round(size * Math.min(PixelRatio.getFontScale(), 1.4)); // módulo-level fallback

// ─── Helpers fecha ────────────────────────────────────────────────────────────
function getUltimos7Dias(): string[] {
  const dias: string[] = [];
  const hoy = ahoraApp();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    dias.push(toLocalDateStr(d));
  }
  return dias;
}

const LETRAS_DIA: Record<number, string>  = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };
const NOMBRES_DIA: Record<number, string> = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

// ─── AnimatedRachaNum ─────────────────────────────────────────────────────────
function AnimatedRachaNum({ anim }: { anim: Animated.Value }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return (
    <Text style={s.fireNum} accessibilityElementsHidden importantForAccessibility="no">
      {val}
    </Text>
  );
}

// ─── FireHero — estilo Duolingo ───────────────────────────────────────────────
function FireHero({ racha }: { racha: number }) {
  const reduceMotion = useReduceMotion();
  const { escala, colores } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala); // override con escala de ajustes
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const numAnim     = useRef(new Animated.Value(0)).current;
  const pulseLoop   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      numAnim.setValue(racha);
      return;
    }

    scaleAnim.setValue(0.6);
    opacityAnim.setValue(0);
    numAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 18 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(numAnim,     { toValue: racha, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    // Pulso continuo si hay racha
    if (racha > 0) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => pulseLoop.current?.stop();
  }, [racha]);

  return (
    <Animated.View
      style={[s.fireHeroWrap, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
      accessible
      accessibilityLabel={racha > 0 ? `Racha de ${racha} días seguidos` : 'Sin racha activa'}
    >
      {/* Glow detrás del fuego */}
      {racha > 0 && (
        <Animated.View style={[s.fireGlow, { transform: [{ scale: pulseAnim }] }]} />
      )}

      <Animated.Text
        style={[s.fireEmoji, racha > 0 && { transform: [{ scale: pulseAnim }] }]}
        accessibilityElementsHidden importantForAccessibility="no"
      >
        {racha > 0 ? '🔥' : '💤'}
      </Animated.Text>

      <AnimatedRachaNum anim={numAnim} />

      <Text style={s.fireSubLabel} accessibilityElementsHidden importantForAccessibility="no">
        {racha === 1 ? 'día seguido' : 'días seguidos'}
      </Text>

      {racha > 0 && (
        <View style={s.rachaBadge}>
          <Text style={s.rachaBadgeTxt}>🔥 ¡Sigue así!</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── SemanaRacha — entrada escalonada estilo Duolingo ────────────────────────
function SemanaRacha({ racha }: { racha: number }) {
  const reduceMotion = useReduceMotion();
  const ultimos7    = getUltimos7Dias();
  const rachaActiva = Math.min(racha, 7);
  const anims       = useRef(ultimos7.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduceMotion) {
      anims.forEach(a => a.setValue(1));
      return;
    }
    // Entrada escalonada — cada día aparece 70ms después del anterior
    anims.forEach((anim, i) => {
      anim.setValue(0);
      setTimeout(() => {
        Animated.spring(anim, {
          toValue:    1,
          useNativeDriver: true,
          speed:      14,
          bounciness: 14,
        }).start();
      }, i * 70);
    });
  }, [racha]);

  const descripcion = ultimos7.map((fecha, idx) => {
    const activo   = idx >= (7 - rachaActiva);
    const esHoy    = idx === 6;
    const [fy, fm, fd] = fecha.split('-').map(Number);
    const nombre   = NOMBRES_DIA[new Date(fy, fm - 1, fd).getDay()] ?? '';
    return `${esHoy ? 'Hoy' : nombre}: ${activo ? 'racha activa' : 'sin racha'}`;
  }).join(', ');

  return (
    <View
      style={s.semanaWrap}
      accessible
      accessibilityLabel={`Últimos 7 días: ${descripcion}`}
    >
      {ultimos7.map((fecha, idx) => {
        const activo   = idx >= (7 - rachaActiva);
        const esHoy    = idx === 6;
        const [fy, fm, fd] = fecha.split('-').map(Number);
        const letra    = LETRAS_DIA[new Date(fy, fm - 1, fd).getDay()] ?? '?';

        return (
          <Animated.View
            key={fecha}
            style={[
              s.diaCelda,
              {
                opacity:   anims[idx],
                transform: [{
                  translateY: anims[idx].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                }, {
                  scale: anims[idx].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                }],
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <View style={[
              s.diaDot,
              activo        && s.diaDotActivo,
              esHoy && !activo && s.diaDotHoy,
            ]}>
              {activo
                ? <Text style={s.diaFire}>🔥</Text>
                : <Text style={[s.diaLetra, esHoy && { color: ORANGE }]}>{letra}</Text>
              }
            </View>
            <Text style={[s.diaNombreLetra, esHoy && { color: ORANGE, fontWeight: '700' }]}>
              {esHoy ? 'Hoy' : letra}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── MedalCard — diseño horizontal más claro ─────────────────────────────────
function MedalCard({ type, progreso }: { type: 'bronce' | 'plata' | 'oro'; progreso: number }) {
  const reduceMotion = useReduceMotion();
  const glowAnim    = useRef(new Animated.Value(0)).current;

  const cfg = {
    bronce: { color: '#CD7F32', bg: '#FDF5EC', bgPending: '#FAFAFA', border: '#E8C99A', borderPending: '#EEE', emoji: '🥉', label: 'Bronce', req: 100 },
    plata:  { color: '#9E9E9E', bg: '#F5F5F5', bgPending: '#FAFAFA', border: '#D0D0D0', borderPending: '#EEE', emoji: '🥈', label: 'Plata',  req: 200 },
    oro:    { color: '#D4A017', bg: '#FFFBE6', bgPending: '#FAFAFA', border: '#F0D060', borderPending: '#EEE', emoji: '🥇', label: 'Oro',    req: 300 },
  }[type];

  const earned = progreso >= cfg.req;
  const pct    = Math.min((progreso / cfg.req) * 100, 100);

  useEffect(() => {
    if (earned && !reduceMotion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    }
  }, [earned]);

  const a11yLabel = earned
    ? `Medalla de ${cfg.label} conseguida`
    : `Medalla de ${cfg.label}, ${progreso} de ${cfg.req} estrellas, faltan ${cfg.req - progreso}`;

  return (
    <View
      style={[
        s.medalCard,
        earned
          ? { backgroundColor: cfg.bg, borderColor: cfg.color, borderWidth: 2 }
          : { backgroundColor: cfg.bgPending, borderColor: cfg.borderPending, borderWidth: 1.5 },
      ]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      {/* Brillo animado cuando está conseguida */}
      {earned && (
        <Animated.View style={[
          s.medalGlow,
          { backgroundColor: cfg.color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] }) },
        ]} />
      )}

      {/* Columna izquierda: emoji */}
      <Text style={[s.medalEmoji, { opacity: earned ? 1 : 0.25 }]} accessibilityElementsHidden importantForAccessibility="no">
        {cfg.emoji}
      </Text>

      {/* Columna central: info */}
      <View style={s.medalInfo}>
        <Text style={[s.medalLabel, { color: earned ? cfg.color : '#CCC' }]} accessibilityElementsHidden importantForAccessibility="no">
          {cfg.label}
        </Text>

        {earned ? (
          <View style={[s.medalBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
            <Text style={[s.medalBadgeTxt, { color: cfg.color }]}>✓ Conseguida</Text>
          </View>
        ) : (
          <Text style={s.medalPending} accessibilityElementsHidden importantForAccessibility="no">
            faltan {cfg.req - progreso} ⭐
          </Text>
        )}

        {/* Barra de progreso */}
        <View style={{ marginTop: 8 }}>
          <BarraProgreso pct={pct} color={earned ? cfg.color : '#DDD'} />
        </View>

        <Text style={[s.medalCount, { color: earned ? cfg.color : '#BBB' }]} accessibilityElementsHidden importantForAccessibility="no">
          {progreso} / {cfg.req} ⭐
        </Text>
      </View>
    </View>
  );
}

// ─── Progreso ─────────────────────────────────────────────────────────────────
const TABS = ['Estrellas', 'Racha', 'Medallas'];

export default function Progreso() {
  const [tab,         setTab]         = useState(0);
  const [completadas, setCompletadas] = useState<Tarea[]>([]);
  const gami   = useGamificacion();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const rows = getTareas() as any[];
      const hechas: Tarea[] = rows
        .filter(r => r.completed === 1)
        .map(r => ({ ...r, completed: true }))
        .reverse();
      setCompletadas(hechas);
      gami.recargar();
    }, [gami.recargar])
  );

  const { progresBronce, progresPlata, progresOro } = calcularProgresos(gami.estrellas);

  const porFecha: Record<string, number> = {};
  for (const t of completadas) {
    const f = t.fechaCompletada ?? t.fechaDia ?? '';
    if (f) porFecha[f] = (porFecha[f] ?? 0) + (t.stars ?? 5);
  }
  const mejorDiaEntrada = Object.entries(porFecha).sort((a, b) => b[1] - a[1])[0];
  const mejorDia        = mejorDiaEntrada ? { fecha: mejorDiaEntrada[0], estrellas: mejorDiaEntrada[1] } : null;

  const nextMedal = (() => {
    if (gami.estrellas < 100) return { label: 'Bronce 🥉', req: 100, color: '#CD7F32', progreso: progresBronce };
    if (gami.estrellas < 300) return { label: 'Plata 🥈',  req: 200, color: '#9E9E9E', progreso: progresPlata  };
    if (gami.estrellas < 600) return { label: 'Oro 🥇',    req: 300, color: '#D4A017', progreso: progresOro    };
    return null;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.root}>

        <Text style={[s.title]} accessibilityRole="header">Progreso</Text>

        <Pressable onPress={() => router.replace('/')} style={s.btnInicio} accessible accessibilityRole="button" accessibilityLabel="Ir a Inicio">
          <Ionicons name="home-outline" size={16} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={s.btnInicioTxt}>Inicio</Text>
        </Pressable>

        {/* ── Pestañas ── */}
        <View style={s.tabRow} accessible={false} accessibilityRole="tablist">
          {TABS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[s.tabBtn, tab === i && s.tabBtnActive]}
              onPress={() => setTab(i)}
              activeOpacity={0.7}
              accessible accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: tab === i }}
            >
              <Text style={[s.tabLabel, tab === i && s.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══ ESTRELLAS ══ */}
        {tab === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>
            <View style={s.bigStatsRow}>
              <View style={s.bigStat} accessible accessibilityLabel={`${gami.estrellas ?? 0} estrellas totales`}>
                <Text style={[s.bigStatNum]} accessibilityElementsHidden importantForAccessibility="no">{gami.estrellas ?? 0}</Text>
                <Text style={[s.bigStatLabel]} accessibilityElementsHidden importantForAccessibility="no">⭐ Estrellas totales</Text>
              </View>
            </View>

            <Text style={[s.sectionLabel]} accessibilityRole="header">Estadísticas</Text>

            <View style={s.statCard} accessible accessibilityLabel={mejorDia ? `Mejor día: ${mejorDia.fecha}, ${mejorDia.estrellas} estrellas` : 'Mejor día: sin datos aún'}>
              <View style={s.statCardLeft}>
                <Text style={s.statCardEmoji} accessibilityElementsHidden importantForAccessibility="no">🏅</Text>
                <View>
                  <Text style={[s.statCardTitle]} accessibilityElementsHidden importantForAccessibility="no">Mejor día</Text>
                  <Text style={[s.statCardSub]} accessibilityElementsHidden importantForAccessibility="no">{mejorDia ? mejorDia.fecha : 'Sin datos aún'}</Text>
                </View>
              </View>
              <Text style={[s.statCardVal]} accessibilityElementsHidden importantForAccessibility="no">{mejorDia ? `${mejorDia.estrellas} ⭐` : '—'}</Text>
            </View>

            {completadas.length === 0 && (
              <View style={s.emptyBox} accessible accessibilityLiveRegion="polite">
                <Text style={[s.emptyText]}>Completa tareas para ver tus estadísticas</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ══ RACHA ══ */}
        {tab === 1 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>
            <FireHero racha={gami.racha} />

            <Text style={[s.sectionLabel]} accessibilityRole="header">Esta semana</Text>
            <View style={s.semanaCard}>
              <SemanaRacha racha={gami.racha} />
            </View>

            {gami.racha > 0 ? (
              <View style={s.rachaInfoBox}>
                <Text style={s.rachaInfoEmoji}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rachaInfoTitle]}>¡Vas muy bien!</Text>
                  <Text style={s.rachaInfoSub}>
                    {gami.racha >= 7
                      ? '¡Una semana completa! Eres increíble 🏆'
                      : `Completa las tareas de hoy para llegar a ${gami.racha + 1} días`}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={s.rachaVaciaBox} accessible accessibilityLabel="Sin racha activa. Completa una tarea hoy para empezar tu racha">
                <Text style={s.rachaVaciaEmoji} accessibilityElementsHidden importantForAccessibility="no">💤</Text>
                <Text style={s.rachaVaciaText} accessibilityElementsHidden importantForAccessibility="no">
                  Completa una tarea hoy{'\n'}para empezar tu racha
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ══ MEDALLAS ══ */}
        {tab === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} accessible={false}>

            {/* Siguiente medalla */}
            {nextMedal && (
              <View
                style={[s.nextBox, { borderColor: nextMedal.color }]}
                accessible
                accessibilityLabel={`Siguiente medalla: ${nextMedal.label}. ${nextMedal.progreso} de ${nextMedal.req} estrellas, faltan ${nextMedal.req - nextMedal.progreso}`}
              >
                <Text style={[s.nextLabel, { color: nextMedal.color }]} accessibilityElementsHidden importantForAccessibility="no">
                  OBJETIVO
                </Text>
                <Text style={[s.nextTitle, { color: nextMedal.color }]} accessibilityElementsHidden importantForAccessibility="no">
                  {nextMedal.label}
                </Text>
                <View style={{ width: '100%', marginVertical: 8 }}>
                  <BarraProgreso pct={Math.min((nextMedal.progreso / nextMedal.req) * 100, 100)} color={nextMedal.color} />
                </View>
                <View style={s.nextFooter}>
                  <Text style={[s.nextDetailBig, { color: nextMedal.color }]} accessibilityElementsHidden importantForAccessibility="no">
                    {nextMedal.progreso} / {nextMedal.req} ⭐
                  </Text>
                  <View style={[s.nextPill, { backgroundColor: nextMedal.color + '22', borderColor: nextMedal.color }]}>
                    <Text style={[s.nextPillTxt, { color: nextMedal.color }]}>
                      faltan {nextMedal.req - nextMedal.progreso} ⭐
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {gami.estrellas >= 100 && (
              <Text style={[s.sectionLabel]} accessibilityRole="header">Conseguidas</Text>
            )}

            {/* Tarjetas verticales */}
            <View style={s.medalsCol}>
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
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingHorizontal: 18 },
   btnInicio:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.purple + '18', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20, minHeight: 44 },
    btnInicioTxt: { color: Colors.purple, fontWeight: '600', fontSize: 13 },
    title: {
      fontSize: 30, fontWeight: '800',
      color: Colors.purple, textAlign: 'center', marginBottom: 24,
    },
  
  tabRow:         { flexDirection: 'row', backgroundColor: PURPLE_BG, borderRadius: 14, padding: 3, marginBottom: 20 },
  tabBtn:         { flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center', minHeight: 44 },
  tabBtnActive:   { backgroundColor: '#fff', borderWidth: 0.5, borderColor: PURPLE_LT },
  tabLabel:       { fontSize: 14, color: '#999' },
  tabLabelActive: { color: PURPLE, fontWeight: '600' },

  // Estrellas
  bigStatsRow:  { flexDirection: 'column', gap: 10, marginBottom: 18 },
  bigStat:      { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: PURPLE_BG, borderRadius: 16, padding: 18, alignItems: 'center' },
  bigStatNum:   { fontSize: 26, fontWeight: '700', color: PURPLE, lineHeight: 42 },
  bigStatLabel: { fontSize: 14, color: '#888', textAlign: 'center', flexShrink: 1 },
  sectionLabel: { fontSize: 11, color: '#BBB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyText:    { fontSize: 15, color: '#AAA', fontWeight: '600', textAlign: 'center' },
  statCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: PURPLE_BG, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: PURPLE_LT },
  statCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statCardEmoji: { fontSize: 28 },
  statCardTitle: { fontSize: 14, fontWeight: '700', color: '#333', flexShrink: 1 },
  statCardSub:   { fontSize: 12, color: '#AAA', marginTop: 2 },
  statCardVal:   { fontSize: 20, fontWeight: '800', color: PURPLE },

  // Racha Hero
  fireHeroWrap: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  fireGlow:     { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: ORANGE, opacity: 0.1, top: 18 },
  fireEmoji:    { fontSize: 86, lineHeight: 96 },
  fireNum:      { fontSize: 80, fontWeight: '900', color: ORANGE, lineHeight: 88, letterSpacing: -3 },
  fireSubLabel: { fontSize: 16, color: '#999', fontWeight: '500' },
  rachaBadge:   { marginTop: 8, backgroundColor: ORANGE_BG, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: '#FFD0A8' },
  rachaBadgeTxt:{ fontSize: 13, color: ORANGE, fontWeight: '700' },

  // Semana racha
  semanaCard:     { backgroundColor: ORANGE_BG, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FFE0CC', marginBottom: 12 },
  semanaWrap:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  diaCelda:       { alignItems: 'center', gap: 8 },
  diaDot:         { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  diaDotActivo:   { backgroundColor: ORANGE, shadowColor: ORANGE, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  diaDotHoy:      { borderWidth: 2.5, borderColor: ORANGE, backgroundColor: ORANGE_LT },
  diaFire:        { fontSize: 22 },
  diaLetra:       { fontSize: 13, fontWeight: '700', color: '#CCC' },
  diaNombreLetra: { fontSize: 10, color: '#AAA', fontWeight: '600' },

  rachaInfoBox:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ORANGE_BG, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFD0A8', marginTop: 4 },
  rachaInfoEmoji:  { fontSize: 28 },
  rachaInfoTitle:  { fontSize: 14, fontWeight: '700', color: '#333' },
  rachaInfoSub:    { fontSize: 12, color: '#888', marginTop: 2, lineHeight: 18 },
  rachaVaciaBox:   { alignItems: 'center', paddingVertical: 24, gap: 8, backgroundColor: '#F8F8F8', borderRadius: 16, marginTop: 12 },
  rachaVaciaEmoji: { fontSize: 36 },
  rachaVaciaText:  { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 22 },

  // Medallas
  medalsCol:   { flexDirection: 'column', gap: 12, marginBottom: 18 },
  medalCard:   { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 18, padding: 16, overflow: 'hidden' },
  medalGlow:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18 },
  medalEmoji:  { fontSize: 44, width: 54, textAlign: 'center' },
  medalInfo:   { flex: 1 },
  medalLabel:  { fontSize: 18, fontWeight: '800' },
  medalBadge:  { flexShrink: 1, alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  medalBadgeTxt:{ fontSize: 11, fontWeight: '700' },
  medalPending:{ fontSize: 12, color: '#AAA', marginTop: 4 },
  medalCount:  { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Siguiente medalla
  nextBox:      { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 2, alignItems: 'center', gap: 4, backgroundColor: '#fff' },
  nextLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.7 },
  nextTitle:    { fontSize: 24, fontWeight: '900' },
  nextFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  nextDetailBig:{ fontSize: 15, fontWeight: '700' },
  nextPill:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  nextPillTxt:  { fontSize: 12, fontWeight: '700' },
});