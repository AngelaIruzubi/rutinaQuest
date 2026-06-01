import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
  View,
} from 'react-native';
import { DIAS_SEMANA, MESES } from '../../constants/diasSemana';
import { Colors } from '../../constants/theme';
import {
  deleteTarea,
  getFechasConTareas,
  getTareasPorFecha,
  insertTarea,
} from '../../database/database';
import { buscarPictogramas } from '../../services/arasaac';
import { ahoraApp, ahoraAppMs, hoyAppStr } from '../../utils/fecha';


const PURPLE    = Colors.purple;
const PURPLE_LT = Colors.purpleLt;
const PURPLE_BG = Colors.purpleBg;
const GREEN     = Colors.green;
const RED       = Colors.red;
function primerDiaMes(anyo: number, mes: number): Date { return new Date(anyo, mes, 1); } //en que columna empieza
function diasEnMes(anyo: number, mes: number): number  { return new Date(anyo, mes + 1, 0).getDate(); }

// Convierte YYYY-MM-DD a texto legible: "10 de abril de 2026"
function fechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

// ─── Calendario mensual ───
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
            const diaSemana   = DIAS_SEMANA[idx % 7];

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

// ─── Modal para añadir tarea ─────
function ModalNuevaTarea({
  visible, fecha, onClose, onGuardar,
}: {
  visible: boolean; fecha: string;
  onClose: () => void;
  onGuardar: (tarea: any) => void;
}) {
  const [titulo,      setTitulo]      = useState('');
  const [hora,        setHora]        = useState<string | null>(null);
  const [pictogramas, setPictogramas] = useState<number[]>([]);
  const [pictogramId, setPictogramId] = useState<number | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [tempTime,    setTempTime]    = useState(new Date());
  const [repeticion,  setRepeticion]  = useState<'ninguna'|'diaria'|'semanal'>('ninguna');

  const PURPLE    = '#A77BBE';
  const PURPLE_LT = '#E5D9EE';
  const PURPLE_BG = '#F4F0F6';

  const buscar = async (texto: string) => {
    setTitulo(texto);
    if (texto.trim().length < 2) {
      setPictogramas([]);
      setPictogramId(null);
      return;
    }
    const ids = await buscarPictogramas(texto, 6);
    if (ids.length > 0) {
      setPictogramas(ids);
      setPictogramId(ids[0]);
    } else {
      setPictogramas([]);
      setPictogramId(null);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) {
      setTempTime(date);
      setHora(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const cerrar = () => {
    setTitulo(''); setHora(null);
    setPictogramId(null); setPictogramas([]);
    setShowPicker(false); setRepeticion('ninguna');
    onClose();
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    onGuardar({
      id: `${fecha}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
      title: titulo.trim(),
      hora:  hora ?? 'Sin hora',
      pictogramId: pictogramId ?? null,
      repeticion,
    });
    setTitulo(''); setHora(null);
    setPictogramId(null); setPictogramas([]);
    setShowPicker(false); setRepeticion('ninguna');
    onClose();
    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} añadida para el ${fecha}`);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        
        <Pressable style={s.overlay} onPress={cerrar} accessible={false} importantForAccessibility="no">
      
          <Pressable style={s.modalBox} onPress={e => e.stopPropagation()} accessible={false} importantForAccessibility="yes">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              accessible={false}
              importantForAccessibility="yes"
            >

    
          <View style={s.modalHeader} accessible={false}>
            <View style={s.modalHeaderTexts} accessible={false}>
              <Text style={s.modalTitle} accessibilityRole="header">Nueva tarea</Text>
              <View style={s.modalFechaChip} accessible accessibilityLabel={`Para el ${fechaLegible(fecha)}`}>
                <Ionicons name="calendar-outline" size={13} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={s.modalFechaChipTxt} accessibilityElementsHidden importantForAccessibility="no">
                  {fechaLegible(fecha)}
                </Text>
              </View>
            </View>
            <Pressable onPress={cerrar} style={s.modalCloseBtn} accessible accessibilityRole="button" accessibilityLabel="Cerrar formulario de nueva tarea">
              <Ionicons name="close" size={22} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
            </Pressable>
          </View>

          <View style={s.modalDivider} accessible={false} />

          {/* ── Título ── */}
          <Text style={s.modalInputLabel} accessibilityElementsHidden importantForAccessibility="no">Título</Text>
          <View style={s.inputRow} accessible={false}>
            <TextInput
              placeholder="¿Qué quieres hacer?"
              value={titulo}
              onChangeText={buscar}
              style={s.input}
              accessibilityLabel="Título de la tarea"
              accessibilityHint="Escribe el nombre. Se buscarán pictogramas automáticamente"
              returnKeyType="done"
              clearButtonMode="while-editing"
              autoFocus
            />
          </View>

          {/* ── Selector múltiple de pictogramas ── */}
          {pictogramas.length > 0 && (
            <View style={{ marginBottom: 16 }} accessible={false}>
              <Text style={s.modalInputLabel} accessibilityRole="header">Elige un pictograma</Text>
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
                    style={[s.pictoOpcion, pictogramId === id && s.pictoOpcionSelec]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Pictograma opción ${i + 1}${pictogramId === id ? ', seleccionado' : ''}`}
                    accessibilityState={{ selected: pictogramId === id }}
                  >
                    <Image
                      source={{ uri: `https://static.arasaac.org/pictograms/${id}/${id}_300.png` }}
                      style={s.pictoImg}
                      accessibilityIgnoresInvertColors
                    />
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setPictogramId(null)}
                  style={[s.pictoOpcion, s.pictoNinguno, pictogramId === null && s.pictoOpcionSelec]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Sin pictograma${pictogramId === null ? ', seleccionado' : ''}`}
                  accessibilityState={{ selected: pictogramId === null }}
                >
                  <Ionicons name="close" size={22} color={pictogramId === null ? PURPLE : '#CCC'} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text style={[s.pictoNingunoTxt, pictogramId === null && { color: PURPLE }]} accessibilityElementsHidden importantForAccessibility="no">Ninguno</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* ── Hora ── */}
          <Text style={s.modalInputLabel} accessibilityElementsHidden importantForAccessibility="no">
            Hora (opcional)
          </Text>

          {Platform.OS === 'web' ? (
            <input
              type="time"
              onChange={e => setHora(e.target.value || null)}
              style={{ padding: 10, fontSize: 15, borderRadius: 10,
                borderColor: PURPLE_LT, border: `1px solid ${PURPLE_LT}`,
                 backgroundColor: PURPLE_BG, marginBottom: 16 }}
            />
          ) : (
            <>
              <Pressable
                onPress={() => setShowPicker(true)}
                style={[s.inputRow, { marginBottom: showPicker ? 8 : 16 }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={hora ? `Hora seleccionada: ${hora}. Pulsa para cambiar` : 'Seleccionar hora, opcional'}
              >
                <Ionicons name="time-outline" size={18} color={PURPLE}  accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[s.input, { color: hora ? '#333' : '#AAA', paddingVertical: 12 }]} accessibilityElementsHidden importantForAccessibility="no">
                  {hora ?? 'Sin hora seleccionada'}
                </Text>
                {hora && (
                  <Pressable
                    onPress={() => { setHora(null); setShowPicker(false); }}
                    accessible accessibilityRole="button" accessibilityLabel="Quitar hora"
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
                  </Pressable>
                )}
              </Pressable>

              {showPicker && (
                <View style={{ marginBottom: 16 }} accessible={false}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => setShowPicker(false)}
                      style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 6 }}
                      accessible accessibilityRole="button" accessibilityLabel="Confirmar hora seleccionada"
                    >
                      <Text style={{ color: PURPLE, fontWeight: '700', fontSize: 15 }}>Listo</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}

          {/* ── Repetición ── */}
          <Text style={[s.modalInputLabel, { marginTop: 8 }]}>¿Se repite?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }} accessible={false}>
            {(['ninguna', 'diaria', 'semanal'] as const).map(opcion => (
              <Pressable
                key={opcion}
                onPress={() => setRepeticion(opcion)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  borderWidth: 2, borderColor: repeticion === opcion ? PURPLE : '#E5E5E5',
                  backgroundColor: repeticion === opcion ? PURPLE_BG : '#fff',
                }}
                accessible accessibilityRole="button"
                accessibilityLabel={opcion === 'ninguna' ? 'Una vez' : opcion === 'diaria' ? 'Cada día' : 'Cada semana'}
                accessibilityState={{ selected: repeticion === opcion }}
              >
                <Text style={{ fontSize: 18 }}>
                  {opcion === 'ninguna' ? '1' : opcion === 'diaria' ? '📅' : '📆'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: repeticion === opcion ? PURPLE : '#999', marginTop: 2 }}>
                  {opcion === 'ninguna' ? 'Una vez' : opcion === 'diaria' ? 'Cada día' : 'Semanal'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Botón guardar ── */}
          <Pressable
            onPress={guardar}
            style={[s.btnGuardar, !titulo.trim() && s.btnGuardarDisabled]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={titulo.trim() ? `Añadir tarea ${titulo}` : 'Añadir tarea. Escribe un título primero'}
            accessibilityHint={titulo.trim() ? 'Guarda la tarea y cierra el formulario' : ''}
          >
            <Ionicons name="checkmark" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={s.btnGuardarTxt} accessibilityElementsHidden importantForAccessibility="no">Añadir tarea</Text>
          </Pressable>

            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}


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


const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingHorizontal: 14,
  },
  btnInicio: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: PURPLE + '18', borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 4, minHeight: 44,
  },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: 13 },
  headerTitle:  { fontSize: 30, fontWeight: '800', color: PURPLE, textAlign: 'center', marginBottom: 6 },

  // Cabecera mes
  mesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mesBtn:    { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  mesTitulo: { fontSize: 26, fontWeight: '700', color: PURPLE },

  // Calendario
  semanaCab:    { flexDirection: 'row', marginBottom: 6 },
  semanaCabTxt: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#BBB' },
  semanaFila:   { flexDirection: 'row', marginBottom: 2 },
  celda:        { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 10, minHeight: 36, justifyContent: 'center' },
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


overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
modalBox: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  paddingTop: 20,
  paddingHorizontal: 24,
  paddingBottom: 44,
 
},

modalHeader:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
modalHeaderTexts: { flex: 1, gap: 6 },
modalTitle:       { fontSize: 22, fontWeight: '800', color: PURPLE },

modalFechaChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PURPLE_BG, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: PURPLE_LT },
modalFechaChipTxt: { fontSize: 13, color: PURPLE, fontWeight: '600' },

modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE_BG, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

modalDivider: { height: 1, backgroundColor: PURPLE_LT, marginBottom: 16 },

modalInputLabel:    { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
modalInputLabelOpc: { fontSize: 12, fontWeight: '700', color: '#BBB', textTransform: 'none' },

inputRow: {
  flexDirection: 'row', alignItems: 'center',
  borderWidth: 1.5, borderColor: PURPLE_LT, borderRadius: 14,
  paddingHorizontal: 20, backgroundColor: PURPLE_BG,
  minHeight: 48, marginBottom: 16,
},
input: { flex: 1, fontSize: 15, color: '#333' },

btnGuardar:         { backgroundColor: PURPLE, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 52, marginTop: 4 },
btnGuardarDisabled: { opacity: 0.45 },
btnGuardarTxt:      { color: '#fff', fontWeight: '700', fontSize: 16 },

pictoOpcion:      { width: 76, height: 76, borderRadius: 14, borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 },
pictoOpcionSelec: { borderColor: PURPLE, borderWidth: 3, backgroundColor: PURPLE_BG },
pictoImg:         { width: 64, height: 64, borderRadius: 10 },
pictoNinguno:     { gap: 2 },
pictoNingunoTxt:  { fontSize: 10, color: '#CCC', fontWeight: '600' },
});
