import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppFonts, Colors } from "../../constants/theme";
import { useAjustesCtx } from "../../context/AjustesContext";

const PASO_MIN = 1;
const MAX_MIN = 180;

export function DuracionPicker({
  valorSeg,
  onChange,
}: {
  valorSeg: number | null;
  onChange: (seg: number | null) => void;
}) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const minutos = valorSeg ? Math.round(valorSeg / 60) : 0;

  const cambiar = (delta: number) => {
    const siguiente = Math.max(0, Math.min(MAX_MIN, minutos + delta));
    onChange(siguiente === 0 ? null : siguiente * 60);
  };

  return (
    <View>
      <Text style={[s.label, { fontSize: fs(14) }]} accessibilityRole="header">
        ¿Cuánto tiempo dura? (opcional)
      </Text>
      <View style={s.fila} accessible={false}>
        <Pressable
          onPress={() => cambiar(-PASO_MIN)}
          disabled={minutos <= 0}
          style={[s.flecha, minutos <= 0 && s.flechaDeshabilitada]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Quitar un minuto"
        >
          <Ionicons
            name="remove"
            size={26}
            color={minutos <= 0 ? "#CCC" : "#fff"}
          />
        </Pressable>

        <View style={s.numBox}>
          <Text style={[s.numTexto, { fontSize: fs(18) }]} numberOfLines={1}>
            {minutos > 0 ? `${minutos} min` : "Ninguna"}
          </Text>
        </View>

        <Pressable
          onPress={() => cambiar(PASO_MIN)}
          disabled={minutos >= MAX_MIN}
          style={[s.flecha, minutos >= MAX_MIN && s.flechaDeshabilitada]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Añadir un minuto"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>
      {minutos > 0 && (
        <Text
          style={[s.hint, { fontSize: fs(13) }]}
          accessible
          accessibilityLabel="Tendrás que usar el temporizador antes de poder marcar esta tarea como realizada"
        >
          Tendrás que usar el temporizador antes de marcarla como hecha.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: AppFonts.bodyBold,
    color: Colors.purpleDk,
    marginBottom: 12,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  flecha: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  flechaDeshabilitada: { backgroundColor: "#EDEAF1" },
  numBox: {
    flex: 1,
    maxWidth: 140,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.purpleLt,
    backgroundColor: Colors.purpleBg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  numTexto: {
    fontSize: 18,
    fontFamily: AppFonts.displayBold,
    color: Colors.purpleDk,
  },
  hint: {
    fontSize: 13,
    fontFamily: AppFonts.body,
    color: "#8A8194",
    marginTop: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
