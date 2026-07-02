import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAjustesCtx } from "../../context/AjustesContext";
import { useAvatar } from "../../context/AvatarContext";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TONOS_PIEL = ["#F5C89A", "#D4956A", "#C17840", "#8B5E3C", "#7B3F2C"];
const COLORES_PELO = [
  "#1a1a1a",
  "#3B1F0E",
  "#8B4513",
  "#DAA520",
  "#E8C47A",
  "#E8E8E8",
];
const NOMBRES_TONO = ["Muy claro", "Claro", "Medio", "Medio oscuro", "Oscuro"];
const NOMBRES_PELO = [
  "Negro",
  "Marrón oscuro",
  "Castaño",
  "Rubio oscuro",
  "Rubio claro",
  "Blanco",
];

const PURPLE = "#e9d3f5";

const TABS = [
  { id: "genero", icon: "account-outline", title: "Género" },
  { id: "piel", icon: "palette-outline", title: "Tono de piel" },
  { id: "cara", icon: "emoticon-outline", title: "Cara" },
  { id: "pelo", icon: "hair-dryer-outline", title: "Pelo" },
  { id: "colorPelo", icon: "brush-outline", title: "Color de pelo" },
  { id: "camiseta", icon: "tshirt-crew-outline", title: "Camiseta" },
];

// ─── Imágenes ─────────────────────────────────────────────────────────────────

// Caras hombre: [tono0..tono4] por cada cara
const CARAS_HOMBRE = [
  [
    require("../../assets/images/avatar/cara_h1_t1.png"),
    require("../../assets/images/avatar/cara_h1_t2.png"),
    require("../../assets/images/avatar/cara_h1_t3.png"),
    require("../../assets/images/avatar/cara_h1_t4.png"),
    require("../../assets/images/avatar/cara_h1_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_h2_t1.png"),
    require("../../assets/images/avatar/cara_h2_t2.png"),
    require("../../assets/images/avatar/cara_h2_t3.png"),
    require("../../assets/images/avatar/cara_h2_t4.png"),
    require("../../assets/images/avatar/cara_h2_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_h3_t1.png"),
    require("../../assets/images/avatar/cara_h3_t2.png"),
    require("../../assets/images/avatar/cara_h3_t3.png"),
    require("../../assets/images/avatar/cara_h3_t4.png"),
    require("../../assets/images/avatar/cara_h3_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_h4_t1.png"),
    require("../../assets/images/avatar/cara_h4_t2.png"),
    require("../../assets/images/avatar/cara_h4_t3.png"),
    require("../../assets/images/avatar/cara_h4_t4.png"),
    require("../../assets/images/avatar/cara_h4_t5.png"),
  ],
];

// Caras mujer: [tono0..tono4] por cada cara
const CARAS_MUJER = [
  [
    require("../../assets/images/avatar/cara_m1_t1.png"),
    require("../../assets/images/avatar/cara_m1_t2.png"),
    require("../../assets/images/avatar/cara_m1_t3.png"),
    require("../../assets/images/avatar/cara_m1_t4.png"),
    require("../../assets/images/avatar/cara_m1_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_m2_t1.png"),
    require("../../assets/images/avatar/cara_m2_t2.png"),
    require("../../assets/images/avatar/cara_m2_t3.png"),
    require("../../assets/images/avatar/cara_m2_t4.png"),
    require("../../assets/images/avatar/cara_m2_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_m3_t1.png"),
    require("../../assets/images/avatar/cara_m3_t2.png"),
    require("../../assets/images/avatar/cara_m3_t3.png"),
    require("../../assets/images/avatar/cara_m3_t4.png"),
    require("../../assets/images/avatar/cara_m3_t5.png"),
  ],
  [
    require("../../assets/images/avatar/cara_m4_t1.png"),
    require("../../assets/images/avatar/cara_m4_t2.png"),
    require("../../assets/images/avatar/cara_m4_t3.png"),
    require("../../assets/images/avatar/cara_m4_t4.png"),
    require("../../assets/images/avatar/cara_m4_t5.png"),
  ],
];

