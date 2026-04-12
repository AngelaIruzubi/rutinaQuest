// app/(drawer)/calendario.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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

// ─── Utilidades de fecha ──────────────────────────────────────────────────────
function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function primerDiaMes(anyo: number, mes: number): Date {
  return new Date(anyo, mes, 1);
}

function diasEnMes(anyo: number, mes: number): number {
  return new Date(anyo, mes + 1, 0).getDate();
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['L','M','X','J','V','S','D'];

// ─── Calendario mensual ───────────────────────────────────────────────────────
function CalendarioMes({
  anyo, mes, fechasConTareas, fechaSeleccionada, onSelectFecha,
}: {
  anyo: number; mes: number;
  fechasConTareas: Record<string, number>;
  fechaSeleccionada: string|null;
  onSelectFecha: (f: string) => void;
}) {
  const hoy         = hoyAppStr();
  const totalDias   = diasEnMes(anyo, mes);
  const primerDia   = primerDiaMes(anyo, mes);
  // getDay() → 0=Dom; convertir a lunes=0
  const offsetLunes = (primerDia.getDay() + 6) % 7;
  const celdas      = offsetLunes + totalDias;
  const filas       = Math.ceil(celdas / 7);

  return (
    <View>
      {/* Cabecera días semana */}
      <View style={s.semanaCab}>
        {DIAS_SEMANA.map(d => (
          <Text key={d} style={s.semanaCabTxt}>{d}</Text>
        ))}
      </View>

      {/* Cuadrícula */}
      {Array.from({ length: filas }).map((_, fila) => (
        <View key={fila} style={s.semanaFila}>
          {Array.from({ length: 7 }).map((_, col) => {
            const idx = fila * 7 + col;
            const dia = idx - offsetLunes + 1;
            if (dia < 1 || dia > totalDias) {
              return <View key={col} style={s.celda} />;
            }
            const fecha    = `${anyo}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}` ;
            const esHoy    = fecha === hoy;
            const esPasado = fecha < hoy;
            const selec    = fecha === fechaSeleccionada;
            const tieneTareas = !!fechasConTareas[fecha];

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
                  <View style={[s.punto, selec && { backgroundColor: '#fff' }]} />
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
  const [pictogramId, setPictogramId] = useState<number|null>(null);
  const [showPicker,  setShowPicker]  = useState(false);

  const buscar = async (texto: string) => {
    setTitulo(texto);
    const id = await buscarPictograma(texto);
    if (id) setPictogramId(id);
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    onGuardar({
      id: `${fecha}_${ahoraAppMs()}_${Math.random().toString(36).slice(2,8)}`,
      title: titulo.trim(),
      hora:  hora.trim() || 'Sin hora',
      pictogramId: pictogramId ?? null,
    });
    setTitulo(''); setHora(''); setPictogramId(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modalBox} onPress={e => e.stopPropagation()}>
          <Pressable onPress={onClose} style={s.modalClose}>
            <Ionicons name="close" size={26} color={PURPLE} />
          </Pressable>

          <Text style={s.modalTitle}>Nueva tarea</Text>
          <Text style={s.modalFecha}>{fecha}</Text>

          {/* Título */}
          <View style={s.inputRow}>
            <TextInput
              placeholder="Título de la tarea..."
              value={titulo}
              onChangeText={buscar}
              style={s.input}
            />
          </View>

          {/* Hora */}
          {Platform.OS === 'web' ? (
            <input
              type="time"
              onChange={e => setHora(e.target.value)}
              style={{ marginTop: 10, padding: 8, fontSize: 16, borderRadius: 8,
                borderColor: PURPLE_LT, borderWidth: 1, width: '100%' }}
            />
          ) : (
            <View style={s.inputRow}>
              <TextInput
                placeholder="HH:MM (opcional)"
                value={hora}
                onChangeText={setHora}
                style={s.input}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          )}

          <Pressable onPress={guardar} style={s.btnGuardar}>
            <Text style={s.btnGuardarTxt}>Añadir tarea ✓</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Calendario() {
  const ahora = ahoraApp();
  const [anyo, setAnyo]     = useState(ahora.getFullYear());
  const [mes,  setMes]      = useState(ahora.getMonth());

  const [fechaSelec,      setFechaSelec]      = useState<string|null>(null);
  const [tareasDia,       setTareasDia]       = useState<any[]>([]);
  const [fechasConTareas, setFechasConTareas] = useState<Record<string,number>>({});
  const [modalVisible,    setModalVisible]    = useState(false);

  const hoy = hoyAppStr();

  // ── Cargar datos al entrar o al cambiar mes ───────────────────────────────
  const cargar = useCallback(() => {
    setFechasConTareas(getFechasConTareas() as any);
    if (fechaSelec) setTareasDia(getTareasPorFecha(fechaSelec) as any[]);
  }, [fechaSelec]);

  useFocusEffect(cargar);

  const seleccionarFecha = (fecha: string) => {
    setFechaSelec(fecha);
    const todas = getTareasPorFecha(fecha) as any[];
    setTareasDia(todas.filter((t: any) => t.estado === 'pendiente' || (!t.estado && t.completed !== 1)));
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

  const eliminar = (id: string) => {
    deleteTarea(id);
    setTareasDia(prev => prev.filter(t => t.id !== id));
    setFechasConTareas(getFechasConTareas() as any);
  };

  const esFuturo = fechaSelec !== null && fechaSelec > hoy;
  const esHoy    = fechaSelec === hoy;

  return (
    <View style={s.root}>
      <Text style={s.headerTitle}>Calendario</Text>
        <Pressable
              onPress={() => router.replace('/')}
              style={s.btnInicio}
            >
              <Ionicons name="home-outline" size={16} color={PURPLE} />
              <Text style={s.btnInicioTxt}>Inicio</Text>
            </Pressable>
      
      {/* ── Cabecera mes ── */}
      <View style={s.mesHeader}>
        <Pressable onPress={mesAnterior} style={s.mesBtn}>
          <Ionicons name="chevron-back" size={22} color={PURPLE} />
        </Pressable>
        <Text style={s.mesTitulo}>{MESES[mes]} {anyo}</Text>
        <Pressable onPress={mesSiguiente} style={s.mesBtn}>
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

      {/* ── Panel del día seleccionado: solo si hay fecha elegida ── */}
      {fechaSelec && (
        <View style={s.diaPanel}>
          <View style={s.diaPanelHeader}>
            <Text style={s.diaPanelFecha}>
              {fechaSelec}
              {esHoy && <Text style={s.diaPanelHoyBadge}> · Hoy</Text>}
            </Text>
            {/* Añadir solo en hoy o futuro */}
            {(esHoy || esFuturo) && (
              <Pressable onPress={() => setModalVisible(true)} style={s.btnAdd}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tareasDia.length === 0 ? (
              <View style={s.emptyDia}>
                <Text style={s.emptyDiaTxt}>
                  {esFuturo || esHoy
                    ? 'Sin tareas pendientes · pulsa + para añadir'
                    : 'Sin tareas pendientes este día'}
                </Text>
              </View>
            ) : (
              tareasDia.map((t: any) => (
                <View key={t.id} style={s.tareaFila}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tareaTitulo} numberOfLines={1}>{t.title}</Text>
                    {t.hora && t.hora !== 'Sin hora' && (
                      <Text style={s.tareaHora}>🕐 {t.hora}</Text>
                    )}
                  </View>
                  {/* Papelera solo en días FUTUROS, no en hoy */}
                  {esFuturo && (
                    <Pressable onPress={() => eliminar(t.id)} style={s.btnEliminar}>
                      <Ionicons name="trash-outline" size={16} color={RED} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Modal nueva tarea ── */}
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
    alignSelf: 'flex-start', marginBottom: 8,
  },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: 13 },


   headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: PURPLE,
    textAlign: 'center',
    marginBottom: 60,
  },

  // Cabecera mes
  mesHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  mesBtn:     { padding: 20 },
  mesTitulo:  { fontSize: 26, fontWeight: '700', color: PURPLE },

  // Calendario
  semanaCab:    { flexDirection: 'row', marginBottom: 10 },
  semanaCabTxt: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#BBB' },
  semanaFila:   { flexDirection: 'row', marginBottom: 4 },

  celda:        { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
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
  diaPanelFecha:  { fontSize: 14, fontWeight: '700', color: PURPLE },
  diaPanelHoyBadge: { color: GREEN, fontWeight: '600' },
  btnAdd: { backgroundColor: PURPLE, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  emptyDia:    { alignItems: 'center', paddingVertical: 24 },
  emptyDiaTxt: { fontSize: 13, color: '#BBB' },

  tareaFila: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: PURPLE_LT,
  },
  tareaFilaCompletada: { backgroundColor: '#F0FFF4', borderColor: '#B2DFDB' },
  tareaTitulo:      { fontSize: 14, color: '#333', fontWeight: '600' },
  tareaTituloHecha: { textDecorationLine: 'line-through', color: '#AAA' },
  tareaHora:        { fontSize: 12, color: '#888', marginTop: 2 },
  tareaAcciones:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tareaCheck:       { fontSize: 16 },
  btnEliminar:      { padding: 4 },

  // Modal
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  modalClose: { alignSelf: 'flex-end' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: PURPLE, textAlign: 'center' },
  modalFecha: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: -6 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: PURPLE_LT, borderRadius: 12,
    paddingHorizontal: 12, backgroundColor: PURPLE_BG,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },

  btnGuardar:    { backgroundColor: PURPLE, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  btnGuardarTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
