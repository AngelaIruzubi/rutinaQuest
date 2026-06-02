import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../../hooks/useReduceMotion';

interface BarraProgresoProps {
  pct:   number;
  color: string;
}

export function BarraProgreso({ pct, color }: BarraProgresoProps) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue:         pct / 100,
      duration:        reduceMotion ? 0 : 700,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View
      style={s.barBg}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      accessibilityLabel={`Progreso: ${Math.round(pct)} por ciento`}
    >
      <Animated.View style={[s.barFill, {
        backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}

const s = StyleSheet.create({
  barBg:   { height: 5, backgroundColor: '#EEE', borderRadius: 3, marginTop: 8, width: '100%', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});