import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { NOTIF_CFG, PEREZOSO_IMAGENES } from '../../constants/notiConfig';
import { useReduceMotion } from '../../hooks/useReduceMotion';

interface PerezosoNotifProps {
  type: string;
  show: boolean;
}

export function PerezosoNotif({ type, show }: PerezosoNotifProps) {
  const reduceMotion = useReduceMotion();
  const slideAnim   = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const cfg = NOTIF_CFG[type] || NOTIF_CFG.ontime;

  useEffect(() => {
    if (show) {
      slideAnim.setValue(reduceMotion ? 0 : 80);
      opacityAnim.setValue(0);
      scaleAnim.setValue(reduceMotion ? 1 : 0.85);
      if (reduceMotion) {
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      } else {
        Animated.parallel([
          Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
        ]).start();
      }
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
      {reduceMotion ? (
        <View pointerEvents="none" style={s.overlay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.card}>
            <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={s.img} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={[s.text, { color: cfg.color }]}>{cfg.msg}</Text>
          </View>
        </View>
      ) : (
        <Animated.View pointerEvents="none" style={[s.overlay, { opacity: opacityAnim }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Image source={PEREZOSO_IMAGENES[cfg.asset]} style={s.img} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={[s.text, { color: cfg.color }]}>{cfg.msg}</Text>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBF8', zIndex: 9999, elevation: 9999 },
  card:    { width: '100%', backgroundColor: '#F9FBF8', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', elevation: 12, flexShrink: 1 },
  img:     { width: '70%', aspectRatio: 1, maxHeight: 280, backgroundColor: '#F9FBF8', marginBottom: 16 },
  text:    { fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 32, flexShrink: 1 },
});