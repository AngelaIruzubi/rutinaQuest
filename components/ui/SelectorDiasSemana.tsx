import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DIAS_LARGOS } from "../../constants/diasSemana";
import { AppFonts, Colors } from "../../constants/theme";
import { useAjustesCtx } from "../../context/AjustesContext";

// DIAS_LARGOS empieza en lunes (índice 0); Date#getDay() empieza en domingo
// (0). Esta es la conversión entre ambos que se usa en todo el selector.
const idxAJsDay = (idx: number) => (idx + 1) % 7;

// Lista vertical con el nombre completo de cada día (no letras sueltas como
// "L M X J") y una casilla grande con marca de verificación — pensado para
// que sea fácil de leer y de tocar sin depender solo del color para saber
// qué está marcado.
export function SelectorDiasSemana({
  diasSemana,
  onChange,
}: {
  diasSemana: number[];
  onChange: (dias: number[]) => void;
}) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const alternar = (jsDay: number) => {
    if (diasSemana.includes(jsDay)) {
      if (diasSemana.length <= 1) return; // siempre queda al menos un día
      onChange(diasSemana.filter((d) => d !== jsDay));
    } else {
      onChange([...diasSemana, jsDay].sort());
    }
  };

  return (
    <View accessible={false}>
      <Text
        style={[s.ayuda, { fontSize: fs(13) }]}
        accessible
        accessibilityLabel="Toca los días en los que se repite esta tarea"
      >
        Toca los días en los que se repite
      </Text>
      <View style={s.lista} accessible={false}>
        {DIAS_LARGOS.map((nombre, idx) => {
          const jsDay = idxAJsDay(idx);
          const activo = diasSemana.includes(jsDay);
          return (
            <Pressable
              key={jsDay}
              onPress={() => alternar(jsDay)}
              style={[s.fila, activo && s.filaActiva]}
              accessible
              accessibilityRole="checkbox"
              accessibilityLabel={nombre}
              accessibilityState={{ checked: activo }}
            >
              <View style={[s.check, activo && s.checkActivo]}>
                {activo && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#fff"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </View>
              <Text
                style={[
                  s.filaTexto,
                  { fontSize: fs(16) },
                  activo && s.filaTextoActiva,
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  ayuda: {
    fontSize: 13,
    fontFamily: AppFonts.body,
    color: "#8A8194",
    marginBottom: 10,
  },
  lista: { gap: 8 },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  filaActiva: {
    borderColor: Colors.purple,
    backgroundColor: Colors.purpleBg,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#CCC",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkActivo: {
    borderColor: Colors.purple,
    backgroundColor: Colors.purple,
  },
  filaTexto: {
    fontSize: 16,
    fontFamily: AppFonts.bodyBold,
    color: "#555",
  },
  filaTextoActiva: { color: Colors.purpleDk },
});
