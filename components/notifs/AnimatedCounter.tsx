import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

interface AnimatedCounterProps {
  anim: Animated.Value;
  max: number;
}

export function AnimatedCounter({ anim, max }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(Math.max(0, max - 1));
  const { width } = useWindowDimensions();
  const numSize = Math.min(52, width * 0.13); // máx 52 para caber dentro del círculo de 96px

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);

  return (
    <View style={s.wrap}>
      <Text
        allowFontScaling={false}
        style={[s.num, { fontSize: numSize, lineHeight: numSize * 1.1 }]}
      >
        {display}
      </Text>
      <Text allowFontScaling={false} style={s.unit}>
        días seguidos
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: "100%",
  },
  num: {
    fontSize: 72,
    color: "#fff",
    fontWeight: "900",
    lineHeight: 78,
    textAlign: "center",
  },
  unit: {
    fontSize: 17,
    color: "#888",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },
});
