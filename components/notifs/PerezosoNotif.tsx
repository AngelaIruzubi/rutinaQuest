import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NOTIF_CFG, PEREZOSO_IMAGENES } from '../../constants/notiConfig';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_MEDALLA      = new Set(['bronce', 'plata', 'oro']);
const TIPOS_BAJA_MEDALLA = new Set(['bajaOroPlata', 'bajaPlatabronce', 'bajaBronceSin']);

const MEDALLA_THEME: Record<string, { color: string; bg: string; glow: string; emoji: string; label: string }> = {
  bronce:          { color: '#CD7F32', bg: '#1A1100', glow: 'rgba(205,127,50,0.18)',  emoji: '🥉', label: 'Medalla de Bronce' },
  plata:           { color: '#C0C0C0', bg: '#0f0f14', glow: 'rgba(192,192,192,0.15)', emoji: '🥈', label: 'Medalla de Plata'  },
  oro:             { color: '#FFD700', bg: '#130f00', glow: 'rgba(255,215,0,0.18)',    emoji: '🥇', label: 'Medalla de Oro'   },
  bajaOroPlata:    { color: '#C0C0C0', bg: '#0a0a12', glow: 'rgba(192,192,192,0.10)', emoji: '🥈', label: 'Bajaste a Plata'  },
  bajaPlatabronce: { color: '#CD7F32', bg: '#100800', glow: 'rgba(205,127,50,0.10)',  emoji: '🥉', label: 'Bajaste a Bronce' },
  bajaBronceSin:   { color: '#fffff', bg: '#ffffff', glow: 'rgba(205,127,50,0.10)',  emoji: '💔', label: 'Perdiste tu medalla de Bronce' },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// ─── Confetti (subida) ────────────────────────────────────────────────────────

interface ConfettiParticle {
  x: Animated.Value; y: Animated.Value;
  rot: Animated.Value; opacity: Animated.Value;
  color: string; w: number; h: number; radius: number;
}

function makeConfettiParticles(accentColor: string): ConfettiParticle[] {
  const palette = [accentColor, '#ffffff', '#FFD700', '#FF6B00', '#FF2D55', accentColor, '#fff'];
  return Array.from({ length: 36 }, () => {
    const w = randomBetween(7, 16);
    const isRect = Math.random() > 0.35;
    return {
      x: new Animated.Value(randomBetween(0.05, 0.95) * SW),
      y: new Animated.Value(randomBetween(-80, -10)),
      rot: new Animated.Value(0), opacity: new Animated.Value(1),
      color: palette[Math.floor(Math.random() * palette.length)],
      w: isRect ? w * 1.8 : w, h: w, radius: isRect ? 3 : w / 2,
    };
  });
}
// ─── Medal DOWN notification ──────────────────────────────────────────────────
// ─── Corazón roto animado ─────────────────────────────────────────────────────

function CorazonRoto({ color }: { color: string }) {
  const scaleAnim  = useRef(new Animated.Value(0.3)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.2, tension: 220, friction: 4, useNativeDriver: true }),
      Animated.timing(opacAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(scaleAnim, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }).start(() => {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue:  12, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:   8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:  -8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:   4, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue:   0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, { toValue: 0.88, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
              Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
          ).start();
        });
      });
    });
  }, []);

  return (
    <Animated.View
      style={{
        opacity:      opacAnim,
        marginBottom: 16,
        transform:    [
          { scale:      Animated.multiply(scaleAnim, pulseAnim) as any },
          { translateX: shakeAnim },
        ],
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={{ fontSize: 72, lineHeight: 80 }}>💔</Text>
    </Animated.View>
  );
}
// ─── Rain (bajada) ────────────────────────────────────────────────────────────

interface RainParticle {
  x: Animated.Value; y: Animated.Value; opacity: Animated.Value;
  w: number; h: number; color: string;
}

function makeRainParticles(accentColor: string): RainParticle[] {
  const palette = [accentColor, '#334', '#223', '#445', accentColor + '88'];
  return Array.from({ length: 30 }, () => ({
    x:       new Animated.Value(randomBetween(0, SW)),
    y:       new Animated.Value(randomBetween(-SH * 0.5, 0)),
    opacity: new Animated.Value(randomBetween(0.2, 0.7)),
    w:       randomBetween(1.5, 3),
    h:       randomBetween(18, 38),
    color:   palette[Math.floor(Math.random() * palette.length)],
  }));
}

// ─── Normal notification ──────────────────────────────────────────────────────


function NotifNormal({
  cfg, opacityAnim, slideAnim, scaleAnim, bounceAnim, onClose,
}: {
  cfg: any;
  opacityAnim: Animated.Value; slideAnim: Animated.Value;
  scaleAnim: Animated.Value;   bounceAnim: Animated.Value;
  onClose?: () => void;
}) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[estilo.overlay, { backgroundColor: '#F9FBF8', opacity: opacityAnim }]}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[
        estilo.card,
        { transform: [{ translateY: slideAnim }, { scale: Animated.multiply(scaleAnim, bounceAnim) as any }] },
      ]}>
        <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={estilo.img} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[estilo.text, { color: cfg.color }]}>{cfg.msg}</Text>
        {cfg.sub && (
          <TouchableOpacity
            style={[estilo.ctaBtn, { backgroundColor: cfg.color }]}
            activeOpacity={0.82}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cfg.sub}
          >
            <Text style={estilo.ctaText}>{cfg.sub}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}
