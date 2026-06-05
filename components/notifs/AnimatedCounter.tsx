import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

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
    <View style={s.wrap}>
      <Text style={s.num}>{display}</Text>
      <Text style={s.unit}>días seguidos</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  num: {
    fontSize: 72,
    color: '#fff',
    fontWeight: '900',
    lineHeight: 78,
    textAlign: 'center',
  },
  unit: {
    fontSize: 17,
    color: '#888',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});