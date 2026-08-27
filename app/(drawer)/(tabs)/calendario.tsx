import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ModalEditarTarea } from "../../../components/modals/ModalEditarTarea";
import { DuracionPicker } from "../../../components/ui/DuracionPicker";
import { SelectorDiasSemana } from "../../../components/ui/SelectorDiasSemana";
import { DIAS_SEMANA, MESES } from "../../../constants/diasSemana";
import { AppFonts, Colors } from "../../../constants/theme";
import { useAjustesCtx } from "../../../context/AjustesContext";
import { useDBReady } from "../../../context/Dbreadycontext";
import { useTemporizadorTarea } from "../../../context/TemporizadorContext";
import {
  deleteTarea,
  getFechasConTareas,
  getTareasPorFecha,
  insertTarea,
  updateTareaBaseCompleta,
  updateTareaDuracion,
  updateTareaFrecuencia,
  updateTareaHora,
  updateTareaNotifId,
  updateTareaTituloPicto,
} from "../../../database/database";
import { useBuscarPictogramasDebounced } from "../../../hooks/useBuscarPictogramasDebounced";
import { useConfirm } from "../../../hooks/useConfirm";
import { ahoraApp, ahoraAppMs, hoyAppStr } from "../../../utils/fecha";
import {
  cancelarNotifTarea,
  programarNotif5MinAntes,
} from "../../../utils/notificacionesTarea";
import { fechaLegible } from "../../../utils/fechaFormato";

const PURPLE = Colors.purple;
const PURPLE_LT = Colors.purpleLt;
const PURPLE_BG = Colors.purpleBg;
const GREEN = Colors.green;
const RED = Colors.red;
function primerDiaMes(anyo: number, mes: number): Date {
  return new Date(anyo, mes, 1);
} //en que columna empieza
function diasEnMes(anyo: number, mes: number): number {
  return new Date(anyo, mes + 1, 0).getDate();
}

