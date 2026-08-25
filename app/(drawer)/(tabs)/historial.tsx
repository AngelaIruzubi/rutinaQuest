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
  tareas,
  etiquetaPeriodo,
}: {
  avatar: any;
  gami: any;
  tareas: any[];
  etiquetaPeriodo: string;
}) {
  const medallaEmoji = gami.medalla
    ? ({ bronce: "🥉", plata: "🥈", oro: "🥇" } as any)[gami.medalla]
    : null;
  const completadas = tareas.filter(
    (t) => t.estado === "completada" || (t.completada === 1 && !t.estado),
  );
  const noRealizadas = tareas.filter((t) => t.estado === "vencida");

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
          <Text style={tc.statLine}>
            ✅ {completadas.length} {etiquetaPeriodo}
          </Text>
          <Text style={tc.statLine}>❌ {noRealizadas.length} no realizadas</Text>
        </View>
      </View>
      {tareas.length > 0 && (
        <View style={tc.tareasSection}>
          <Text style={tc.tareasSectionTitle}>
            {etiquetaPeriodo.charAt(0).toUpperCase() + etiquetaPeriodo.slice(1)}
          </Text>
          {tareas.slice(0, 10).map((t, i) => {
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
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [destinoPend, setDestinoPend] = useState<
    "whatsapp" | "gmail" | "nativo" | null
  >(null);
  const [destinoElegido, setDestinoElegido] = useState<
    "whatsapp" | "nativo" | null
  >(null);
  const [tareasCompartir, setTareasCompartir] = useState<Tarea[]>([]);
  const [etiquetaCompartir, setEtiquetaCompartir] = useState("");
  const [semanaActual, setSemanaActual] = useState(() =>
    lunesDe(fechaAppDate()),
  );
  const [filtroEstado, setFiltroEstado] = useState<
    "todas" | "completada" | "vencida"
  >("todas");

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

  // Para compartir se puede elegir entre el día, la semana o el mes en vez
  // de estar siempre atado a la semana que se está viendo.
  const tareasDelPeriodo = (periodo: "dia" | "semana" | "mes"): Tarea[] => {
    if (periodo === "dia") {
      return historial.filter((t) => fechaReferencia(t) === diaSeleccionado);
    }
    if (periodo === "semana") return tareasUltimaSemana;
    const prefijoMes = diaSeleccionado.slice(0, 7); // "YYYY-MM"
    return historial.filter((t) => fechaReferencia(t).startsWith(prefijoMes));
  };

  const etiquetaDelPeriodo = (periodo: "dia" | "semana" | "mes"): string => {
    if (periodo === "dia") return diaSeleccionado === hoy ? "hoy" : nombreDia;
    if (periodo === "semana") return "esta semana";
    return new Date(diaSeleccionado + "T12:00:00").toLocaleDateString(
      "es-ES",
      { month: "long", year: "numeric" },
    );
  };

  // Con el buscador activo, se busca en todo el historial (no solo en el día
  // seleccionado); sin búsqueda, se mantiene el comportamiento por día.
  const busquedaActiva = search.trim().length > 0;
  const tareasBase = busquedaActiva
    ? historial
        .filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => fechaReferencia(b).localeCompare(fechaReferencia(a)))
    : historial.filter((t) => fechaReferencia(t) === diaSeleccionado);

  const completadasBase = tareasBase.filter(
    (t) => t.estado === "completada" || (t.completed && !t.estado),
  );
  const vencidasBase = tareasBase.filter((t) => t.estado === "vencida");

  // Los recuadros ✓/✕ funcionan como filtro: tocar uno muestra solo esa
  // categoría, y volver a tocarlo lo quita.
  const mostrarCompletadas = filtroEstado !== "vencida";
  const mostrarVencidas = filtroEstado !== "completada";
  const totalVisible =
    (mostrarCompletadas ? completadasBase.length : 0) +
    (mostrarVencidas ? vencidasBase.length : 0);

  const alternarFiltroCompletadas = () =>
    setFiltroEstado((prev) => (prev === "completada" ? "todas" : "completada"));
  const alternarFiltroVencidas = () =>
    setFiltroEstado((prev) => (prev === "vencida" ? "todas" : "vencida"));

  const nombreDia = new Date(diaSeleccionado + "T12:00:00").toLocaleDateString(
    "es-ES",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const renderFila = (
    item: Tarea,
    tipo: "completada" | "vencida",
    mostrarFecha = false,
  ) => {
    const completada = tipo === "completada";
    const colorEstado = completada ? GREEN : ORANGE;
    const etiquetaEstado = "Saltada";
    const fechaLabel = mostrarFecha
      ? new Date(fechaReferencia(item) + "T12:00:00").toLocaleDateString(
          "es-ES",
          { day: "numeric", month: "short" },
        )
      : null;
    const a11y = completada
      ? `${item.title}, ${item.stars ?? 5} de 5 estrellas${item.hora && item.hora !== "Sin hora" ? `, hora ${item.hora}` : ""}${fechaLabel ? `, ${fechaLabel}` : ""}`
      : `${item.title}, ${etiquetaEstado.toLowerCase()}${item.hora && item.hora !== "Sin hora" ? `, hora ${item.hora}` : ""}${fechaLabel ? `, ${fechaLabel}` : ""}`;

    return (
      <View
        key={item.id}
        style={[styles.listRow, { borderLeftColor: colorEstado }]}
        accessible
        accessibilityLabel={a11y}
      >
        {item.pictogramId ? (
          <Image
            source={{
              uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png`,
            }}
            style={styles.listPictogram}
            accessibilityElementsHidden
            importantForAccessibility="no"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={styles.listPictogramPlaceholder}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Ionicons
              name={completada ? "checkmark-circle-outline" : "close-circle-outline"}
              size={20}
              color={colorEstado}
            />
          </View>
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
          {(fechaLabel || (item.hora && item.hora !== "Sin hora")) && (
            <Text
              style={[styles.listHora, ts.tareaHora]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {[fechaLabel, item.hora !== "Sin hora" ? item.hora : null]
                .filter(Boolean)
                .join(" · ")}
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

  const buildTextoCompartir = (tareas: Tarea[], etiqueta: string) => {
    const completadas = tareas.filter(
      (t) => t.estado === "completada" || (t.completed && !t.estado),
    );
    const noRealizadas = tareas.filter((t) => t.estado === "vencida");
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
      `✅ ${completadas.length} completadas ${etiqueta}`,
      `❌ ${noRealizadas.length} no realizadas`,
      "",
      `📋 Tareas de ${etiqueta}:`,
      ...tareas.slice(0, 10).map((t) => {
        const ok = t.estado === "completada" || (t.completed && !t.estado);
        return `${ok ? "✅" : "❌"} ${t.title}`;
      }),
      "",
      new Date().toLocaleDateString("es-ES", { dateStyle: "long" }),
    ]
      .filter(Boolean)
      .join("\n");
  };

  const elegirDestino = (destino: "whatsapp" | "nativo") => {
    setDestinoElegido(destino);
    setModalPeriodo(true);
  };

  const elegirPeriodo = (periodo: "dia" | "semana" | "mes") => {
    setModalPeriodo(false);
    if (!destinoElegido) return;
    const tareas = tareasDelPeriodo(periodo);
    const etiqueta = etiquetaDelPeriodo(periodo);
    setTareasCompartir(tareas);
    setEtiquetaCompartir(etiqueta);
    iniciarCompartir(destinoElegido, tareas, etiqueta);
  };

  const iniciarCompartir = (
    destino: "whatsapp" | "gmail" | "nativo",
    tareas: Tarea[],
    etiqueta: string,
  ) => {
    if (tareas.length === 0) {
      Alert.alert("Sin tareas", `No tienes tareas registradas ${etiqueta}.`);
      return;
    }

    const texto = buildTextoCompartir(tareas, etiqueta);

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
          message: buildTextoCompartir(tareasCompartir, etiquetaCompartir),
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
              tareas={tareasCompartir}
              etiquetaPeriodo={etiquetaCompartir}
            />
          </ViewShot>
          {compartiendo && (
            <View style={styles.capturaLoading}>
              <Text style={styles.capturaLoadingTxt}>Preparando imagen...</Text>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={modalPeriodo}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPeriodo(false)}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.periodoOverlay}
          onPress={() => setModalPeriodo(false)}
          accessible={false}
        >
          <Pressable
            style={styles.periodoCard}
            onPress={(e) => e.stopPropagation()}
            accessible={false}
          >
            <Text style={styles.periodoTitulo} accessibilityRole="header">
              ¿Qué quieres compartir?
            </Text>
            {(
              [
                {
                  id: "dia" as const,
                  icono: "today-outline" as const,
                  texto: diaSeleccionado === hoy ? "Hoy" : "Día seleccionado",
                },
                {
                  id: "semana" as const,
                  icono: "calendar-outline" as const,
                  texto: "Esta semana",
                },
                {
                  id: "mes" as const,
                  icono: "calendar-number-outline" as const,
                  texto: "Este mes",
                },
              ]
            ).map((op) => (
              <Pressable
                key={op.id}
                onPress={() => elegirPeriodo(op.id)}
                style={styles.periodoOpcion}
                accessible
                accessibilityRole="button"
                accessibilityLabel={op.texto}
              >
                <Ionicons name={op.icono} size={20} color={PURPLE} />
                <Text style={styles.periodoOpcionTxt}>{op.texto}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
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
              onPress={() => elegirDestino("whatsapp")}
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
              onPress={() => elegirDestino("nativo")}
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
          <Ionicons
            name="search"
            size={18}
            color="#C7C0CE"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            placeholder="Buscar tarea..."
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              fontSize: 15,
              fontFamily: AppFonts.body,
              color: "#3A3342",
            }}
            accessibilityLabel="Campo de búsqueda"
            accessibilityHint="Busca una tarea en todo el historial, no solo en el día seleccionado"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Con búsqueda activa se buscan resultados en todo el historial, así
            que el selector de semana y la tira de días no aplican. */}
        {!busquedaActiva && (
        <>
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
              (t) => fechaReferencia(t) === fecha && t.estado === "vencida",
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
        </>
        )}
      </View>

      <View style={styles.sheet}>
        <View style={styles.diaHeader}>
          <Text
            style={styles.diaNombre}
            numberOfLines={1}
            accessibilityLabel={
              busquedaActiva
                ? `Resultados para ${search.trim()}`
                : diaSeleccionado === hoy
                  ? `Hoy, ${nombreDia}`
                  : nombreDia
            }
          >
            {busquedaActiva
              ? `Resultados de "${search.trim()}"`
              : diaSeleccionado === hoy
                ? `Hoy · ${nombreDia}`
                : nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)}
          </Text>
          {tareasBase.length > 0 && (
            <View
              style={styles.diaBadgesRow}
              accessible
              accessibilityLabel={`${completadasBase.length} realizadas, ${vencidasBase.length} saltadas. Toca un recuadro para filtrar`}
            >
              <Pressable
                onPress={alternarFiltroCompletadas}
                style={[
                  styles.diaBadge,
                  {
                    backgroundColor: PURPLE_BG,
                    borderColor: PURPLE,
                    borderWidth: 1,
                  },
                  filtroEstado === "completada" && styles.diaBadgeActiva,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Ver solo realizadas, ${completadasBase.length}`}
                accessibilityState={{ selected: filtroEstado === "completada" }}
              >
                <Text
                  style={[
                    styles.diaBadgeText,
                    { color: PURPLE },
                    filtroEstado === "completada" && styles.diaBadgeTextActiva,
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ✓ {completadasBase.length}
                </Text>
              </Pressable>
              <Pressable
                onPress={alternarFiltroVencidas}
                style={[
                  styles.diaBadge,
                  {
                    backgroundColor: PURPLE_BG,
                    borderColor: PURPLE,
                    borderWidth: 1,
                  },
                  filtroEstado === "vencida" && styles.diaBadgeActiva,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Ver solo saltadas, ${vencidasBase.length}`}
                accessibilityState={{ selected: filtroEstado === "vencida" }}
              >
                <Text
                  style={[
                    styles.diaBadgeText,
                    { color: PURPLE },
                    filtroEstado === "vencida" && styles.diaBadgeTextActiva,
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ✕ {vencidasBase.length}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {totalVisible === 0 ? (
          <View
            style={styles.emptyBox}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={
              busquedaActiva
                ? `Sin resultados para ${search.trim()}`
                : tareasBase.length > 0
                  ? "Ninguna tarea coincide con el filtro"
                  : "Sin tareas este día. Pulsa otro día para ver su historial"
            }
          >
            <Text style={styles.emptyText}>
              {busquedaActiva
                ? `Sin resultados para "${search.trim()}"`
                : tareasBase.length > 0
                  ? "Nada con este filtro"
                  : "Sin tareas este día"}
            </Text>
            <Text style={styles.emptySubText}>
              {busquedaActiva
                ? "Prueba con otra palabra"
                : tareasBase.length > 0
                  ? "Quita el filtro para ver todas las tareas"
                  : "Pulsa otro día para ver su historial"}
            </Text>
          </View>
        ) : (
          <View style={styles.listaCol} accessible={false}>
            {mostrarCompletadas && completadasBase.length > 0 && (
              <>
                <Text
                  style={styles.listaSectionLabel}
                  accessibilityRole="header"
                >
                  ✓ Realizadas
                </Text>
                {completadasBase.map((item) =>
                  renderFila(item, "completada", busquedaActiva),
                )}
              </>
            )}

            {mostrarVencidas && vencidasBase.length > 0 && (
              <>
                <Text
                  style={[
                    styles.listaSectionLabel,
                    mostrarCompletadas &&
                      completadasBase.length > 0 && { marginTop: 6 },
                  ]}
                  accessibilityRole="header"
                >
                  ✕ No realizadas
                </Text>
                {vencidasBase.map((item) =>
                  renderFila(item, "vencida", busquedaActiva),
                )}
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

  periodoOverlay: {
    flex: 1,
    backgroundColor: "rgba(46,32,58,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  periodoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  periodoTitulo: {
    fontSize: 17,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    marginBottom: 6,
  },
  periodoOpcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: PURPLE_BG,
    minHeight: 44,
  },
  periodoOpcionTxt: {
    fontSize: 15,
    fontFamily: AppFonts.bodyBold,
    color: Colors.purpleDk,
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
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECE4F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    minHeight: 44,
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
    minHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 24,
    marginTop: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
    shadowColor: "#3A3342",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 3,
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
  diaBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: "center",
  },
  diaBadgeActiva: { backgroundColor: PURPLE },
  diaBadgeText: { fontSize: 12, fontFamily: AppFonts.bodyBold },
  diaBadgeTextActiva: { color: "#fff" },

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
  listPictogramPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PURPLE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
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