// Camisetas: [tono0..tono4] por cada color
const CAMISETAS = [
  [
    require("../../assets/images/avatar/camiseta_rosa_1.png"),
    require("../../assets/images/avatar/camiseta_rosa_2.png"),
    require("../../assets/images/avatar/camiseta_rosa_3.png"),
    require("../../assets/images/avatar/camiseta_rosa_4.png"),
    require("../../assets/images/avatar/camiseta_rosa_5.png"),
  ],
  [
    require("../../assets/images/avatar/camiseta_azul_1.png"),
    require("../../assets/images/avatar/camiseta_azul_2.png"),
    require("../../assets/images/avatar/camiseta_azul_3.png"),
    require("../../assets/images/avatar/camiseta_azul_4.png"),
    require("../../assets/images/avatar/camiseta_azul_5.png"),
  ],
  [
    require("../../assets/images/avatar/camiseta_morada_1.png"),
    require("../../assets/images/avatar/camiseta_morada_2.png"),
    require("../../assets/images/avatar/camiseta_morado_3.png"),
    require("../../assets/images/avatar/camiseta_morado_4.png"),
    require("../../assets/images/avatar/camiseta_morada_5.png"),
  ],
  [
    require("../../assets/images/avatar/camiseta_verde_1.png"),
    require("../../assets/images/avatar/camiseta_verde_2.png"),
    require("../../assets/images/avatar/camiseta_verde_3.png"),
    require("../../assets/images/avatar/camiseta_verde_4.png"),
    require("../../assets/images/avatar/camiseta_verde_5.png"),
  ],
];

const PELO_CORTO_MUJER = [
  require("../../assets/images/avatar/pelo1.png"),
  require("../../assets/images/avatar/pelo3.png"),
];

const PELO_LARGO_MUJER = [
  require("../../assets/images/avatar/pelo5.png"),
  require("../../assets/images/avatar/pelo6.png"),
];

const PELO_CORTO_HOMBRE = [
  require("../../assets/images/avatar/pelo_hombre_1.png"),
];

