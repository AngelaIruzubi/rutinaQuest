import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useReduceMotion } from "../../hooks/useReduceMotion";
import { AnimatedCounter } from "./AnimatedCounter";

interface RachaNotifProps {
  show: boolean;
  racha: number;
  onClose?: () => void;
}

const MILESTONES = [3, 5, 7, 10, 30, 100];

export function RachaNotif({ show, racha, onClose }: RachaNotifProps) {
  const reduceMotion = useReduceMotion();

  // --- Card entry ---
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const translateY = useRef(new Animated.Value(80)).current;

  // --- Fire pop (entry) ---
  const fireScale = useRef(new Animated.Value(0.5)).current;

  // --- Fire idle wiggle ---
  const fireRot = useRef(new Animated.Value(0)).current;
  const fireWiggle = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const wiggleLoop = useRef<Animated.CompositeAnimation | null>(null);

  // --- Counter ---
  const count = useRef(new Animated.Value(Math.max(0, racha - 1))).current;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const startWiggle = () => {
    if (reduceMotion) return;
    wiggleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fireRot, {
            toValue: 1,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fireWiggle, {
            toValue: 1.04,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1.04,
            duration: 550,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fireRot, {
            toValue: -1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fireWiggle, {
            toValue: 0.97,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 0.97,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fireRot, {
            toValue: 0.4,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fireWiggle, {
            toValue: 1.02,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1.02,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fireRot, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fireWiggle, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    wiggleLoop.current.start();
  };

  const stopWiggle = () => {
    wiggleLoop.current?.stop();
    fireRot.setValue(0);
    fireWiggle.setValue(1);
    haloScale.setValue(1);
  };

  const animateCounterTicks = (from: number, to: number) => {
    let current = from;
    const step = () => {
      current += 1;
      count.setValue(current);
      if (current < to) setTimeout(step, 45);
    };
    step();
  };

  // ─── Main show/hide effect ───────────────────────────────────────────────────

  useEffect(() => {
    if (!show) {
      stopWiggle();
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: reduceMotion ? 1 : 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Reset
    opacity.setValue(0);
    scale.setValue(reduceMotion ? 1 : 0.6);
    translateY.setValue(reduceMotion ? 0 : 80);
    fireScale.setValue(reduceMotion ? 1 : 0.5);
    count.setValue(Math.max(0, racha - 1));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (reduceMotion) {
      opacity.setValue(1);
      count.setValue(racha);
      return;
    }

    // 1. Backdrop
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    // 2. Card bounce
    Animated.spring(scale, {
      toValue: 1,
      tension: 170,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Animated.spring(translateY, {
      toValue: 0,
      tension: 140,
      friction: 9,
      useNativeDriver: true,
    }).start();

    // 3. Fire pop (intense) → then settle into gentle wiggle
    Animated.spring(fireScale, {
      toValue: 1,
      tension: 220,
      friction: 5,
      useNativeDriver: true,
    }).start(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      startWiggle();
    });

    // 4. Counter ticks
    setTimeout(() => {
      animateCounterTicks(Math.max(0, racha - 1), racha);
      Haptics.selectionAsync();
    }, 250);
  }, [show, racha]);

  // ─── Accessibility ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (show) {
      AccessibilityInfo.announceForAccessibility(
        `¡Racha activa! ${racha} días seguidos`,
      );
    }
  }, [show, racha]);

  // ─── Derived transforms ──────────────────────────────────────────────────────

  const fireRotDeg = fireRot.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-3deg", "3deg"],
  });

  const combinedFireScale = Animated.multiply(fireScale, fireWiggle);

  // ─── Milestones ──────────────────────────────────────────────────────────────

  const visibleMilestones = MILESTONES.filter((m) => m <= racha + 20).slice(
    0,
    5,
  );

  return (
    <Modal
      visible={show}
      transparent
      animationType="none"
      statusBarTranslucent
      accessibilityViewIsModal={false}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, { opacity }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[styles.card, { transform: [{ translateY }, { scale }] }]}
        >
          {/* ── Fire circle ── */}
          <Animated.View
            style={[styles.halo, { transform: [{ scale: haloScale }] }]}
          >
            <Animated.View
              style={[
                styles.fireCircle,
                {
                  transform: [
                    { scale: combinedFireScale },
                    { rotate: fireRotDeg },
                  ],
                },
              ]}
            >
              <Text allowFontScaling={false} style={styles.fireEmoji}>
                🔥
              </Text>
            </Animated.View>
          </Animated.View>

          {/* ── Text ── */}
          <Text allowFontScaling={false} style={styles.label}>
            ¡Racha activa!
          </Text>
          <AnimatedCounter anim={count} max={racha} />

          {/* ── Milestones ── */}
          <View style={styles.divider} />
          <View style={styles.milestones}>
            {visibleMilestones.map((m) => {
              const done = racha >= m;
              const current = racha === m;
              return (
                <View key={m} style={styles.milestone}>
                  <View
                    style={[
                      styles.mDot,
                      done ? styles.mDotDone : styles.mDotNext,
                      current && styles.mDotCurrent,
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.mDotText,
                        done ? styles.mDotTextDone : styles.mDotTextNext,
                      ]}
                    >
                      {done ? (current ? String(m) : "✓") : String(m)}
                    </Text>
                  </View>
                  <Text
                    allowFontScaling={false}
                    style={[styles.mLabel, done && styles.mLabelDone]}
                  >
                    {current ? "HOY" : `${m}d`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── CTA ── */}
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.82}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar notificación de racha"
          >
            <Text allowFontScaling={false} style={styles.ctaText}>
              ¡Sigue así!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const ORANGE = "#FF6B00";
const ORANGE_LIGHT = "#FF9F0A";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.88)",
  },

  card: {
    width: "88%",
    backgroundColor: "#1f1f1f",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    elevation: 18,
  },

  // Fire
  halo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,107,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  fireCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ORANGE,
    justifyContent: "center",
    alignItems: "center",
  },
  fireEmoji: {
    fontSize: 52,
    lineHeight: 58,
  },

  // Text
  label: {
    fontSize: 13,
    color: ORANGE_LIGHT,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: "center",
  },

  // Milestones
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2e2e2e",
    marginTop: 20,
    marginBottom: 18,
  },
  milestones: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  milestone: {
    alignItems: "center",
    gap: 4,
    minWidth: 44,
  },
  mDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  mDotDone: {
    backgroundColor: ORANGE,
  },
  mDotCurrent: {
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  mDotNext: {
    backgroundColor: "#2a2a2a",
    borderWidth: 1.5,
    borderColor: "#3a3a3a",
  },
  mDotText: {
    fontSize: 13,
    fontWeight: "800",
  },
  mDotTextDone: { color: "#fff" },
  mDotTextNext: { color: "#555" },
  mLabel: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  mLabelDone: { color: ORANGE_LIGHT },

  // CTA
  ctaBtn: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