// ─── Medal UP notification ────────────────────────────────────────────────────

function NotifMedalla({
  type, cfg, show, reduceMotion, onClose,
}: {
  type: string; cfg: any; show: boolean; reduceMotion: boolean; onClose?: () => void;
}) {
  const theme = MEDALLA_THEME[type] ?? MEDALLA_THEME.bronce;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale    = useRef(new Animated.Value(0.3)).current;
  const mascotY        = useRef(new Animated.Value(60)).current;
  const mascotOpacity  = useRef(new Animated.Value(0)).current;
  const badgeScale     = useRef(new Animated.Value(0)).current;
  const badgeRotate    = useRef(new Animated.Value(-0.3)).current;
  const haloScale      = useRef(new Animated.Value(0.6)).current;
  const haloOpacity    = useRef(new Animated.Value(0)).current;
  const haloLoop       = useRef<Animated.CompositeAnimation | null>(null);
  const textOpacity    = useRef(new Animated.Value(0)).current;
  const textY          = useRef(new Animated.Value(30)).current;
  const ctaScale       = useRef(new Animated.Value(0.7)).current;
  const ctaOpacity     = useRef(new Animated.Value(0)).current;
  const particles      = useRef<ConfettiParticle[]>(makeConfettiParticles(theme.color)).current;

  const launchConfetti = () => {
    if (reduceMotion) return;
    particles.forEach((p) => {
      p.x.setValue(randomBetween(0.05, 0.95) * SW);
      p.y.setValue(randomBetween(-80, -10));
      p.rot.setValue(0); p.opacity.setValue(1);
    });
    Animated.parallel(particles.map((p) => {
      const delay   = randomBetween(0, 500);
      const targetY = randomBetween(SH * 0.35, SH * 1.1);
      const targetX = (p.x as any)._value + randomBetween(-100, 100);
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.y,       { toValue: targetY, duration: randomBetween(1000, 1800), easing: Easing.out(Easing.quad),    useNativeDriver: true }),
          Animated.timing(p.x,       { toValue: targetX, duration: randomBetween(1000, 1800), easing: Easing.inOut(Easing.sin),   useNativeDriver: true }),
          Animated.timing(p.rot,     { toValue: randomBetween(4, 10), duration: randomBetween(1000, 1800), easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([Animated.delay(500), Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true })]),
        ]),
      ]);
    })).start();
  };

  const startHalo = () => {
    haloLoop.current = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(haloScale,   { toValue: 1.5, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(haloScale,   { toValue: 0.7, duration: 0, useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ]),
    ]));
    haloLoop.current.start();
  };

  useEffect(() => {
    if (!show) {
      haloLoop.current?.stop();
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(mascotOpacity,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(textOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(ctaOpacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }
    overlayOpacity.setValue(0);
    mascotScale.setValue(reduceMotion ? 1 : 0.3);
    mascotY.setValue(reduceMotion ? 0 : 60);
    mascotOpacity.setValue(0);
    badgeScale.setValue(reduceMotion ? 1 : 0);
    badgeRotate.setValue(-0.3);
    haloScale.setValue(0.7); haloOpacity.setValue(0.5);
    textOpacity.setValue(0); textY.setValue(reduceMotion ? 0 : 30);
    ctaScale.setValue(reduceMotion ? 1 : 0.7); ctaOpacity.setValue(0);

    if (reduceMotion) {
      overlayOpacity.setValue(1); mascotOpacity.setValue(1);
      textOpacity.setValue(1);    ctaOpacity.setValue(1);
      return;
    }

    Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.spring(mascotScale,   { toValue: 1, tension: 160, friction: 7, useNativeDriver: true }),
      Animated.spring(mascotY,       { toValue: 0, tension: 130, friction: 9, useNativeDriver: true }),
      Animated.timing(mascotOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeScale,  { toValue: 1, tension: 250, friction: 5, useNativeDriver: true }),
        Animated.spring(badgeRotate, { toValue: 0, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start(() => startHalo());
    }, 150);
    setTimeout(() => launchConfetti(), 100);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(textY,       { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 300);
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(ctaScale,   { toValue: 1, tension: 180, friction: 7, useNativeDriver: true }),
        Animated.timing(ctaOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 600);
  }, [show, type]);

  const badgeRotateDeg = badgeRotate.interpolate({ inputRange: [-0.3, 0], outputRange: ['-25deg', '0deg'] });

  return (
    <Animated.View pointerEvents="box-none" style={[estilo.screen, { backgroundColor: theme.bg, opacity: overlayOpacity }]}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((p, i) => {
          const rotateDeg = p.rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
          return (
            <Animated.View key={i} style={{ position: 'absolute', width: p.w, height: p.h, borderRadius: p.radius, backgroundColor: p.color, opacity: p.opacity, transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: rotateDeg }] }} />
          );
        })}
      </View>
      <View pointerEvents="none" style={[estilo.bgGlow, { backgroundColor: theme.glow }]} />
      
      <Animated.View style={[estilo.mascotWrap, { opacity: mascotOpacity, transform: [{ translateY: mascotY }, { scale: mascotScale }] }]}>
        <Animated.View pointerEvents="none" style={[estilo.halo, {  opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
        <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={estilo.mascot} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
      <Animated.View style={[estilo.textBlock, { opacity: textOpacity, transform: [{ translateY: textY }] }]}>
        <Text style={[estilo.medalLabel, { color: theme.color }]}>{theme.label}</Text>
        <Text style={estilo.msg}>{cfg.msg}</Text>
        <Text style={[estilo.subtitle, { color: theme.color + '99' }]}>¡Nueva medalla conseguida!</Text>
      </Animated.View>
      <Animated.View style={[estilo.ctaWrap, { opacity: ctaOpacity, transform: [{ scale: ctaScale }] }]}>
        <TouchableOpacity style={[estilo.ctaBtn, { backgroundColor: theme.color }]} activeOpacity={0.8} onPress={onClose}
          accessibilityRole="button" accessibilityLabel="Cerrar notificación de medalla">
          <Text style={estilo.ctaText}>¡A por la siguiente!</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Medal DOWN notification ──────────────────────────────────────────────────

function NotifBajada({
  type, cfg, show, reduceMotion, onClose,
}: {
  type: string; cfg: any; show: boolean; reduceMotion: boolean; onClose?: () => void;
}) {
  const theme = MEDALLA_THEME[type] ?? MEDALLA_THEME.bajaPlatabronce;

  // Overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Mascot — entra desde arriba y cae
  const mascotY       = useRef(new Animated.Value(-80)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale   = useRef(new Animated.Value(1.1)).current;

  // Shake loop
  const shakeX     = useRef(new Animated.Value(0)).current;
  const shakeLoop  = useRef<Animated.CompositeAnimation | null>(null);

  // Badge — cae desde arriba girando y "aterriza"
  const badgeY      = useRef(new Animated.Value(-120)).current;
  const badgeRotate = useRef(new Animated.Value(-2)).current;
  const badgeScale  = useRef(new Animated.Value(1.3)).current;

  // Rain particles
  const rainParticles = useRef<RainParticle[]>(makeRainParticles(theme.color)).current;

  // Text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(-20)).current;

  // CTA
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY       = useRef(new Animated.Value(20)).current;

  const startRain = () => {
    if (reduceMotion) return;
    rainParticles.forEach((p) => {
      p.x.setValue(randomBetween(0, SW));
      p.y.setValue(randomBetween(-SH * 0.5, 0));
      p.opacity.setValue(randomBetween(0.15, 0.55));
    });
    Animated.parallel(rainParticles.map((p) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.y, {
            toValue:  SH + 40,
            duration: randomBetween(1200, 2200),
            easing:   Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, { toValue: -60, duration: 0, useNativeDriver: true }),
        ])
      )
    )).start();
  };

  const startShake = () => {
    if (reduceMotion) return;
    shakeLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, { toValue:  5, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -5, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  0, duration: 60, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    shakeLoop.current.start();
  };

  const stopShake = () => {
    shakeLoop.current?.stop();
    shakeX.setValue(0);
  };

  useEffect(() => {
    if (!show) {
      stopShake();
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(mascotOpacity,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(textOpacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(ctaOpacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Reset
    overlayOpacity.setValue(0);
    mascotY.setValue(reduceMotion ? 0 : -80);
    mascotOpacity.setValue(0);
    mascotScale.setValue(reduceMotion ? 1 : 1.1);
    shakeX.setValue(0);
    badgeY.setValue(reduceMotion ? 0 : -120);
    badgeRotate.setValue(-2);
    badgeScale.setValue(reduceMotion ? 1 : 1.3);
    textOpacity.setValue(0);
    textY.setValue(reduceMotion ? 0 : -20);
    ctaOpacity.setValue(0);
    ctaY.setValue(reduceMotion ? 0 : 20);

    if (reduceMotion) {
      overlayOpacity.setValue(1); mascotOpacity.setValue(1);
      textOpacity.setValue(1);    ctaOpacity.setValue(1);
      return;
    }

    // 1. Fondo aparece lento (más opresivo)
    Animated.timing(overlayOpacity, { toValue: 1, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();

    // 2. Lluvia
    setTimeout(() => startRain(), 200);

    // 3. Mascota cae desde arriba con rebote amortiguado
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(mascotY,       { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(mascotOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(mascotScale,   { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
      ]).start(() => startShake());
    }, 300);

    // 4. Badge cae girando y aterriza (como una moneda que cae)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeY, {
          toValue: 0, tension: 60, friction: 9, useNativeDriver: true,
        }),
        Animated.spring(badgeRotate, {
          toValue: 0, tension: 80, friction: 6, useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1, tension: 120, friction: 8, useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // 5. Texto baja desde arriba
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY,       { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
      ]).start();
    }, 700);

    // 6. CTA sube desde abajo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ctaY,       { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 1000);
  }, [show, type]);



  return (
    <Animated.View pointerEvents="box-none"
      style={[estilo.screen, { backgroundColor: theme.bg, opacity: overlayOpacity }]}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    >
      {/* Lluvia */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {rainParticles.map((p, i) => (
          <Animated.View key={i} style={{
            position: 'absolute', width: p.w, height: p.h,
            borderRadius: 2, backgroundColor: p.color,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }],
          }} />
        ))}
      </View>

      {/* Glow frío — oculto en bajaBronceSin */}
      {type !== 'bajaBronceSin' && (
        <View pointerEvents="none" style={[estilo.bgGlow, { backgroundColor: theme.glow, top: '15%' }]} />
      )}
      {/* Mascota con shake */}
      <Animated.View style={[
        estilo.mascotWrap,
        { opacity: mascotOpacity, transform: [{ translateY: mascotY }, { scale: mascotScale }, { translateX: shakeX }] },
      ]}>
        <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={estilo.mascot} resizeMode="contain" accessibilityIgnoresInvertColors />
        {type === 'bajaBronceSin' && (
          <CorazonRoto color={theme.color} />
        )}
      </Animated.View>

      {/* Texto */}
      <Animated.View style={[estilo.textBlock, { opacity: textOpacity, transform: [{ translateY: textY }] }]}>
        <Text style={[estilo.medalLabel, { color: theme.color }]}>{theme.label}</Text>
        <Text style={estilo.msg}>{cfg.msg}</Text>
        <Text style={[estilo.subtitle, { color: theme.color + '88' }]}>Completa tareas a tiempo para recuperarla</Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[estilo.ctaWrap, { opacity: ctaOpacity, transform: [{ translateY: ctaY }] }]}>
        <TouchableOpacity
          style={[estilo.ctaBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.color }]}
          activeOpacity={0.8} onPress={onClose}
          accessibilityRole="button" accessibilityLabel="Cerrar notificación de bajada de medalla"
        >
          <Text style={[estilo.ctaText, { color: theme.color }]}>Voy a recuperarla</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── PerezosoNotif (punto de entrada) ────────────────────────────────────────

export function PerezosoNotif({
  type, show, onClose,
}: {
  type: string; show: boolean; onClose?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const cfg          = NOTIF_CFG[type] || NOTIF_CFG.ontime;
  const esMedalla    = TIPOS_MEDALLA.has(type);
  const esBajada     = TIPOS_BAJA_MEDALLA.has(type);

  // Animaciones para notificación normal
  const slideAnim   = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const bounceAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (esMedalla || esBajada) return;
    if (show) {
      slideAnim.setValue(reduceMotion ? 0 : 80);
      opacityAnim.setValue(0);
      scaleAnim.setValue(reduceMotion ? 1 : 0.85);
      bounceAnim.setValue(1);
      if (reduceMotion) {
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        return;
      }
      Animated.parallel([
        Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: reduceMotion ? 0 : 80, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: reduceMotion ? 1 : 0.85, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [show, type]);

  useEffect(() => {
    if (show) AccessibilityInfo.announceForAccessibility(cfg.msg);
  }, [show, type]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent accessibilityViewIsModal={false}>
      {esBajada ? (
        <NotifBajada  type={type} cfg={cfg} show={show} reduceMotion={reduceMotion} onClose={onClose} />
      ) : esMedalla ? (
        <NotifMedalla type={type} cfg={cfg} show={show} reduceMotion={reduceMotion} onClose={onClose} />
      ) : (
        <NotifNormal cfg={cfg} opacityAnim={opacityAnim} slideAnim={slideAnim} scaleAnim={scaleAnim} bounceAnim={bounceAnim} onClose={onClose} />
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const estilo = StyleSheet.create({
  // Normal
  overlay:  { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 },
  card:     { width: '100%', borderRadius: 28, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', elevation: 12, flexShrink: 1 },
  img:      { width: '70%', aspectRatio: 1, maxHeight: 280, marginBottom: 20 },
  text:     { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 34, flexShrink: 1 },
  sub:      { fontSize: 15, fontWeight: '500', textAlign: 'center', marginTop: 10, flexShrink: 1 },

  // Shared full-screen
  screen:    { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  bgGlow:    { position: 'absolute', width: 340, height: 340, borderRadius: 170, top: '20%' },
  mascotWrap:{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  halo:      { position: 'absolute', width: 260, height: 260 },
  mascot:    { width: 220, height: 220 },
  badge:     { position: 'absolute', bottom: -4, right: -4 },
  badgeEmoji:{ fontSize: 58 },
  textBlock: { alignItems: 'center', marginBottom: 40 },
  medalLabel:{ fontSize: 13, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  msg:       { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 34, marginBottom: 8 },
  subtitle:  { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  ctaWrap:   { width: '100%' },
  ctaBtn:  { marginTop: 20, borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
});