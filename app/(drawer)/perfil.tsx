import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { AppFonts, Colors } from "../../constants/theme";
import { useAjustesCtx } from "../../context/AjustesContext";
import { useAvatar } from "../../context/AvatarContext";
import { EstadoAvatar } from "../../types/avatar";
import {
  BARBA_OPCIONES,
  BOCA_OPCIONES,
  CAMISETA_COLORES,
  CAMISETA_OPCIONES,
  CEJAS_OPCIONES,
  generarAvatarSvg,
  OJOS_OPCIONES,
  PELO_COLORES,
  PELO_OPCIONES,
  PELO_TRASERO_OPCIONES,
  PIEL_COLORES,
} from "../../utils/avatarDicebear";

// ─── Pestañas ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "piel", icon: "palette-outline", title: "Tono de piel" },
  { id: "pelo", icon: "hair-dryer-outline", title: "Pelo" },
  { id: "cara", icon: "emoticon-outline", title: "Cara" },
  { id: "barba", icon: "face-man-outline", title: "Barba" },
  { id: "camiseta", icon: "tshirt-crew-outline", title: "Ropa" },
];

// ─── AvatarPreview ────────────────────────────────────────────────────────────

const AvatarPreview = memo(function AvatarPreview({
  avatar,
  size = 240,
}: {
  avatar: EstadoAvatar;
  size?: number;
}) {
  const svg = useMemo(
    () => generarAvatarSvg(avatar, size),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(avatar), size],
  );
  return (
    <View
      accessible
      accessibilityLabel="Vista previa de tu avatar"
      style={{ width: size, height: size }}
    >
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
});

// ─── TabBar ───────────────────────────────────────────────────────────────────

