import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { AnimatedCounter } from './AnimatedCounter';

interface RachaNotifProps {
  show:  boolean;
  racha: number;
}

export function RachaNotif({ show, racha }: RachaNotifProps) {
  const reduceMotion = useReduceMotion();
  const slideAnim   = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const countAnim   = useRef(new Animated.Value(Math.max(0, racha - 1))).current;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(reduceMotion ? 0 : 100);
      opacityAnim.setValue(0);
      scaleAnim.setValue(reduceMotion ? 1 : 0.6);
      countAnim.setValue(Math.max(0, racha - 1));
      if (reduceMotion) {
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
          countAnim.setValue(racha);
        });
      } else {
        Animated.parallel([
          Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }),
        ]).start(() => {
          Animated.timing(countAnim, { toValue: racha, duration: 600, useNativeDriver: false }).start();
        });
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: reduceMotion ? 0 : 100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim,   { toValue: reduceMotion ? 1 : 0.6, useNativeDriver: true, speed: 14, bounciness: 0 }),
      ]).start();
    }
  }, [show, racha]);

  useEffect(() => {
    if (show) AccessibilityInfo.announceForAccessibility(`¡Racha activa! ${racha} días seguidos`);
  }, [show]);

  return (
    <Modal visible={show} transparent animationType="none" statusBarTranslucent accessibilityViewIsModal={false}>
      {reduceMotion ? (
        <View pointerEvents="none" style={s.overlay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.card}>
            <Text style={s.fire}>🔥</Text>
            <View style={s.textCol}>
              <Text style={s.label}>¡Racha activa!</Text>
              <Text style={s.count}>
                <Text style={s.num}>{racha}</Text>
                <Text>{' días seguidos'}</Text>
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Animated.View pointerEvents="none" style={[s.overlay, { opacity: opacityAnim }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Text style={s.fire}>🔥</Text>
            <View style={s.textCol}>
              <Text style={s.label}>¡Racha activa!</Text>
              <AnimatedCounter anim={countAnim} max={racha} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(26,26,26,0.96)' },
  card:    { width: '100%', backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, elevation: 18, flexShrink: 1 },
  fire:    { fontSize: 70, marginBottom: 10 },
  textCol: { flexDirection: 'column', gap: 2, alignItems: 'center', flexShrink: 1 },
  label:   { fontSize: 24, color: '#FFB085', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', flexShrink: 1 },
  count:   { fontSize: 24, color: '#fff', fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  num:     { fontSize: 46, color: Colors.orange, fontWeight: '800' },
});