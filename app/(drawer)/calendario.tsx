import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  deleteTarea,
  getFechasConTareas,
  getTareasPorFecha,
  insertTarea,
} from '../../database/database';
import { buscarPictograma } from '../../services/arasaac';
import { ahoraApp, ahoraAppMs, hoyAppStr } from '../../utils/fecha';

const PURPLE    = '#A77BBE';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const RED       = '#FF4444';

const DIAS_SEMANA       = ['L','M','X','J','V','S','D'];
const DIAS_SEMANA_LARGO = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function primerDiaMes(anyo: number, mes: number): Date { return new Date(anyo, mes, 1); }
function diasEnMes(anyo: number, mes: number): number  { return new Date(anyo, mes + 1, 0).getDate(); }

// Convierte YYYY-MM-DD a texto legible: "10 de abril de 2026"
function fechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

// ─── Calendario mensual ───────────────────────────────────────────────────────
function CalendarioMes({
  anyo, mes, fechasConTareas, fechaSeleccionada, onSelectFecha,
}: {
  anyo: number; mes: number;
  fechasConTareas: Record<string, number>;
  fechaSeleccionada: string | null;
  onSelectFecha: (f: string) => void;
}) {
  const hoy         = hoyAppStr();
  const totalDias   = diasEnMes(anyo, mes);
  const primerDia   = primerDiaMes(anyo, mes);
  const offsetLunes = (primerDia.getDay() + 6) % 7;
  const celdas      = offsetLunes + totalDias;
  const filas       = Math.ceil(celdas / 7);

  return (
    <View accessibilityRole="list" accessibilityLabel={`Calendario de ${MESES[mes]} ${anyo}`}>
      <View style={s.semanaCab} accessibilityElementsHidden importantForAccessibility="no">
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={s.semanaCabTxt}>{d}</Text>
        ))}
      </View>

      {Array.from({ length: filas }).map((_, fila) => (
        <View key={fila} style={s.semanaFila} accessible={false} importantForAccessibility="no">
          {Array.from({ length: 7 }).map((_, col) => {
            const idx = fila * 7 + col;
            const dia = idx - offsetLunes + 1;
            if (dia < 1 || dia > totalDias) {
              return <View key={col} style={s.celda} accessibilityElementsHidden importantForAccessibility="no" />;
            }
            const fecha       = `${anyo}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
            const esHoy       = fecha === hoy;
            const esPasado    = fecha < hoy;
            const selec       = fecha === fechaSeleccionada;
            const tieneTareas = !!fechasConTareas[fecha];
            const diaSemana   = DIAS_SEMANA_LARGO[idx % 7];

            let a11yLabel = `${dia} de ${MESES[mes]}, ${diaSemana}`;
            if (esHoy)              a11yLabel += ', hoy';
            if (selec)              a11yLabel += ', seleccionado';
            if (tieneTareas)        a11yLabel += ', con tareas';
            if (esPasado && !esHoy) a11yLabel += ', pasado';

            return (
              <Pressable
                key={col}
                style={[
                  s.celda,
                  esHoy    && s.celdaHoy,
                  selec    && s.celdaSelec,
                  esPasado && !esHoy && s.celdaPasado,
                ]}
                onPress={() => onSelectFecha(fecha)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={a11yLabel}
                accessibilityState={{ selected: selec }}
              >
                <Text style={[
                  s.celdaTxt,
                  esHoy    && s.celdaHoyTxt,
                  selec    && s.celdaSelecTxt,
                  esPasado && !esHoy && { color: '#CCC' },
                ]}>
                  {dia}
                </Text>
                {tieneTareas && (
                  <View
                    style={[s.punto, selec && { backgroundColor: '#fff' }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Modal para añadir tarea ──────────────────────────────────────────────────
function ModalNuevaTarea({
  visible, fecha, onClose, onGuardar,
}: {
  visible: boolean; fecha: string;
  onClose: () => void;
  onGuardar: (tarea: any) => void;
}) {
  const [titulo,      setTitulo]      = useState('');
  const [hora,        setHora]        = useState('');
  const [pictogramId, setPictogramId] = useState<number | null>(null);

  const buscar = async (texto: string) => {
    setTitulo(texto);
    const id = await buscarPictograma(texto);
    if (id) setPictogramId(id);
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    onGuardar({
      id: `${fecha}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
      title: titulo.trim(),
      hora:  hora.trim() || 'Sin hora',
      pictogramId: pictogramId ?? null,
    });
    setTitulo(''); setHora(''); setPictogramId(null);
    onClose();
    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} añadida para el ${fecha}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={s.overlay}
        onPress={onClose}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Cerrar modal"
      >
        <Pressable style={s.modalBox} onPress={e => e.stopPropagation()} accessible={false}>

          {/* ── Cabecera del modal ── */}
          <View style={s.modalHeader}>
            <View style={s.modalHeaderTexts}>
              <Text style={s.modalTitle} accessibilityRole="header">Nueva tarea</Text>
              <View style={s.modalFechaChip}>
                <Ionicons name="calendar-outline" size={13} color={PURPLE} />
                <Text style={s.modalFechaChipTxt} accessibilityLabel={`Para el ${fechaLegible(fecha)}`}>
                  {fechaLegible(fecha)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={s.modalCloseBtn}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={22} color={PURPLE} />
            </Pressable>
          </View>

          {/* ── Separador ── */}
          <View style={s.modalDivider} />

          {/* ── Título ── */}
          <Text style={s.modalInputLabel}>Título</Text>
          <View style={s.inputRow}>
            <TextInput
              placeholder="¿Qué quieres hacer?"
              value={titulo}
              onChangeText={buscar}
              style={s.input}
              accessibilityLabel="Título de la tarea"
              accessibilityHint="Escribe el nombre. Se buscará un pictograma automáticamente"
              returnKeyType="done"
              clearButtonMode="while-editing"
              autoFocus
            />
          </View>

          {/* ── Hora ── */}
          <Text style={s.modalInputLabel}>Hora <Text style={s.modalInputLabelOpc}>(opcional)</Text></Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              onChange={e => setHora(e.target.value)}
              style={{ padding: 10, fontSize: 15, borderRadius: 10,
                borderColor: PURPLE_LT, border: `1px solid ${PURPLE_LT}`,
                width: '100%', backgroundColor: PURPLE_BG }}
            />
          ) : (
            <View style={s.inputRow}>
              <Ionicons name="time-outline" size={18} color={PURPLE} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="HH:MM"
                value={hora}
                onChangeText={setHora}
                style={s.input}
                keyboardType="numeric"
                maxLength={5}
                accessibilityLabel="Hora de la tarea, opcional"
                accessibilityHint="Formato horas y minutos, por ejemplo 09:30"
              />
            </View>
          )}

          {/* ── Botón guardar ── */}
          <Pressable
            onPress={guardar}
            style={[s.btnGuardar, !titulo.trim() && s.btnGuardarDisabled]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Añadir tarea"
            accessibilityHint={titulo.trim() ? `Guardará la tarea ${titulo}` : 'Escribe un título primero'}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={s.btnGuardarTxt}>Añadir tarea</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Calendario() {
  const ahora = ahoraApp();
  const [anyo, setAnyo] = useState(ahora.getFullYear());
  const [mes,  setMes]  = useState(ahora.getMonth());

  const [fechaSelec,      setFechaSelec]      = useState<string | null>(null);
  const [tareasDia,       setTareasDia]       = useState<any[]>([]);
  const [fechasConTareas, setFechasConTareas] = useState<Record<string, number>>({});
  const [modalVisible,    setModalVisible]    = useState(false);

  const hoy = hoyAppStr();

  const cargar = useCallback(() => {
    setFechasConTareas(getFechasConTareas() as any);
    if (fechaSelec) setTareasDia(getTareasPorFecha(fechaSelec) as any[]);
  }, [fechaSelec]);

  useFocusEffect(cargar);

  const seleccionarFecha = (fecha: string) => {
    setFechaSelec(fecha);
    const todas = getTareasPorFecha(fecha) as any[];
    setTareasDia(todas.filter((t: any) => t.estado === 'pendiente' || (!t.estado && t.completed !== 1)));
    const n = todas.filter((t: any) => t.estado === 'pendiente' || (!t.estado && t.completed !== 1)).length;
    AccessibilityInfo.announceForAccessibility(
      n > 0 ? `${fecha}, ${n} tarea${n > 1 ? 's' : ''} pendiente${n > 1 ? 's' : ''}` : `${fecha}, sin tareas pendientes`
    );
  };

  const mesAnterior = () => {
    if (mes === 0) { setMes(11); setAnyo(a => a - 1); }
    else setMes(m => m - 1);
  };

  const mesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnyo(a => a + 1); }
    else setMes(m => m + 1);
  };

  const onGuardar = (tarea: any) => {
    insertTarea(tarea, fechaSelec!);
    const todas = getTareasPorFecha(fechaSelec!) as any[];
    setTareasDia(todas.filter((t: any) => t.estado === 'pendiente' || (!t.estado && t.completed !== 1)));
    setFechasConTareas(getFechasConTareas() as any);
  };

  const eliminar = (id: string, titulo: string) => {
    deleteTarea(id);
    setTareasDia(prev => prev.filter(t => t.id !== id));
    setFechasConTareas(getFechasConTareas() as any);
    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} eliminada`);
  };

  const esFuturo = fechaSelec !== null && fechaSelec > hoy;
  const esHoy    = fechaSelec === hoy;

  return (
    <View style={s.root}>

      <Text style={s.headerTitle} accessibilityRole="header">Calendario</Text>

      <Pressable
        onPress={() => router.replace('/')}
        style={s.btnInicio}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Ir a Inicio"
      >
        <Ionicons name="home-outline" size={16} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={s.btnInicioTxt}>Inicio</Text>
      </Pressable>

      {/* ── Cabecera mes ── */}
      <View style={s.mesHeader}>
        <Pressable onPress={mesAnterior} style={s.mesBtn} accessible accessibilityRole="button" accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={22} color={PURPLE} />
        </Pressable>
        <Text style={s.mesTitulo} accessibilityRole="header" accessibilityLabel={`${MESES[mes]} de ${anyo}`}>
          {MESES[mes]} {anyo}
        </Text>
        <Pressable onPress={mesSiguiente} style={s.mesBtn} accessible accessibilityRole="button" accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={22} color={PURPLE} />
        </Pressable>
      </View>

      {/* ── Calendario ── */}
      <CalendarioMes
        anyo={anyo} mes={mes}
        fechasConTareas={fechasConTareas}
        fechaSeleccionada={fechaSelec}
        onSelectFecha={seleccionarFecha}
      />

      {/* ── Panel del día seleccionado ── */}
      {fechaSelec && (
        <View style={s.diaPanel} accessible={false}>
          <View style={s.diaPanelHeader}>
            <View>
              <Text style={s.diaPanelFecha} accessibilityLabel={`Día seleccionado: ${fechaLegible(fechaSelec)}${esHoy ? ', hoy' : ''}`}>
                {fechaLegible(fechaSelec)}
              </Text>
              {esHoy && (
                <View style={s.hoyBadge}>
                  <Text style={s.hoyBadgeTxt}>Hoy</Text>
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
                <Ionicons name="add" size={22} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} accessible={false}>
            {tareasDia.length === 0 ? (
              <View
                style={s.emptyDia}
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel={esFuturo || esHoy ? 'Sin tareas pendientes. Pulsa el botón más para añadir' : 'Sin tareas pendientes este día'}
              >
                <Ionicons name={esFuturo || esHoy ? 'add-circle-outline' : 'checkmark-circle-outline'} size={32} color="#DDD" />
                <Text style={s.emptyDiaTxt}>
                  {esFuturo || esHoy ? 'Sin tareas · pulsa + para añadir' : 'Sin tareas este día'}
                </Text>
              </View>
            ) : (
              tareasDia.map((t: any) => {
                const horaLabel = t.hora && t.hora !== 'Sin hora' ? `, hora ${t.hora}` : '';
                return (
                  <View
                    key={t.id}
                    style={s.tareaFila}
                    accessible
                    accessibilityLabel={`${t.title}${horaLabel}`}
                  >
                    <View style={s.tareaIconWrap}>
                      <Ionicons name="ellipse" size={8} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tareaTitulo} numberOfLines={1}>{t.title}</Text>
                      {t.hora && t.hora !== 'Sin hora' && (
                        <Text style={s.tareaHora} accessibilityElementsHidden importantForAccessibility="no">
                          🕐 {t.hora}
                        </Text>
                      )}
                    </View>
                    {esFuturo && (
                      <Pressable
                        onPress={() => eliminar(t.id, t.title)}
                        style={s.btnEliminar}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar tarea ${t.title}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={RED} accessibilityElementsHidden importantForAccessibility="no" />
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <ModalNuevaTarea
        visible={modalVisible}
        fecha={fechaSelec || ''}
        onClose={() => setModalVisible(false)}
        onGuardar={onGuardar}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 14,
  },
  btnInicio: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: PURPLE + '18', borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 8, minHeight: 44,
  },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: 13 },
  headerTitle:  { fontSize: 30, fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 16 },

  // Cabecera mes
  mesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mesBtn:    { padding: 20, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  mesTitulo: { fontSize: 26, fontWeight: '700', color: PURPLE },

  // Calendario
  semanaCab:    { flexDirection: 'row', marginBottom: 10 },
  semanaCabTxt: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#BBB' },
  semanaFila:   { flexDirection: 'row', marginBottom: 4 },
  celda:        { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  celdaTxt:     { fontSize: 14, color: '#333', fontWeight: '500' },
  celdaHoy:     { backgroundColor: PURPLE },
  celdaHoyTxt:  { color: '#fff', fontWeight: '700' },
  celdaSelec:   { backgroundColor: PURPLE_LT, borderWidth: 1.5, borderColor: PURPLE },
  celdaSelecTxt:{ color: PURPLE, fontWeight: '700' },
  celdaPasado:  {},
  punto:        { width: 5, height: 5, borderRadius: 3, backgroundColor: PURPLE, marginTop: 2 },

  // Panel día
  diaPanel: {
    flex: 1, marginTop: 16,
    backgroundColor: PURPLE_BG, borderRadius: 20,
    padding: 14, borderWidth: 1, borderColor: PURPLE_LT,
  },
  diaPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  diaPanelFecha:  { fontSize: 15, fontWeight: '700', color: PURPLE },
  hoyBadge:       { backgroundColor: GREEN + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3 },
  hoyBadgeTxt:    { fontSize: 11, fontWeight: '700', color: GREEN },
  btnAdd: {
    backgroundColor: PURPLE, width: 44, height: 44,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },

  emptyDia:    { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyDiaTxt: { fontSize: 13, color: '#BBB', textAlign: 'center' },

  tareaFila: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 8, borderWidth: 1, borderColor: PURPLE_LT,
    minHeight: 52, gap: 10,
  },
  tareaIconWrap: { width: 20, alignItems: 'center' },
  tareaTitulo:   { fontSize: 14, color: '#333', fontWeight: '600' },
  tareaHora:     { fontSize: 12, color: '#888', marginTop: 2 },
  btnEliminar:   { padding: 10 },

// ── Modal ──────────────────────────────────────────────────────────────────
overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
modalBox: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  paddingTop: 20,
  paddingHorizontal: 24,
  paddingBottom: 44,
  // ← sin gap
},

modalHeader:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
modalHeaderTexts: { flex: 1, gap: 6 },
modalTitle:       { fontSize: 22, fontWeight: '800', color: PURPLE },

modalFechaChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PURPLE_BG, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: PURPLE_LT },
modalFechaChipTxt: { fontSize: 13, color: PURPLE, fontWeight: '600' },

modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE_BG, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

modalDivider: { height: 1, backgroundColor: PURPLE_LT, marginBottom: 16 },

modalInputLabel:    { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
modalInputLabelOpc: { fontSize: 11, fontWeight: '400', color: '#BBB', textTransform: 'none' },

inputRow: {
  flexDirection: 'row', alignItems: 'center',
  borderWidth: 1.5, borderColor: PURPLE_LT, borderRadius: 14,
  paddingHorizontal: 14, backgroundColor: PURPLE_BG,
  minHeight: 48, marginBottom: 16,
},
input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },

btnGuardar:         { backgroundColor: PURPLE, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 52, marginTop: 4 },
btnGuardarDisabled: { opacity: 0.45 },
btnGuardarTxt:      { color: '#fff', fontWeight: '700', fontSize: 16 },
});