const PELO_LARGO_HOMBRE = [
  require("../../assets/images/avatar/pelo_hombre_3.png"),
  require("../../assets/images/avatar/pelo_hombre_4.png"),
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AvatarPreviewProps {
  size?: number;
  tonoPiel: number;
  shirt: number;
  cara: number;
  peloCorto: number;
  peloLargo: number;
  colorPeloSeguro: string;
  genero: "hombre" | "mujer";
}

interface TabBarProps {
  tabActivo: string;
  onTabPress: (id: string) => void;
}

// ─── AvatarPreview ────────────────────────────────────────────────────────────

const AvatarPreview = memo(function AvatarPreview({
  size = 290,
  tonoPiel,
  shirt,
  cara,
  peloCorto,
  peloLargo,
  colorPeloSeguro,
  genero,
}: AvatarPreviewProps) {
  const peloCortoOptions =
    genero === "mujer" ? PELO_CORTO_MUJER : PELO_CORTO_HOMBRE;
  const peloLargoOptions =
    genero === "mujer" ? PELO_LARGO_MUJER : PELO_LARGO_HOMBRE;
  const caras = genero === "mujer" ? CARAS_MUJER : CARAS_HOMBRE;
  const caraImg = caras[cara]?.[tonoPiel] ?? caras[0][0];
  // shirt es el índice de COLOR de camiseta (0=rosa,1=azul,2=morada,3=verde)
  const camisetaImg = CAMISETAS[shirt]?.[tonoPiel] ?? CAMISETAS[0][0];

  return (
    <View
      style={{ width: size, height: size * 1.2, position: "relative" }}
      accessible
      accessibilityLabel="Vista previa de tu avatar"
    >
      {/* Camiseta */}
      <Image
        source={camisetaImg}
        style={{
          position: "absolute",
          top: size * 0.65,
          left: -size * 0.49,
          width: size * 2,
          height: size * 1.35,
          zIndex: 3,
        }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {/* Cara */}
      <Image
        source={caraImg}
        style={{
          position: "absolute",
          top: genero === "mujer" ? -size * 0.02 : -size * 0.02,
          left: genero === "mujer" ? size * 0.12 : size * 0.09,
          width: genero === "mujer" ? size * 0.8 : size * 0.8,
          height: genero === "mujer" ? size : size,
          zIndex: 1,
        }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {/* Pelo corto */}
      {peloCorto >= 0 && peloCortoOptions[peloCorto] && (
        <Image
          source={peloCortoOptions[peloCorto]}
          style={{
            position: "absolute",
            top: genero === "mujer" ? -size * 0.22 : -size * 0.17,
            left: genero === "mujer" ? size * 0.16 : size * 0.1,
            width: genero === "mujer" ? size * 0.7 : size * 0.85,
            height: genero === "mujer" ? size * 0.8 : size * 0.9,
            zIndex: 4,
            tintColor: colorPeloSeguro,
          }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
      {/* Pelo largo */}
      {peloCorto < 0 && peloLargo >= 0 && peloLargoOptions[peloLargo] && (
        <Image
          source={peloLargoOptions[peloLargo]}
          style={{
            position: "absolute",
            top: genero === "mujer" ? -size * 0.6 : -size * 0.6,
            left: genero === "mujer" ? size * 0.12 : -size * 0.04,
            width: genero === "mujer" ? size * 0.75 : size * 1.1,
            height: genero === "mujer" ? size * 2 : size * 2,
            zIndex: 4,
            tintColor: colorPeloSeguro,
          }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
});

// ─── TabBar ───────────────────────────────────────────────────────────────────

const TabBar = memo(function TabBar({
  tabActivo,
  onTabPress,
  escala = 1,
}: TabBarProps & { escala?: number }) {
  return (
    <View style={estilos.tabBar} accessible={false} accessibilityRole="tablist">
      {TABS.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onTabPress(tab.id)}
          style={[estilos.tabBtn, tabActivo === tab.id && estilos.tabBtnActive]}
          accessible
          accessibilityRole="tab"
          accessibilityLabel={tab.title}
          accessibilityState={{ selected: tabActivo === tab.id }}
        >
          <Text
            style={[
              estilos.tabEmoji,
              { fontSize: Math.round(22 * escala) },
              tabActivo === tab.id && { opacity: 1 },
            ]}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Text>
          {tabActivo === tab.id && (
            <View
              style={estilos.tabActiveLine}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>
      ))}
    </View>
  );
});

// ─── Perfil ───────────────────────────────────────────────────────────────────

export default function Perfil() {
  const { escala, colores } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { avatar, updateAvatar } = useAvatar();
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt, genero } =
    avatar;

  const [tabActivo, setTabActivo] = useState("genero");

  const handleTabPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTabActivo(id);
  }, []);

  const colorPeloSeguro = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];
  const carasActuales = genero === "mujer" ? CARAS_MUJER : CARAS_HOMBRE;

  const renderOpciones = useCallback(() => {
    switch (tabActivo) {
      case "genero":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Género
            </Text>
            <View style={estilos.gridColores} accessible={false}>
              {(["hombre", "mujer"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    updateAvatar("genero" as any, g as any);
                    updateAvatar("cara", 0);
                  }}
                  style={[
                    estilos.generoBtn,
                    genero === g && estilos.generoBtnActive,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={g === "hombre" ? "Hombre" : "Mujer"}
                  accessibilityState={{ selected: genero === g }}
                >
                  <Text
                    style={[
                      estilos.generoBtnText,
                      genero === g && estilos.generoBtnTextActive,
                    ]}
                  >
                    {g === "hombre" ? "👦 Hombre" : "👧 Mujer"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );

      case "piel":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Tono de piel
            </Text>
            <View style={estilos.gridColores} accessible={false}>
              {TONOS_PIEL.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar("tonoPiel", i)}
                  style={[
                    estilos.circleColor,
                    { backgroundColor: color },
                    tonoPiel === i && estilos.circleSelected,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Tono de piel ${NOMBRES_TONO[i]}${tonoPiel === i ? ", seleccionado" : ""}`}
                  accessibilityHint="Pulsa para cambiar el tono de piel de tu avatar"
                  accessibilityState={{ selected: tonoPiel === i }}
                />
              ))}
            </View>
          </>
        );

      case "cara":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Cara
            </Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {carasActuales.map((caraOpts, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar("cara", i)}
                  style={[
                    estilos.imgCard,
                    cara === i && estilos.imgCardSelected,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Cara opción ${i + 1}${cara === i ? ", seleccionada" : ""}`}
                  accessibilityHint="Pulsa para usar esta cara en tu avatar"
                  accessibilityState={{ selected: cara === i }}
                >
                  <Image
                    source={caraOpts[tonoPiel] ?? caraOpts[0]}
                    style={estilos.imgCardImg}
                    resizeMode="contain"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>
          </>
        );

      case "pelo":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Pelo corto
            </Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {/* Opción sin pelo - solo hombre */}
              {genero === "hombre" && (
                <Pressable
                  onPress={() => {
                    updateAvatar("peloCorto", -1);
                    updateAvatar("peloLargo", -1);
                  }}
                  style={[
                    estilos.imgCard,
                    peloCorto === -1 &&
                      peloLargo === -1 &&
                      estilos.imgCardSelected,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Sin pelo"
                  accessibilityState={{
                    selected: peloCorto === -1 && peloLargo === -1,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "700", color: "#888" }}
                  >
                    No
                  </Text>
                </Pressable>
              )}
              {(genero === "mujer" ? PELO_CORTO_MUJER : PELO_CORTO_HOMBRE).map(
                (img, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      updateAvatar("peloCorto", i);
                      updateAvatar("peloLargo", -1);
                    }}
                    style={[
                      estilos.imgCard,
                      peloCorto === i && estilos.imgCardSelected,
                    ]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Pelo corto opción ${i + 1}${peloCorto === i ? ", seleccionado" : ""}`}
                    accessibilityHint="Pulsa para usar este pelo en tu avatar"
                    accessibilityState={{ selected: peloCorto === i }}
                  >
                    <Image
                      source={img}
                      style={[
                        estilos.imgCardImg,
                        { tintColor: colorPeloSeguro },
                      ]}
                      resizeMode="contain"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      accessibilityIgnoresInvertColors
                    />
                  </Pressable>
                ),
              )}
            </View>

            <Text
              style={[
                estilos.opcionTitulo,
                { fontSize: fs(16) },
                { marginTop: 20 },
              ]}
              accessibilityRole="header"
            >
              Pelo largo
            </Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {(genero === "mujer" ? PELO_LARGO_MUJER : PELO_LARGO_HOMBRE).map(
                (img, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      updateAvatar("peloLargo", i);
                      updateAvatar("peloCorto", -1);
                    }}
                    style={[
                      estilos.imgCard,
                      peloLargo === i && estilos.imgCardSelected,
                    ]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Pelo largo opción ${i + 1}${peloLargo === i ? ", seleccionado" : ""}`}
                    accessibilityHint="Pulsa para usar este pelo en tu avatar"
                    accessibilityState={{ selected: peloLargo === i }}
                  >
                    <Image
                      source={img}
                      style={[
                        estilos.imgCardImg,
                        { tintColor: colorPeloSeguro },
                      ]}
                      resizeMode="contain"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      accessibilityIgnoresInvertColors
                    />
                  </Pressable>
                ),
              )}
            </View>
          </>
        );

      case "colorPelo":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Color de pelo
            </Text>
            <View style={estilos.gridColores} accessible={false}>
              {COLORES_PELO.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar("colorPelo", i)}
                  style={[
                    estilos.circleColor,
                    { backgroundColor: color },
                    colorPelo === i && estilos.circleSelected,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Color de pelo ${NOMBRES_PELO[i]}${colorPelo === i ? ", seleccionado" : ""}`}
                  accessibilityHint="Pulsa para cambiar el color del pelo de tu avatar"
                  accessibilityState={{ selected: colorPelo === i }}
                />
              ))}
            </View>
          </>
        );

      case "camiseta":
        return (
          <>
            <Text
              style={[estilos.opcionTitulo, { fontSize: fs(16) }]}
              accessibilityRole="header"
            >
              Camiseta
            </Text>
            <View style={estilos.gridImagenes} accessible={false}>
              {CAMISETAS.map((camisetaOpts, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar("shirt", i)}
                  style={[
                    estilos.imgCard,
                    shirt === i && estilos.imgCardSelected,
                  ]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Camiseta opción ${i + 1}${shirt === i ? ", seleccionada" : ""}`}
                  accessibilityHint="Pulsa para usar esta camiseta en tu avatar"
                  accessibilityState={{ selected: shirt === i }}
                >
                  <Image
                    source={camisetaOpts[tonoPiel] ?? camisetaOpts[0]}
                    style={estilos.imgCardImg}
                    resizeMode="contain"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    accessibilityIgnoresInvertColors
                  />
                </Pressable>
              ))}
            </View>
          </>
        );

      default:
        return null;
    }
  }, [
    tabActivo,
    tonoPiel,
    cara,
    colorPelo,
    peloCorto,
    peloLargo,
    colorPeloSeguro,
    shirt,
    genero,
    carasActuales,
    updateAvatar,
    fs,
  ]);

  const avatarProps: AvatarPreviewProps = {
    tonoPiel,
    shirt,
    cara,
    peloCorto,
    peloLargo,
    colorPeloSeguro,
    genero,
  };

  if (isTablet) {
    return (
      <View style={estilos.rootTablet}>
        <View
          style={estilos.leftPanel}
          accessible
          accessibilityLabel="Vista previa del avatar"
        >
          <View style={estilos.avatarBgTablet}>
            <AvatarPreview {...avatarProps} size={220} />
          </View>
        </View>
        <View style={estilos.rightPanel}>
          <TabBar
            tabActivo={tabActivo}
            onTabPress={handleTabPress}
            escala={escala}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={estilos.opcionesScroll}
            accessible={false}
          >
            {renderOpciones()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={estilos.rootMobile}>
      <View
        style={estilos.avatarBgMobile}
        accessible
        accessibilityLabel="Vista previa del avatar"
      >
        <AvatarPreview {...avatarProps} size={180} />
      </View>
      <View style={estilos.bottomPanel}>
        <TabBar
          tabActivo={tabActivo}
          onTabPress={handleTabPress}
          escala={escala}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.opcionesScroll}
          keyboardShouldPersistTaps="handled"
          accessible={false}
        >
          {renderOpciones()}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  rootTablet: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderColor: "#EEE",
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
    width: 700,
    height: 500,
    alignSelf: "center",
    marginTop: 40,
  },
  leftPanel: {
    width: 320,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBgTablet: {
    width: 280,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  rightPanel: { flex: 1, backgroundColor: "#fff" },

  rootMobile: { flex: 1, backgroundColor: "#fff" },
  avatarBgMobile: {
    width: "100%",
    height: 500,
    backgroundColor: PURPLE,
    marginTop: -80,
    paddingBottom: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomPanel: { flex: 1, backgroundColor: "#fff" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#EEE",
    backgroundColor: "#fff",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    position: "relative",
    opacity: 0.45,
    minHeight: 52,
  },
  tabBtnActive: { opacity: 1 },
  tabEmoji: { fontSize: 22 },
  tabActiveLine: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },

  opcionesScroll: { padding: 20, paddingBottom: 40 },
  opcionTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
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
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  gridImagenes: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgCard: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  imgCardSelected: {
    borderColor: PURPLE,
    borderWidth: 3,
    backgroundColor: "#F0E8F8",
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  imgCardImg: { width: 72, height: 72 },

  generoBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 44,
  },
  generoBtnActive: {
    borderColor: PURPLE,
    backgroundColor: "#F0E8F8",
  },
  generoBtnText: { fontSize: 16, fontWeight: "600", color: "#555" },
  generoBtnTextActive: { color: "#7B5A9A" },
});
