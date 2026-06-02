import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface AnimatedCounterProps {
  anim: Animated.Value;
  max:  number;
}

export function AnimatedCounter({ anim, max }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(Math.max(0, max - 1));
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);
  return (
    <Text style={s.count}>
      <Text style={s.num}>{display}</Text>
      <Text>{' días seguidos'}</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  count: { fontSize: 24, color: '#fff', fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  num:   { fontSize: 46, color: '#FF6B35', fontWeight: '800' },
});