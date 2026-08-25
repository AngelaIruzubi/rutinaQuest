import { useDBReady } from "@/context/Dbreadycontext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Image,
  Linking,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import { StarRow } from "../../../components/ui/StarRow";
import { DIAS_CORTOS, DIAS_LARGOS } from "../../../constants/diasSemana";
import { AppFonts, Colors } from "../../../constants/theme";
import { useAjustesCtx } from "../../../context/AjustesContext";
import { useAvatar } from "../../../context/AvatarContext";
import { getTareasHistorial } from "../../../database/database";
import { useGamificacion } from "../../../hooks/useGamificacion";
import { EstadoAvatar } from "../../../types/avatar";
import { Tarea } from "../../../types/tarea";
import { fechaAppDate, hoyAppStr } from "../../../utils/fecha";
import {
  diasDeSemana,
  etiquetaSemana,
  lunesDe,
  toLocalDateStr,
} from "../../../utils/fechaFormato";
import { generarAvatarSvg } from "../../../utils/avatarDicebear";

const PURPLE = Colors.purple;
const ORANGE = Colors.orange;
const PURPLE_LT = Colors.purpleLt;
const PURPLE_BG = Colors.purpleBg;
const GREEN = Colors.green;
const RED = Colors.red;
const GOLD = Colors.gold;

function fechaReferencia(t: Tarea): string {
  if (t.estado === "completada" || (t.completed && !t.estado)) {
    return t.fechaCompletada ?? t.fechaDia ?? "";
  }
  return t.fechaDia ?? t.fechaCompletada ?? "";
}

//Renderiza el avatar
function AvatarMini({
  avatar,
  size = 120,
}: {
  avatar: EstadoAvatar;
  size?: number;
}) {
  const svg = useMemo(() => generarAvatarSvg(avatar, size), [avatar, size]);
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}