const TabBar = memo(function TabBar({
  tabActivo,
  onTabPress,
}: {
  tabActivo: string;
  onTabPress: (id: string) => void;
}) {
  return (
    <View style={estilos.tabBar} accessible={false} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const activo = tabActivo === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={estilos.tabBtn}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected: activo }}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={22}
              color={activo ? Colors.purple : "#C7C0CE"}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            {activo && (
              <View
                style={estilos.tabActiveLine}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

// ─── Flecha morada ─────────────────────────────────────────────────────────────

function FlechaSelector({
  direccion,
  onPress,
}: {
  direccion: "izquierda" | "derecha";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={estilos.flechaBtn}
      accessible
      accessibilityRole="button"
      accessibilityLabel={direccion === "izquierda" ? "Opción anterior" : "Opción siguiente"}
    >
      <MaterialCommunityIcons
        name={direccion === "izquierda" ? "chevron-left" : "chevron-right"}
        size={26}
        color="#fff"
      />
    </Pressable>
  );
}

// ─── Selector de estilo (con flechas) ──────────────────────────────────────────

function SelectorEstilo<T extends string>({
  titulo,
  opciones,
  valorActual,
  onCambiar,
}: {
  titulo: string;
  opciones: { valor: T; nombre: string }[];
  valorActual: T;
  onCambiar: (valor: T) => void;
}) {
  const indice = Math.max(
    0,
    opciones.findIndex((op) => op.valor === valorActual),
  );
  const actual = opciones[indice] ?? opciones[0];

  const mover = (delta: 1 | -1) => {
    const siguiente = (indice + delta + opciones.length) % opciones.length;
    onCambiar(opciones[siguiente].valor);
  };

  return (
    <>
      <Text style={estilos.opcionTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      <View style={estilos.selectorRow}>
        <FlechaSelector direccion="izquierda" onPress={() => mover(-1)} />
        <View
          style={estilos.valorPill}
          accessible
          accessibilityLabel={`${titulo}: ${actual.nombre}`}
        >
          <Text style={estilos.valorPillText} numberOfLines={1}>
            {actual.nombre}
          </Text>
        </View>
        <FlechaSelector direccion="derecha" onPress={() => mover(1)} />
      </View>
    </>
  );
}

// ─── Selector de color (círculo) ──────────────────────────────────────────────

function SelectorColor({
  titulo,
  colores,
  valorActual,
  onCambiar,
}: {
  titulo: string;
  colores: string[];
  valorActual: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <>
      <Text style={estilos.opcionTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      <View style={estilos.gridColores} accessible={false}>
        {colores.map((color) => {
          const activo = valorActual === color;
          return (
            <Pressable
              key={color}
              onPress={() => onCambiar(color)}
              style={[
                estilos.circleColor,
                { backgroundColor: `#${color}` },
                activo && estilos.circleSelected,
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Color ${color}${activo ? ", seleccionado" : ""}`}
              accessibilityState={{ selected: activo }}
            />
          );
        })}
      </View>
    </>
  );
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { avatar, updateAvatar } = useAvatar();

  const [tabActivo, setTabActivo] = useState("piel");

  const handleTabPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTabActivo(id);
  }, []);

  const cambiar = useCallback(
    (campo: keyof EstadoAvatar) => (valor: string) => updateAvatar(campo, valor),
    [updateAvatar],
  );

  const renderOpciones = () => {
    switch (tabActivo) {
      case "piel":
        return (
          <SelectorColor
            titulo="Tono de piel"
            colores={PIEL_COLORES}
            valorActual={avatar.skinColor}
            onCambiar={cambiar("skinColor")}
          />
        );

      case "pelo":
        return (
          <>
            <SelectorEstilo
              titulo="Pelo delantero"
              opciones={PELO_OPCIONES}
              valorActual={avatar.hair}
              onCambiar={cambiar("hair")}
            />
            <View style={{ marginTop: 20 }}>
              <SelectorEstilo
                titulo="Pelo trasero / largo"
                opciones={PELO_TRASERO_OPCIONES}
                valorActual={avatar.rearHair}
                onCambiar={cambiar("rearHair")}
              />
            </View>
            <View style={{ marginTop: 20 }}>
              <SelectorColor
                titulo="Color de pelo"
                colores={PELO_COLORES}
                valorActual={avatar.hairColor}
                onCambiar={cambiar("hairColor")}
              />
            </View>
          </>
        );

      case "cara":
        return (
          <>
            <SelectorEstilo
              titulo="Cejas"
              opciones={CEJAS_OPCIONES}
              valorActual={avatar.eyebrows}
              onCambiar={cambiar("eyebrows")}
            />
            <View style={{ marginTop: 20 }}>
              <SelectorEstilo
                titulo="Ojos"
                opciones={OJOS_OPCIONES}
                valorActual={avatar.eyes}
                onCambiar={cambiar("eyes")}
              />
            </View>
            <View style={{ marginTop: 20 }}>
              <SelectorEstilo
                titulo="Boca"
                opciones={BOCA_OPCIONES}
                valorActual={avatar.mouth}
                onCambiar={cambiar("mouth")}
              />
            </View>
          </>
        );

      case "barba":
        return (
          <SelectorEstilo
            titulo="Barba"
            opciones={BARBA_OPCIONES}
            valorActual={avatar.beard}
            onCambiar={cambiar("beard")}
          />
        );

      case "camiseta":
        return (
          <>
            <SelectorEstilo
              titulo="Prenda"
              opciones={CAMISETA_OPCIONES}
              valorActual={avatar.clothes}
              onCambiar={cambiar("clothes")}
            />
            <View style={{ marginTop: 20 }}>
              <SelectorColor
                titulo="Color"
                colores={CAMISETA_COLORES}
                valorActual={avatar.clothesColor}
                onCambiar={cambiar("clothesColor")}
              />
            </View>
          </>
        );

      default:
        return null;
    }
  };

  const cerrar = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const CloseBtn = (
    <Pressable
      onPress={cerrar}
      style={estilos.closeBtn}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Cerrar"
    >
      <MaterialCommunityIcons name="close" size={18} color="#fff" />
    </Pressable>
  );

  const tipBox = (
    <View
      style={estilos.tipBox}
      accessible
      accessibilityLabel="Consejo: personaliza tu avatar según vayas ganando estrellas, es tuyo, hazlo a tu gusto"
    >
      <MaterialCommunityIcons
        name="information-outline"
        size={20}
        color={Colors.purpleDk}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        style={estilos.tipText}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Personaliza tu avatar según vayas ganando estrellas — es tuyo, hazlo a
        tu gusto.
      </Text>
    </View>
  );

  return (
    <View style={estilos.rootMobile}>
      <LinearGradient
        colors={["#C9A9DB", Colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[estilos.banner, { paddingTop: insets.top + 16 }]}
      >
        <View style={estilos.bannerHeaderRow}>
          <Text style={estilos.bannerTitle} accessibilityRole="header">
            Tu perfil
          </Text>
          {CloseBtn}
        </View>
        <AvatarPreview avatar={avatar} size={220} />
      </LinearGradient>
      <View style={estilos.bottomPanel}>
        <TabBar tabActivo={tabActivo} onTabPress={handleTabPress} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.opcionesScroll}
          keyboardShouldPersistTaps="handled"
          accessible={false}
        >
          {renderOpciones()}
          {tipBox}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  rootMobile: { flex: 1, backgroundColor: "#fff" },
  banner: {
    width: "100%",
    paddingHorizontal: 22,
    paddingBottom: 16,
    alignItems: "center",
    gap: 14,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  bannerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  bannerTitle: {
    fontFamily: AppFonts.displayBold,
    fontSize: 20,
    color: "#fff",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPanel: { flex: 1, backgroundColor: "#fff" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.purpleLt,
    backgroundColor: "#fff",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    position: "relative",
    minHeight: 52,
  },
  tabActiveLine: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.purple,
  },

  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    backgroundColor: Colors.purpleBg,
    borderRadius: 18,
    padding: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: AppFonts.body,
    color: Colors.purpleDk,
    lineHeight: 18,
  },

  opcionesScroll: { padding: 20, paddingBottom: 40 },
  opcionTitulo: {
    fontSize: 16,
    fontFamily: AppFonts.displayBold,
    color: "#333",
    marginBottom: 14,
  },

  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  flechaBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  valorPill: {
    flex: 1,
    maxWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.purple,
    backgroundColor: Colors.purpleBg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  valorPillText: {
    fontSize: 15,
    fontFamily: AppFonts.bodyBold,
    color: Colors.purpleDk,
    textAlign: "center",
  },
  gridColores: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  circleColor: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#DDD",
  },
  circleSelected: {
    borderWidth: 4,
    borderColor: Colors.purple,
    shadowColor: Colors.purple,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