// ─── Calendario mensual ───
function CalendarioMes({
  anyo,
  mes,
  fechasConTareas,
  fechasProyectadas,
  fechaSeleccionada,
  onSelectFecha,
}: {
  anyo: number;
  mes: number;
  fechasConTareas: Record<string, number>;
  fechasProyectadas: Set<string>;
  fechaSeleccionada: string | null;
  onSelectFecha: (f: string) => void;
}) {
  const { escala } = useAjustesCtx();
  const hoy = hoyAppStr();
  const totalDias = diasEnMes(anyo, mes);
  const primerDia = primerDiaMes(anyo, mes);
  const offsetLunes = (primerDia.getDay() + 6) % 7;
  const celdas = offsetLunes + totalDias;
  const filas = Math.ceil(celdas / 7);

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`Calendario de ${MESES[mes]} ${anyo}`}
    >
      <View
        style={s.semanaCab}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {DIAS_SEMANA.map((d) => (
          <Text
            key={d}
            style={[s.semanaCabTxt, { fontSize: Math.round(11 * escala) }]}
          >
            {d}
          </Text>
        ))}
      </View>

      {Array.from({ length: filas }).map((_, fila) => (
        <View
          key={fila}
          style={s.semanaFila}
          accessible={false}
          importantForAccessibility="no"
        >
          {Array.from({ length: 7 }).map((_, col) => {
            const idx = fila * 7 + col;
            const dia = idx - offsetLunes + 1;
            if (dia < 1 || dia > totalDias) {
              return (
                <View
                  key={col}
                  style={s.celda}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              );
            }
            const fecha = `${anyo}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const esHoy = fecha === hoy;
            const esPasado = fecha < hoy;
            const selec = fecha === fechaSeleccionada;
            const tieneTareas = !!fechasConTareas[fecha];
            const esSoloProyectada = fechasProyectadas.has(fecha);
            const diaSemana = DIAS_SEMANA[idx % 7];

            let a11yLabel = `${dia} de ${MESES[mes]}, ${diaSemana}`;
            if (esHoy) a11yLabel += ", hoy";
            if (selec) a11yLabel += ", seleccionado";
            if (tieneTareas) a11yLabel += ", con tareas";
            if (esPasado && !esHoy) a11yLabel += ", pasado";

            return (
              <Pressable
                key={col}
                style={[
                  s.celda,
                  esHoy && s.celdaHoy,
                  selec && !esHoy && s.celdaSelec,
                  esPasado && !esHoy && s.celdaPasado,
                ]}
                onPress={() => onSelectFecha(fecha)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={a11yLabel}
                accessibilityState={{ selected: selec }}
              >
                <Text
                  style={[
                    s.celdaTxt,
                    esHoy && s.celdaHoyTxt,
                    selec && !esHoy && s.celdaSelecTxt,
                    esPasado && !esHoy && { color: "#CCC" },
                  ]}
                >
                  {dia}
                </Text>
                {tieneTareas &&
                  (esSoloProyectada ? (
                    <View
                      style={[s.puntoHueco, esHoy && s.puntoHuecoHoy]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : (
                    <View
                      style={[s.punto, esHoy && { backgroundColor: "#fff" }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ))}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Modal para añadir tarea ─────
function ModalNuevaTarea({
  visible,
  fecha,
  onClose,
  onGuardar,
}: {
  visible: boolean;
  fecha: string;
  onClose: () => void;
  onGuardar: (tarea: any) => void;
}) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const { height: alturaVentana } = useWindowDimensions();
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState<string | null>(null);
  const { pictogramas, setPictogramas, buscar: buscarPictosDebounced } =
    useBuscarPictogramasDebounced();
  const [pictogramId, setPictogramId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [repeticion, setRepeticion] = useState<
    "ninguna" | "diaria" | "semanal"
  >("ninguna");
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [duracionSeg, setDuracionSeg] = useState<number | null>(null);

  const PURPLE = "#A77BBE";
  const PURPLE_LT = "#E5D9EE";
  const PURPLE_BG = "#F4F0F6";

  // Al abrir el formulario, se premarca el día de la semana del día que se
  // ha tocado en el calendario (no el día real de hoy) — si estás añadiendo
  // una tarea semanal para un jueves futuro, debe marcarse jueves, no hoy.
  useEffect(() => {
    if (!visible) return;
    const [fy, fm, fd] = fecha.split("-").map(Number);
    const diaSemana =
      fy && fm && fd ? new Date(fy, fm - 1, fd).getDay() : new Date().getDay();
    setDiasSemana([diaSemana]);
  }, [visible, fecha]);

  const buscar = (texto: string) => {
    setTitulo(texto);
    buscarPictosDebounced(texto, (ids) => {
      setPictogramId(ids.length > 0 ? ids[0] : null);
    });
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (date) {
      setTempTime(date);
      setHora(
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    }
  };

  const cerrar = () => {
    setTitulo("");
    setHora(null);
    setPictogramId(null);
    setPictogramas([]);
    setShowPicker(false);
    setRepeticion("ninguna");
    setDuracionSeg(null);
    onClose();
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    if (repeticion === "semanal" && diasSemana.length === 0) return;
    onGuardar({
      id: `${fecha}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
      title: titulo.trim(),
      hora: hora ?? "Sin hora",
      pictogramId: pictogramId ?? null,
      repeticion,
      diasSemana: repeticion === "semanal" ? diasSemana : null,
      duracionSeg,
    });
    setTitulo("");
    setHora(null);
    setPictogramId(null);
    setPictogramas([]);
    setShowPicker(false);
    setRepeticion("ninguna");
    setDuracionSeg(null);
    onClose();
    AccessibilityInfo.announceForAccessibility(
      `Tarea ${titulo} añadida para el ${fecha}`,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cerrar}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          style={s.overlay}
          onPress={cerrar}
          accessible={false}
          importantForAccessibility="no"
        >
          <Pressable
            style={[s.modalBox, { maxHeight: alturaVentana * 0.88 }]}
            onPress={(e) => e.stopPropagation()}
            accessible={false}
            importantForAccessibility="yes"
          >
            <ScrollView
              style={{ flexShrink: 1, minHeight: 0 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              accessible={false}
              importantForAccessibility="yes"
            >
              <View style={s.modalHeader} accessible={false}>
                <View style={s.modalHeaderTexts} accessible={false}>
                  <Text
                    style={[
                      s.modalTitle,
                      { fontSize: Math.round(18 * escala) },
                    ]}
                    accessibilityRole="header"
                  >
                    Nueva tarea
                  </Text>
                  <View
                    style={s.modalFechaChip}
                    accessible
                    accessibilityLabel={`Para el ${fechaLegible(fecha)}`}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={PURPLE}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text
                      style={s.modalFechaChipTxt}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {fechaLegible(fecha)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={cerrar}
                  style={s.modalCloseBtn}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar formulario de nueva tarea"
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={PURPLE}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </Pressable>
              </View>

              <View style={s.modalDivider} accessible={false} />

              {/* ── Título ── */}
              <Text
                style={s.modalInputLabel}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                Título
              </Text>
              <View style={s.inputRow} accessible={false}>
                <TextInput
                  placeholder="¿Qué quieres hacer?"
                  value={titulo}
                  onChangeText={buscar}
                  style={s.input}
                  accessibilityLabel="Título de la tarea"
                  autoCapitalize="sentences"
                  accessibilityHint="Escribe el nombre. Se buscarán pictogramas automáticamente"
                  returnKeyType="done"
                  clearButtonMode="while-editing"
                  autoFocus
                />
              </View>

              {/* ── Selector múltiple de pictogramas ── */}
              {pictogramas.length > 0 && (
                <View style={{ marginBottom: 16 }} accessible={false}>
                  <Text style={s.modalInputLabel} accessibilityRole="header">
                    Elige un pictograma
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                    accessible={false}
                  >
                    {pictogramas.map((id, i) => (
                      <Pressable
                        key={id}
                        onPress={() => setPictogramId(id)}
                        style={[
                          s.pictoOpcion,
                          pictogramId === id && s.pictoOpcionSelec,
                        ]}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Pictograma opción ${i + 1}${pictogramId === id ? ", seleccionado" : ""}`}
                        accessibilityState={{ selected: pictogramId === id }}
                      >
                        <Image
                          source={{
                            uri: `https://static.arasaac.org/pictograms/${id}/${id}_300.png`,
                          }}
                          style={s.pictoImg}
                          accessibilityIgnoresInvertColors
                        />
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setPictogramId(null)}
                      style={[
                        s.pictoOpcion,
                        s.pictoNinguno,
                        pictogramId === null && s.pictoOpcionSelec,
                      ]}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Sin pictograma${pictogramId === null ? ", seleccionado" : ""}`}
                      accessibilityState={{ selected: pictogramId === null }}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={pictogramId === null ? PURPLE : "#CCC"}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                      <Text
                        style={[
                          s.pictoNingunoTxt,
                          pictogramId === null && { color: PURPLE },
                        ]}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        Ninguno
                      </Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              {/* ── Hora ── */}
              <Text
                style={s.modalInputLabel}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                Hora (opcional)
              </Text>

              {Platform.OS === "web" ? (
                <input
                  type="time"
                  onChange={(e) => setHora(e.target.value || null)}
                  style={{
                    padding: 10,
                    fontSize: fs(15),
                    borderRadius: 10,
                    borderColor: PURPLE_LT,
                    border: `1px solid ${PURPLE_LT}`,
                    backgroundColor: PURPLE_BG,
                    marginBottom: 16,
                  }}
                />
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowPicker(true)}
                    style={[s.inputRow, { marginBottom: showPicker ? 8 : 16 }]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      hora
                        ? `Hora seleccionada: ${hora}. Pulsa para cambiar`
                        : "Seleccionar hora, opcional"
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={PURPLE}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text
                      style={[
                        s.input,
                        { color: hora ? "#333" : "#AAA", paddingVertical: 12 },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {hora ?? "Sin hora seleccionada"}
                    </Text>
                    {hora && (
                      <Pressable
                        onPress={() => {
                          setHora(null);
                          setShowPicker(false);
                        }}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel="Quitar hora"
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#CCC"
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                        />
                      </Pressable>
                    )}
                  </Pressable>

                  {showPicker && (
                    <View style={{ marginBottom: 16 }} accessible={false}>
                      <DateTimePicker
                        value={tempTime}
                        mode="time"
                        is24Hour
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleTimeChange}
                      />
                      {Platform.OS === "ios" && (
                        <Pressable
                          onPress={() => setShowPicker(false)}
                          style={{
                            alignSelf: "flex-end",
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                          }}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel="Confirmar hora seleccionada"
                        >
                          <Text
                            style={{
                              color: PURPLE,
                              fontWeight: "700",
                              fontSize: 15,
                            }}
                          >
                            Listo
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* ── Repetición ── */}
              <Text style={[s.modalInputLabel, { marginTop: 8 }]}>
                ¿Se repite?
              </Text>
              <View
                style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                accessible={false}
              >
                {(["ninguna", "diaria", "semanal"] as const).map((opcion) => (
                  <Pressable
                    key={opcion}
                    onPress={() => setRepeticion(opcion)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: repeticion === opcion ? PURPLE : "#E5E5E5",
                      backgroundColor:
                        repeticion === opcion ? PURPLE_BG : "#fff",
                    }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      opcion === "ninguna"
                        ? "Una vez"
                        : opcion === "diaria"
                          ? "Cada día"
                          : "Cada semana"
                    }
                    accessibilityState={{ selected: repeticion === opcion }}
                  >
                    <Ionicons
                      name={
                        opcion === "ninguna"
                          ? "checkmark-circle-outline"
                          : opcion === "diaria"
                            ? "repeat-outline"
                            : "calendar-outline"
                      }
                      size={22}
                      color={repeticion === opcion ? PURPLE : "#999"}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text
                      style={{
                        fontSize: fs(11),
                        fontWeight: "600",
                        color: repeticion === opcion ? PURPLE : "#999",
                        marginTop: 2,
                      }}
                    >
                      {opcion === "ninguna"
                        ? "Una vez"
                        : opcion === "diaria"
                          ? "Cada día"
                          : "Semanal"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* ── Días de la semana (solo si repite semanalmente) ── */}
              {repeticion === "semanal" && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={s.modalInputLabel}>¿Qué días?</Text>
                  <SelectorDiasSemana
                    diasSemana={diasSemana}
                    onChange={setDiasSemana}
                  />
                </View>
              )}

              {/* ── Duración con temporizador ── */}
              <View style={{ marginBottom: 16 }}>
                <DuracionPicker valorSeg={duracionSeg} onChange={setDuracionSeg} />
              </View>

              {/* ── Botón guardar ── */}
              {(() => {
                const faltaDia = repeticion === "semanal" && diasSemana.length === 0;
                const puedeGuardar = !!titulo.trim() && !faltaDia;
                return (
                  <Pressable
                    onPress={guardar}
                    style={[s.btnGuardar, !puedeGuardar && s.btnGuardarDisabled]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      !titulo.trim()
                        ? "Añadir tarea. Escribe un título primero"
                        : faltaDia
                          ? "Añadir tarea. Marca al menos un día de la semana"
                          : `Añadir tarea ${titulo}`
                    }
                    accessibilityHint={
                      puedeGuardar ? "Guarda la tarea y cierra el formulario" : ""
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#fff"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text
                      style={s.btnGuardarTxt}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      Añadir tarea
                    </Text>
                  </Pressable>
                );
              })()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Calendario() {
  const { escala, colores } = useAjustesCtx();
  const { mostrarConfirm, confirmModal } = useConfirm();
  const router = useRouter();
  const {
    activo: timerActivo,
    iniciarParaTarea,
    resetear: resetearTemporizador,
  } = useTemporizadorTarea();
  const ahora = ahoraApp();
  const [anyo, setAnyo] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth());

  const [fechaSelec, setFechaSelec] = useState<string | null>(null);
  const dbReady = useDBReady();
  const [tareasDia, setTareasDia] = useState<any[]>([]);
  const [fechasConTareas, setFechasConTareas] = useState<
    Record<string, number>
  >({});
  const [fechasProyectadas, setFechasProyectadas] = useState<Set<string>>(
    new Set(),
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);

  const hoy = hoyAppStr();

  const esPendiente = (t: any) =>
    t.estado === "pendiente" || (!t.estado && t.completed !== 1);

  const actualizarFechasConTareas = async () => {
    const { fechas, soloProyectadas } = (await getFechasConTareas()) as any;
    setFechasConTareas(fechas);
    setFechasProyectadas(new Set(soloProyectadas));
  };

  useFocusEffect(
    useCallback(() => {
      if (!dbReady) return;
      let cancelado = false;
      (async () => {
        const { fechas, soloProyectadas } = (await getFechasConTareas()) as any;
        if (!cancelado) {
          setFechasConTareas(fechas);
          setFechasProyectadas(new Set(soloProyectadas));
        }
        if (fechaSelec) {
          const rows = ((await getTareasPorFecha(fechaSelec)) as any[]).filter(
            esPendiente,
          );
          if (!cancelado) setTareasDia(rows);
        }
      })();
      return () => {
        cancelado = true;
      };
    }, [fechaSelec, dbReady]),
  );

  const seleccionarFecha = async (fecha: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFechaSelec(fecha);
    const todas = (await getTareasPorFecha(fecha)) as any[];
    const pendientes = todas.filter(esPendiente);
    setTareasDia(pendientes);
    const n = pendientes.length;
    AccessibilityInfo.announceForAccessibility(
      n > 0
        ? `${fecha}, ${n} tarea${n > 1 ? "s" : ""} pendiente${n > 1 ? "s" : ""}`
        : `${fecha}, sin tareas pendientes`,
    );
  };

  const mesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAnyo((a) => a - 1);
    } else setMes((m) => m - 1);
  };

  const mesSiguiente = () => {
    if (mes === 11) {
      setMes(0);
      setAnyo((a) => a + 1);
    } else setMes((m) => m + 1);
  };

  const onGuardar = async (tarea: any) => {
    await insertTarea(tarea, fechaSelec!);
    const notifId = await programarNotif5MinAntes(
      fechaSelec!,
      tarea.hora,
      tarea.title ?? "",
    );
    if (notifId && tarea.id) await updateTareaNotifId(tarea.id, notifId);
    const pendientes = ((await getTareasPorFecha(fechaSelec!)) as any[]).filter(
      esPendiente,
    );
    setTareasDia(pendientes);
    await actualizarFechasConTareas();
  };

  const abrirTemporizadorTarea = async (tarea: any) => {
    // Si el temporizador de esta misma tarea ya terminó, no hay que
    // reabrirlo tal cual (se quedaría pillado mostrando "Volver a mis
    // tareas" para siempre) — hay que arrancarlo de nuevo desde cero.
    if (timerActivo && timerActivo.tareaId === tarea.id && timerActivo.estado !== "finished") {
      router.push("/temporizador");
      return;
    }
    if (timerActivo && timerActivo.estado !== "finished") {
      const continuar = await mostrarConfirm(
        "Ya tienes un temporizador en marcha",
        `Tienes un temporizador en marcha para "${timerActivo.tareaTitulo}". ¿Quieres sustituirlo por el de "${tarea.title}"?`,
        [
          { texto: "Cancelar", valor: false },
          { texto: "Sustituir", valor: true },
        ],
      );
      if (!continuar) return;
    }
    iniciarParaTarea(tarea);
    router.push("/temporizador");
  };

  const eliminar = async (id: string, titulo: string) => {
    const confirmado = await mostrarConfirm(
      "Eliminar tarea",
      `¿Seguro que quieres eliminar "${titulo}"?`,
      [
        { texto: "Cancelar", valor: false },
        { texto: "Eliminar", valor: true, destructivo: true },
      ],
    );
    if (!confirmado) return;
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const tarea = tareasDia.find((t) => t.id === id);
    await cancelarNotifTarea(tarea?.notifId);
    await deleteTarea(id);
    setTareasDia((prev) => prev.filter((t) => t.id !== id));
    await actualizarFechasConTareas();
    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} eliminada`);
  };

  const recargarTareasDia = async () => {
    if (!fechaSelec) return;
    const pendientes = ((await getTareasPorFecha(fechaSelec)) as any[]).filter(
      esPendiente,
    );
    setTareasDia(pendientes);
  };

  const guardarEdicion = async (
    titulo: string,
    pictogramId: number | null,
    hora: string,
    duracionSeg: number | null,
    repeticion: "ninguna" | "diaria" | "semanal",
    diasSemana: number[] | null,
  ) => {
    if (!tareaEditando) return;
    const horaFinal = hora ?? "Sin hora";
    const esInstanciaRepetitiva =
      !!tareaEditando.tareaBaseId && tareaEditando.tareaBaseId !== "";
    const esTareaBase =
      tareaEditando.repeticion &&
      tareaEditando.repeticion !== "ninguna" &&
      !esInstanciaRepetitiva;
    const cambioFrecuencia =
      repeticion !== (tareaEditando.repeticion ?? "ninguna") ||
      (repeticion === "semanal" &&
        JSON.stringify(diasSemana ?? []) !==
          JSON.stringify(tareaEditando.diasSemana ?? []));
    // Cambiar la duración invalida el temporizador ya cumplido con la
    // duración anterior; el temporizador "en vivo" del contexto global
    // también hay que limpiarlo si seguía apuntando a esta tarea como
    // terminada, o la tarea aparecía lista para repetir en verde aunque se
    // hubiera reiniciado.
    if (
      duracionSeg !== (tareaEditando.duracionSeg ?? null) &&
      timerActivo?.tareaId === tareaEditando.id
    ) {
      resetearTemporizador();
    }

    if (esInstanciaRepetitiva || esTareaBase) {
      setEditModalVisible(false);
      setTimeout(async () => {
        const opcion = await mostrarConfirm(
          "Editar tarea repetitiva",
          "¿Qué quieres cambiar?",
          [
            { texto: "Cancelar", valor: null },
            { texto: "Solo esta vez", valor: "esta" },
            { texto: "Todas las veces", valor: "todas" },
          ],
        );
        if (!opcion) return;
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (opcion === "esta") {
          await updateTareaTituloPicto(tareaEditando.id, titulo, pictogramId);
          await updateTareaHora(tareaEditando.id, horaFinal);
          await updateTareaDuracion(tareaEditando.id, duracionSeg);
          const notifIdEsta = await programarNotif5MinAntes(
            tareaEditando.fechaDia,
            horaFinal,
            titulo,
            tareaEditando.notifId,
          );
          await updateTareaNotifId(tareaEditando.id, notifIdEsta);
        } else {
          const baseId = esInstanciaRepetitiva
            ? tareaEditando.tareaBaseId
            : tareaEditando.id;
          await updateTareaBaseCompleta(
            baseId,
            titulo,
            pictogramId,
            horaFinal,
            duracionSeg,
          );
          const notifIdTodas = await programarNotif5MinAntes(
            tareaEditando.fechaDia,
            horaFinal,
            titulo,
            tareaEditando.notifId,
          );
          await updateTareaNotifId(tareaEditando.id, notifIdTodas);
        }
        if (cambioFrecuencia) {
          const baseId = esInstanciaRepetitiva
            ? tareaEditando.tareaBaseId
            : tareaEditando.id;
          await updateTareaFrecuencia(baseId, repeticion, diasSemana);
        }
        await recargarTareasDia();
        setTareaEditando(null);
      }, 300);
    } else {
      await updateTareaTituloPicto(tareaEditando.id, titulo, pictogramId);
      await updateTareaHora(tareaEditando.id, horaFinal);
      await updateTareaDuracion(tareaEditando.id, duracionSeg);
      if (cambioFrecuencia) {
        await updateTareaFrecuencia(tareaEditando.id, repeticion, diasSemana);
      }
      const notifIdSimple = await programarNotif5MinAntes(
        tareaEditando.fechaDia,
        horaFinal,
        titulo,
        tareaEditando.notifId,
      );
      await updateTareaNotifId(tareaEditando.id, notifIdSimple);
      setEditModalVisible(false);
      setTareaEditando(null);
      await recargarTareasDia();
    }
  };

  const esFuturo = fechaSelec !== null && fechaSelec > hoy;
  const esHoy = fechaSelec === hoy;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.headerTitle} accessibilityRole="header">
          Calendario
        </Text>

        {/* ── Cabecera mes ── */}
        <View style={s.mesHeader}>
          <Pressable
            onPress={mesAnterior}
            style={s.mesBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
          >
            <Ionicons name="chevron-back" size={20} color={PURPLE} />
          </Pressable>
          <Text
            style={s.mesTitulo}
            allowFontScaling={false}
            accessibilityRole="header"
            accessibilityLabel={`${MESES[mes]} de ${anyo}`}
          >
            {MESES[mes]} {anyo}
          </Text>
          <Pressable
            onPress={mesSiguiente}
            style={s.mesBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <Ionicons name="chevron-forward" size={20} color={PURPLE} />
          </Pressable>
        </View>

        {/* ── Calendario ── */}
        <CalendarioMes
          anyo={anyo}
          mes={mes}
          fechasProyectadas={fechasProyectadas}
          fechasConTareas={fechasConTareas}
          fechaSeleccionada={fechaSelec}
          onSelectFecha={seleccionarFecha}
        />

        {/* ── Panel del día seleccionado ── */}
        {fechaSelec && (
          <View style={s.diaPanel} accessible={false}>
            <View style={s.diaPanelHeader}>
              <View>
                <Text
                  style={s.diaPanelFecha}
                  allowFontScaling={false}
                  accessibilityLabel={`Día seleccionado: ${fechaLegible(fechaSelec)}${esHoy ? ", hoy" : ""}`}
                >
                  {fechaLegible(fechaSelec)}
                </Text>
                {esHoy && (
                  <View style={s.hoyBadge}>
                    <Text style={s.hoyBadgeTxt} allowFontScaling={false}>
                      Hoy
                    </Text>
                  </View>
                )}
              </View>

              {(esHoy || esFuturo) && (
                <Pressable
                  onPress={() => setModalVisible(true)}
                  style={s.btnAdd}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Añadir tarea"
                  accessibilityHint={`Añade una nueva tarea para el ${fechaLegible(fechaSelec)}`}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color="#fff"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </Pressable>
              )}
            </View>

            <View accessible={false}>
              {tareasDia.length === 0 ? (
                <View
                  style={s.emptyDia}
                  accessible
                  accessibilityLiveRegion="polite"
                  accessibilityLabel={
                    esFuturo || esHoy
                      ? "Sin tareas pendientes. Pulsa el botón más para añadir"
                      : "Sin tareas pendientes este día"
                  }
                >
                  <Ionicons
                    name={
                      esFuturo || esHoy
                        ? "add-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={32}
                    color="#DDD"
                  />
                  <Text style={s.emptyDiaTxt} allowFontScaling={false}>
                    {esFuturo || esHoy
                      ? "Sin tareas · pulsa + para añadir"
                      : "Sin tareas este día"}
                  </Text>
                </View>
              ) : (
                tareasDia.map((t: any) => {
                  const horaLabel =
                    t.hora && t.hora !== "Sin hora" ? `, hora ${t.hora}` : "";
                  const previewLabel = t.virtual ? ", aún no creada" : "";
                  return (
                    <View
                      key={t.id}
                      style={[s.tareaFila, t.virtual && s.tareaFilaVirtual]}
                      accessible
                      accessibilityLabel={`${t.title}${horaLabel}${previewLabel}`}
                    >
                      <View style={s.tareaIconWrap}>
                        <Ionicons
                          name={t.virtual ? "repeat-outline" : "ellipse"}
                          size={t.virtual ? 14 : 8}
                          color={t.virtual ? "#BBB" : PURPLE}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.tareaTitulo, t.virtual && { color: "#999" }]}
                          allowFontScaling={false}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                        {t.hora && t.hora !== "Sin hora" && (
                          <Text
                            style={s.tareaHora}
                            allowFontScaling={false}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            🕐 {t.hora}
                          </Text>
                        )}
                        {t.virtual && (
                          <Text
                            style={s.tareaVirtualTxt}
                            allowFontScaling={false}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            Se repite · aún no creada
                          </Text>
                        )}
                      </View>
                      {t.duracionSeg && !t.tiempoCumplido && !t.virtual && (
                        <Pressable
                          onPress={() => abrirTemporizadorTarea(t)}
                          style={s.btnTemporizador}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel={`Iniciar temporizador de ${Math.round(t.duracionSeg / 60)} minutos para ${t.title}`}
                          accessibilityHint="Abre el temporizador. La tarea no se podrá marcar como realizada hasta que termine"
                        >
                          <Ionicons
                            name="play"
                            size={19}
                            color="#fff"
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          />
                        </Pressable>
                      )}
                      {(esHoy || esFuturo) && !t.virtual && (
                        <Pressable
                          onPress={() => {
                            setTareaEditando(t);
                            setEditModalVisible(true);
                          }}
                          style={s.btnEditar}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel={`Editar tarea ${t.title}`}
                        >
                          <Ionicons
                            name="pencil"
                            size={15}
                            color={PURPLE}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          />
                        </Pressable>
                      )}
                      {esFuturo && !t.virtual && (
                        <Pressable
                          onPress={() => eliminar(t.id, t.title)}
                          style={s.btnEliminar}
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar tarea ${t.title}`}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={RED}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <ModalNuevaTarea
        visible={modalVisible}
        fecha={fechaSelec || ""}
        onClose={() => setModalVisible(false)}
        onGuardar={onGuardar}
      />
      <ModalEditarTarea
        visible={editModalVisible}
        tarea={tareaEditando}
        onCerrar={() => {
          setEditModalVisible(false);
          setTareaEditando(null);
        }}
        onGuardar={guardarEdicion}
      />
      {confirmModal}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FBF6F0",
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingHorizontal: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
    marginBottom: 18,
  },

  // Cabecera mes
  mesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  mesBtn: {
    width: 38,
    height: 38,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ECE4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  mesTitulo: {
    fontSize: 19,
    fontFamily: AppFonts.displayBold,
    color: Colors.purpleDk,
  },

  // Calendario
  semanaCab: { flexDirection: "row", marginBottom: 8 },
  semanaCabTxt: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: AppFonts.bodyBold,
    color: "#C7C0CE",
    letterSpacing: 0.4,
  },
  semanaFila: { flexDirection: "row", marginBottom: 4, gap: 2 },
  celda: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 14,
    minHeight: 38,
    justifyContent: "center",
    gap: 3,
  },
  celdaTxt: {
    fontSize: 14.5,
    color: "#3A3342",
    fontFamily: AppFonts.bodyBold,
  },
  celdaHoy: {
    backgroundColor: Colors.purple,
    shadowColor: Colors.purple,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  celdaHoyTxt: { color: "#fff" },
  celdaSelec: {
    backgroundColor: Colors.purpleLt,
    borderWidth: 2,
    borderColor: Colors.purple,
  },
  celdaSelecTxt: { color: Colors.purpleDk },
  celdaPasado: {},
  punto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.purple,
  },
  puntoHueco: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.purple,
    backgroundColor: "transparent",
  },
  puntoHuecoHoy: { borderColor: "#fff" },

  // Panel día
  diaPanel: {
    minHeight: 200,
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#3A3342",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 3,
  },
  diaPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  diaPanelFecha: {
    fontSize: 17,
    fontFamily: AppFonts.displayBold,
    color: "#3A3342",
  },
  hoyBadge: {
    backgroundColor: GREEN + "22",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  hoyBadgeTxt: { fontSize: 11, fontFamily: AppFonts.bodyBold, color: GREEN },
  btnAdd: {
    backgroundColor: PURPLE,
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  emptyDia: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyDiaTxt: {
    fontSize: 13,
    fontFamily: AppFonts.body,
    color: "#BBB",
    textAlign: "center",
  },

  tareaFila: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F0F6",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    minHeight: 52,
    gap: 10,
  },
  tareaFilaVirtual: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#DDD",
  },
  tareaIconWrap: { width: 20, alignItems: "center" },
  tareaTitulo: {
    fontSize: 14.5,
    color: "#3A3342",
    fontFamily: AppFonts.displaySemibold,
  },
  tareaHora: {
    fontSize: 12,
    color: "#8A8194",
    fontFamily: AppFonts.body,
    marginTop: 2,
  },
  tareaVirtualTxt: {
    fontSize: 10,
    color: "#AAA",
    fontFamily: AppFonts.bodyBold,
    marginTop: 2,
  },
  btnEditar: { padding: 10 },
  btnEliminar: { padding: 10 },
  btnTemporizador: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#A77BBE",
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeaderTexts: { flex: 1, gap: 6 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: PURPLE },

  modalFechaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PURPLE_BG,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PURPLE_LT,
  },
  modalFechaChipTxt: { fontSize: 13, color: PURPLE, fontWeight: "600" },

  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PURPLE_BG,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  modalDivider: { height: 1, backgroundColor: PURPLE_LT, marginBottom: 16 },

  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalInputLabelOpc: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BBB",
    textTransform: "none",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PURPLE_LT,
    borderRadius: 14,
    paddingHorizontal: 20,
    backgroundColor: PURPLE_BG,
    minHeight: 48,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, color: "#333" },

  btnGuardar: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    marginTop: 4,
  },
  btnGuardarDisabled: { opacity: 0.45 },
  btnGuardarTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },

  pictoOpcion: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  pictoOpcionSelec: {
    borderColor: PURPLE,
    borderWidth: 3,
    backgroundColor: PURPLE_BG,
  },
  pictoImg: { width: 64, height: 64, borderRadius: 10 },
  pictoNinguno: { gap: 2 },
  pictoNingunoTxt: { fontSize: 10, color: "#CCC", fontWeight: "600" },
});