function TarjetaCompartir({
  avatar,
  gami,
  tareasUltimaSemana,
}: {
  avatar: any;
  gami: any;
  tareasUltimaSemana: any[];
}) {
  const medallaEmoji = gami.medalla
    ? ({ bronce: "🥉", plata: "🥈", oro: "🥇" } as any)[gami.medalla]
    : null;
  const completadas = tareasUltimaSemana.filter(
    (t) => t.estado === "completada" || (t.completada === 1 && !t.estado),
  );
  const canceladas = tareasUltimaSemana.filter(
    (t) => t.estado === "cancelada" || t.estado === "vencida",
  );

  return (
    <View
      style={tc.card}
      collapsable={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={tc.header}>
        <Text style={tc.headerTxt}>🌟 RutinaQuest</Text>
      </View>
      <View style={tc.avatarRow}>
        <View style={tc.avatarWrap}>
          <AvatarMini avatar={avatar} size={110} />
        </View>
        <View style={tc.statsCol}>
          <Text style={tc.statLine}>⭐ {gami.estrellas} estrellas</Text>
          <Text style={tc.statLine}>🔥 {gami.racha} días de racha</Text>
          {medallaEmoji && (
            <Text style={tc.statLine}>
              {medallaEmoji} Medalla de {gami.medalla}
            </Text>
          )}
          <View style={tc.statsDivider} />
          <Text style={tc.statLine}>✅ {completadas.length} esta semana</Text>
          <Text style={tc.statLine}>❌ {canceladas.length} canceladas</Text>
        </View>
      </View>
      {tareasUltimaSemana.length > 0 && (
        <View style={tc.tareasSection}>
          <Text style={tc.tareasSectionTitle}>Esta semana</Text>
          {tareasUltimaSemana.slice(0, 10).map((t, i) => {
            const ok =
              t.estado === "completada" || (t.completada === 1 && !t.estado);
            return (
              <View key={i} style={tc.tareaFila}>
                <Text style={tc.tareaEmoji}>{ok ? "✅" : "❌"}</Text>
                <Text
                  style={[
                    tc.tareaTxt,
                    !ok && {
                      color: "#AAA",
                      textDecorationLine: "line-through",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t.title}
                </Text>
                <Text style={tc.tareaStars}>
                  {"★".repeat(t.stars ?? (ok ? 5 : 0))}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      <Text style={tc.footer}>
        {new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}
      </Text>
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: PURPLE_LT,
  },
  header: {
    backgroundColor: PURPLE,
    paddingVertical: 12,
    alignItems: "center",
  },
  headerTxt: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
    backgroundColor: PURPLE_BG,
  },
  avatarWrap: { width: 110, height: 132, overflow: "hidden" },
  statsCol: { flex: 1, gap: 4 },
  statLine: { fontSize: 13, color: "#444", fontWeight: "600" },
  statsDivider: { height: 1, backgroundColor: PURPLE_LT, marginVertical: 4 },
  tareasSection: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  tareasSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#BBB",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tareaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  tareaEmoji: { fontSize: 14 },
  tareaTxt: { flex: 1, fontSize: 13, color: "#333", fontWeight: "500" },
  tareaStars: { fontSize: 11, color: GOLD },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "#BBB",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PURPLE_LT,
  },
});

export default function Historial() {
  const { escala, colores } = useAjustesCtx();
  const ts = useMemo(
    () => ({
      seccionTitulo: { fontSize: Math.round(11 * escala) },
      tareaTitle: { fontSize: Math.round(14 * escala) },
      tareaHora: { fontSize: Math.round(12 * escala) },
      tareaStars: { fontSize: Math.round(13 * escala) },
    }),
    [escala],
  );
  const gami = useGamificacion();
  const { avatar } = useAvatar();
  const shotRef = useRef<any>(null);

  const [search, setSearch] = useState("");
  const dbReady = useDBReady();
  const [historial, setHistorial] = useState<Tarea[]>([]);
  const [compartiendo, setCompartiendo] = useState(false);
  const [modalCaptura, setModalCaptura] = useState(false);
  const [destinoPend, setDestinoPend] = useState<
    "whatsapp" | "gmail" | "nativo" | null
  >(null);
  const [semanaActual, setSemanaActual] = useState(() =>
    lunesDe(fechaAppDate()),
  );

  const hoy = hoyAppStr();
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      (async () => {
        const rows = (await getTareasHistorial()) as any[];
        if (cancelado) return;
        const mapped = rows.map((r) => ({
          ...r,
          completed: r.completed === 1,
        }));
        setHistorial(mapped);
      })();
      return () => {
        cancelado = true;
      };
    }, [dbReady]),
  );

  const esMismaSemana = (lunes: Date) =>
    toLocalDateStr(lunes) === toLocalDateStr(lunesDe(fechaAppDate()));

  const irAnterior = () =>
    setSemanaActual((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      setDiaSeleccionado(toLocalDateStr(d));
      return d;
    });
  const irSiguiente = () =>
    setSemanaActual((prev) => {
      if (esMismaSemana(prev)) return prev;
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      setDiaSeleccionado(esMismaSemana(d) ? hoy : toLocalDateStr(d));
      return d;
    });

  const esEstaSemana = esMismaSemana(semanaActual);
  const dias = diasDeSemana(semanaActual);

  const tareasUltimaSemana = historial.filter((t) =>
    dias.includes(fechaReferencia(t)),
  );

  const tareasDelDia = historial.filter(
    (t) =>
      fechaReferencia(t) === diaSeleccionado &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );
  const completadasDia = tareasDelDia.filter(
    (t) => t.estado === "completada" || (t.completed && !t.estado),
  );
  const canceladasDia = tareasDelDia.filter((t) => t.estado === "cancelada");
  const vencidasDia = tareasDelDia.filter((t) => t.estado === "vencida");

  const nombreDia = new Date(diaSeleccionado + "T12:00:00").toLocaleDateString(
    "es-ES",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const renderFila = (
    item: Tarea,
    tipo: "completada" | "cancelada" | "vencida",
  ) => {
    const completada = tipo === "completada";
    const colorEstado =
      tipo === "completada" ? GREEN : tipo === "cancelada" ? RED : ORANGE;
    const etiquetaEstado = tipo === "cancelada" ? "Eliminada" : "Saltada";
    const a11y = completada
      ? `${item.title}, ${item.stars ?? 5} de 5 estrellas${item.hora && item.hora !== "Sin hora" ? `, hora ${item.hora}` : ""}`
      : `${item.title}, ${etiquetaEstado.toLowerCase()}${item.hora && item.hora !== "Sin hora" ? `, hora ${item.hora}` : ""}`;

    return (
      <View
        key={item.id}
        style={[styles.listRow, { borderLeftColor: colorEstado }]}
        accessible
        accessibilityLabel={a11y}
      >
        {item.pictogramId && (
          <Image
            source={{
              uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png`,
            }}
            style={styles.listPictogram}
            accessibilityElementsHidden
            importantForAccessibility="no"
            accessibilityIgnoresInvertColors
          />
        )}
        <View style={styles.listInfo}>
          <Text
            style={[
              styles.listTitle,
              ts.tareaTitle,
              !completada && styles.listTitleTachado,
            ]}
            numberOfLines={2}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {item.title}
          </Text>
          {item.hora && item.hora !== "Sin hora" && (
            <Text
              style={[styles.listHora, ts.tareaHora]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {item.hora}
            </Text>
          )}
        </View>
        {completada ? (
          <StarRow count={item.stars ?? 5} size={13} />
        ) : (
          <View
            style={[
              styles.listStatusBadge,
              { backgroundColor: colorEstado + "18" },
            ]}
          >
            <Text
              style={[styles.listStatusText, { color: colorEstado }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {etiquetaEstado}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const buildTextoCompartir = () => {
    const completadas = tareasUltimaSemana.filter(
      (t) => t.estado === "completada" || (t.completed && !t.estado),
    );
    const canceladas = tareasUltimaSemana.filter(
      (t) => t.estado === "cancelada" || t.estado === "vencida",
    );
    const medallaEmoji = gami.medalla
      ? ({ bronce: "🥉", plata: "🥈", oro: "🥇" } as any)[gami.medalla]
      : "";
    return [
      "🌟 RutinaQuest · Mi historial",
      "",
      `⭐ ${gami.estrellas} estrellas`,
      `🔥 ${gami.racha} días de racha`,
      medallaEmoji ? `${medallaEmoji} Medalla de ${gami.medalla}` : "",
      "",
      `✅ ${completadas.length} completadas esta semana`,
      `❌ ${canceladas.length} canceladas`,
      "",
      "📋 Tareas de la semana:",
      ...tareasUltimaSemana.slice(0, 10).map((t) => {
        const ok = t.estado === "completada" || (t.completed && !t.estado);
        return `${ok ? "✅" : "❌"} ${t.title}`;
      }),
      "",
      new Date().toLocaleDateString("es-ES", { dateStyle: "long" }),
    ]
      .filter(Boolean)
      .join("\n");
  };

  const iniciarCompartir = (destino: "whatsapp" | "gmail" | "nativo") => {
    if (historial.length === 0) {
      Alert.alert(
        "Sin historial",
        "Aún no tienes tareas completadas para exportar.",
      );
      return;
    }

    const texto = buildTextoCompartir();

    if (Platform.OS === "web") {
      if (destino === "whatsapp") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(texto)}`,
          "_blank",
        );
      } else if (destino === "gmail") {
        window.open(
          `mailto:?subject=${encodeURIComponent("Mi historial de RutinaQuest")}&body=${encodeURIComponent(texto)}`,
          "_self",
        );
      } else {
        if (navigator.share) {
          navigator
            .share({ title: "Mi historial de RutinaQuest", text: texto })
            .catch(() => {});
        } else {
          navigator.clipboard.writeText(texto).then(() => {
            Alert.alert(
              "Copiado",
              "El historial se ha copiado al portapapeles.",
            );
          });
        }
      }
      return;
    }

    if (destino === "gmail") {
      Linking.openURL(
        `mailto:?subject=${encodeURIComponent("Mi historial de RutinaQuest")}&body=${encodeURIComponent(texto)}`,
      );
      return;
    }

    setDestinoPend(destino);
    setModalCaptura(true);
  };

  const onModalListo = async () => {
    if (!destinoPend) return;
    setCompartiendo(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const uri: string = await shotRef.current.capture();

      if (Platform.OS === "ios") {
        setCompartiendo(false);
        setModalCaptura(false);
        setDestinoPend(null);
        await new Promise((r) => setTimeout(r, 350));
        const disponible = await Sharing.isAvailableAsync();
        if (disponible) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Compartir perfil RutinaQuest",
            UTI: "public.png",
          });
        }
      } else {
        setCompartiendo(false);
        setModalCaptura(false);
        setDestinoPend(null);
        await new Promise((r) => setTimeout(r, 100));
        await Share.share({
          message: buildTextoCompartir(),
          title: "Mi historial de RutinaQuest",
        });
      }
    } catch (e: any) {
      console.warn("Error compartir:", e?.message ?? e);
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setCompartiendo(false);
      setModalCaptura(false);
      setDestinoPend(null);
    }
  };

  return (
    <View style={styles.root}>
      <Modal
        visible={modalCaptura}
        transparent
        animationType="none"
        onShow={onModalListo}
        accessibilityViewIsModal={false}
      >
        <View
          style={styles.modalCapturaOverlay}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ViewShot
            ref={shotRef}
            options={{ format: "png", quality: 1, result: "tmpfile" }}
          >
            <TarjetaCompartir
              avatar={avatar}
              gami={gami}
              tareasUltimaSemana={tareasUltimaSemana}
            />
          </ViewShot>
          {compartiendo && (
            <View style={styles.capturaLoading}>
              <Text style={styles.capturaLoadingTxt}>Preparando imagen...</Text>
            </View>
          )}
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        accessible={false}
      >
      <View style={styles.topSection}>
        {/* Título + compartir */}
        <View style={styles.headerRow} accessible={false}>
          <Text
            style={styles.titulo}
            accessibilityRole="header"
          >
            Historial
          </Text>

          <View style={styles.shareBtnsRow} accessible={false}>
            <Pressable
              onPress={() => iniciarCompartir("whatsapp")}
              disabled={compartiendo}
              style={[
                styles.iconBtn,
                { backgroundColor: "#25D366" },
                compartiendo && { opacity: 0.5 },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Compartir por WhatsApp"
              accessibilityState={{ disabled: compartiendo }}
            >
              <Ionicons
                name="logo-whatsapp"
                size={17}
                color="#fff"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>

            <Pressable
              onPress={() => iniciarCompartir("nativo")}
              disabled={compartiendo}
              style={[
                styles.iconBtn,
                { backgroundColor: PURPLE },
                compartiendo && { opacity: 0.5 },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                compartiendo
                  ? "Preparando imagen"
                  : "Más opciones para compartir"
              }
              accessibilityState={{ disabled: compartiendo }}
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color="#fff"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          </View>
        </View>

        {/* Buscador */}
        <View
          style={styles.searchBar}
          accessible
          accessibilityRole="search"
          accessibilityLabel="Buscar tarea en historial"
        >
          <TextInput
            placeholder="Buscar tarea..."
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 15 }}
            accessibilityLabel="Campo de búsqueda"
            accessibilityHint="Filtra las tareas del historial por nombre"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <Ionicons
            name="search"
            size={18}
            color="#999"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>

        {/* Selector semana */}
        <View style={styles.weekSelector} accessible={false}>
          <Pressable
            onPress={irAnterior}
            style={[
              styles.weekArrow,
              {
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
          >
            <Ionicons name="chevron-back" size={22} color={PURPLE} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={styles.weekLabel}
              accessibilityLabel={`Semana del ${etiquetaSemana(semanaActual)}`}
            >
              {etiquetaSemana(semanaActual)}
            </Text>
          </View>

          <Pressable
            onPress={irSiguiente}
            disabled={esEstaSemana}
            style={[
              styles.weekArrow,
              esEstaSemana && { opacity: 0.3 },
              {
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Semana siguiente"
            accessibilityState={{ disabled: esEstaSemana }}
          >
            <Ionicons name="chevron-forward" size={22} color={PURPLE} />
          </Pressable>
        </View>

        {/* Tira de días */}
        <View style={styles.daysStrip} accessible={false}>
          {dias.map((fecha, idx) => {
            const sel = fecha === diaSeleccionado;
            const esHoy = fecha === hoy;

            const nC = historial.filter(
              (t) =>
                fechaReferencia(t) === fecha &&
                (t.estado === "completada" || (t.completed && !t.estado)),
            ).length;
            const nX = historial.filter(
              (t) =>
                fechaReferencia(t) === fecha &&
                (t.estado === "cancelada" || t.estado === "vencida"),
            ).length;

            const partes = [DIAS_LARGOS[idx]];
            if (esHoy) partes.push("hoy");
            if (sel) partes.push("seleccionado");
            if (nC > 0) partes.push(`${nC} completada${nC > 1 ? "s" : ""}`);
            if (nX > 0) partes.push(`${nX} no realizada${nX > 1 ? "s" : ""}`);

            return (
              <Pressable
                key={fecha}
                onPress={() => {
                  setDiaSeleccionado(fecha);
                  AccessibilityInfo.announceForAccessibility(partes.join(", "));
                }}
                style={[
                  styles.dayBtn,
                  sel && styles.dayBtnSel,
                  esHoy && !sel && styles.dayBtnHoy,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={partes.join(", ")}
                accessibilityState={{ selected: sel }}
              >
                <Text
                  style={[
                    styles.dayBtnLbl,
                    sel && { color: "#fff" },
                    esHoy && !sel && { color: PURPLE },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {DIAS_CORTOS[idx]}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 2, marginTop: 3 }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {nC > 0 && (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: sel ? "#fff" : GREEN },
                      ]}
                    />
                  )}
                  {nX > 0 && (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: sel ? "#fcc" : RED },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.diaHeader}>
          <Text
            style={styles.diaNombre}
            accessibilityLabel={
              diaSeleccionado === hoy ? `Hoy, ${nombreDia}` : nombreDia
            }
          >
            {diaSeleccionado === hoy
              ? `Hoy · ${nombreDia}`
              : nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}
          </Text>
          {tareasDelDia.length > 0 && (
            <View
              style={styles.diaBadgesRow}
              accessible
              accessibilityLabel={`${completadasDia.length} realizadas, ${canceladasDia.length + vencidasDia.length} no realizadas`}
            >
              <View
                style={[
                  styles.diaBadge,
                  {
                    backgroundColor: PURPLE_BG,
                    borderColor: PURPLE,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[styles.diaBadgeText, { color: PURPLE }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ✓ {completadasDia.length}
                </Text>
              </View>
              <View
                style={[
                  styles.diaBadge,
                  {
                    backgroundColor: PURPLE_BG,
                    borderColor: PURPLE,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[styles.diaBadgeText, { color: PURPLE }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ✕ {canceladasDia.length + vencidasDia.length}
                </Text>
              </View>
            </View>
          )}
        </View>

        {tareasDelDia.length === 0 ? (
          <View
            style={styles.emptyBox}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel="Sin tareas este día. Pulsa otro día para ver su historial"
          >
            <Text style={styles.emptyText}>Sin tareas este día</Text>
            <Text style={styles.emptySubText}>
              Pulsa otro día para ver su historial
            </Text>
          </View>
        ) : (
          <View style={styles.listaCol} accessible={false}>
            {completadasDia.length > 0 && (
              <>
                <Text
                  style={styles.listaSectionLabel}
                  accessibilityRole="header"
                >
                  ✓ Realizadas
                </Text>
                {completadasDia.map((item) => renderFila(item, "completada"))}
              </>
            )}

            {(canceladasDia.length > 0 || vencidasDia.length > 0) && (
              <>
                <Text
                  style={[
                    styles.listaSectionLabel,
                    completadasDia.length > 0 && { marginTop: 6 },
                  ]}
                  accessibilityRole="header"
                >
                  ✕ No realizadas
                </Text>
                {canceladasDia.map((item) => renderFila(item, "cancelada"))}
                {vencidasDia.map((item) => renderFila(item, "vencida"))}
              </>
            )}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const fs = (size: number) =>
  Math.round(size * Math.min(PixelRatio.getFontScale(), 1.4));

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FBF6F0",
    paddingTop: 20,
  },

  modalCapturaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  capturaLoading: {
    position: "absolute",
    bottom: 40,
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  capturaLoadingTxt: {
    color: "#fff",
    fontFamily: AppFonts.bodyBold,
    fontSize: 14,
  },

  topSection: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
  },

  shareBtnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    minHeight: 44,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: PURPLE_LT,
  },
  weekArrow: { padding: 6 },
  weekLabel: {
    fontSize: 16,
    fontFamily: AppFonts.displayBold,
    color: Colors.purpleDk,
    textAlign: "center",
    flexShrink: 1,
  },

  daysStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: PURPLE_LT,
  },
  dayBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
    minHeight: 50,
  },
  dayBtnSel: {
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dayBtnHoy: { backgroundColor: PURPLE_LT },
  dayBtnLbl: { fontSize: 11, color: "#AAA", fontFamily: AppFonts.bodyBold },
  dot: { width: 5, height: 5, borderRadius: 3 },

  sheet: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },

  diaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  diaNombre: {
    fontSize: 15,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    flex: 1,
    textTransform: "capitalize",
    flexShrink: 1,
  },
  diaBadgesRow: { flexDirection: "row", gap: 6 },
  diaBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  diaBadgeText: { fontSize: 12, fontFamily: AppFonts.bodyBold },

  listaCol: { flexDirection: "column" },
  listaSectionLabel: {
    fontSize: 11,
    color: "#8A8194",
    fontFamily: AppFonts.bodyBold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  listPictogram: { width: 36, height: 36, borderRadius: 8 },
  listInfo: { flex: 1, gap: 3 },
  listTitle: {
    fontSize: 14,
    color: "#3A3342",
    fontFamily: AppFonts.displaySemibold,
    flexShrink: 1,
  },
  listTitleTachado: {
    color: "#AAA",
    textDecorationLine: "line-through",
  },
  listHora: { fontSize: 11, color: "#AAA", fontFamily: AppFonts.body },
  listStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  listStatusText: { fontSize: 10.5, fontFamily: AppFonts.bodyBold },

  emptyBox: { alignItems: "center", paddingVertical: 30 },
  emptyText: {
    fontSize: 16,
    color: "#AAA",
    fontFamily: AppFonts.bodyBold,
    textAlign: "center",
  },
  emptySubText: { fontSize: 13, color: "#CCC", marginTop: 6 },
});
