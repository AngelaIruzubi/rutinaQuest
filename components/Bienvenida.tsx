import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppFonts, Colors } from "../constants/theme";

const AUTOAVANCE_MS = 2000;

export function Bienvenida({ onEmpezar }: { onEmpezar: () => void }) {
  const yaAvanzo = useRef(false);

  const avanzar = () => {
    if (yaAvanzo.current) return;
    yaAvanzo.current = true;
    onEmpezar();
  };

  useEffect(() => {
    const id = setTimeout(avanzar, AUTOAVANCE_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <Pressable
      style={styles.root}
      onPress={avanzar}
      accessible
      accessibilityRole="button"
      accessibilityLabel="RutinaQuest. Pulsa para continuar."
    >
      <View style={styles.content}>
        <Image
          source={require("../assets/images/icono.png")}
          style={styles.mascota}
          contentFit="contain"
          accessible
          accessibilityLabel="Perezoso mascota de RutinaQuest"
        />
        <Text style={styles.titulo} accessibilityRole="header">
          RutinaQuest
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FBF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  mascota: {
    width: 220,
    height: 220,
  },
  titulo: {
    fontFamily: AppFonts.displayExtraBold,
    fontSize: 34,
    color: Colors.purpleDk,
    letterSpacing: -0.5,
  },
});
