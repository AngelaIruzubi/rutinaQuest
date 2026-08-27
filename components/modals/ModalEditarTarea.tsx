import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuracionPicker } from '../../components/ui/DuracionPicker';
import { SelectorDiasSemana } from '../../components/ui/SelectorDiasSemana';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useBuscarPictogramasDebounced } from '../../hooks/useBuscarPictogramasDebounced';
import { buscarPictogramas } from '../../services/arasaac';
import { Tarea } from '../../types/tarea';
import { fechaAppDate } from '../../utils/fecha';
import { parseTiempoLim } from '../../utils/tiempo';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Repeticion = 'ninguna' | 'diaria' | 'semanal';

interface ModalEditarTareaProps {
  visible:   boolean;
  tarea:     Tarea | null;
  onCerrar:  () => void;
  onGuardar: (
    titulo: string,
    pictogramId: number | null,
    hora: string,
    duracionSeg: number | null,
    repeticion: Repeticion,
    diasSemana: number[] | null,
  ) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalEditarTarea({ visible, tarea, onCerrar, onGuardar }: ModalEditarTareaProps) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const insets = useSafeAreaInsets();
  const { height: alturaVentana } = useWindowDimensions();
  const [editTitulo,      setEditTitulo]      = useState('');
  const [editPictogramas, setEditPictogramas] = useState<number[]>([]);
  const [editPictogramId, setEditPictogramId] = useState<number | null>(null);
  const [editHora,        setEditHora]        = useState<string | null>(null);
  const [editDuracionSeg, setEditDuracionSeg] = useState<number | null>(null);
  const [showEditPicker,  setShowEditPicker]  = useState(false);
  const [editTempTime,    setEditTempTime]    = useState(fechaAppDate());
  const [editRepeticion,  setEditRepeticion]  = useState<Repeticion>('ninguna');
  const [editDiasSemana,  setEditDiasSemana]  = useState<number[]>([]);
  const { buscar: buscarPictosDebounced } = useBuscarPictogramasDebounced();

  // Inicializar estado cuando se abre el modal con una tarea
  useEffect(() => {
    if (!visible || !tarea) return;
    setEditTitulo(tarea.title);
    setEditPictogramId(tarea.pictogramId ?? null);
    setEditHora(tarea.hora !== 'Sin hora' ? tarea.hora : null);
    setEditDuracionSeg(tarea.duracionSeg ?? null);
    const dl = parseTiempoLim(tarea.hora);
    setEditTempTime(dl ?? fechaAppDate());
    setShowEditPicker(false);
    setEditRepeticion(tarea.repeticion ?? 'ninguna');
    if (tarea.diasSemana && tarea.diasSemana.length > 0) {
      setEditDiasSemana(tarea.diasSemana);
    } else {
      const [fy, fm, fd] = (tarea.fechaDia ?? '').split('-').map(Number);
      setEditDiasSemana([fy && fm && fd ? new Date(fy, fm - 1, fd).getDay() : new Date().getDay()]);
    }
    if (tarea.title.trim().length >= 2) {
      buscarPictogramas(tarea.title, 6).then(ids => setEditPictogramas(ids));
    } else {
      setEditPictogramas(tarea.pictogramId ? [tarea.pictogramId] : []);
    }
  }, [visible, tarea?.id]);

  const faltaDia = editRepeticion === 'semanal' && editDiasSemana.length === 0;

  const guardar = () => {
    if (!editTitulo.trim() || faltaDia) return;
    const horaFinal = editHora ?? 'Sin hora';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGuardar(
      editTitulo.trim(),
      editPictogramId,
      horaFinal,
      editDuracionSeg,
      editRepeticion,
      editRepeticion === 'semanal' ? editDiasSemana : null,
    );
    AccessibilityInfo.announceForAccessibility(`Tarea actualizada: ${editTitulo}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      accessibilityViewIsModal
    >
      <View style={[s.overlay, { paddingTop: insets.top + 20 }]} accessible={false}>
        <View style={[s.modalBox, { maxHeight: alturaVentana * 0.85 }]} accessible={false} importantForAccessibility="yes">
          <LinearGradient
            colors={['#F7F2FA', '#EFE6F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={s.headerRow}>
              <View style={s.headerIcon}>
                <Ionicons name="pencil" size={18} color={Colors.purple} />
              </View>
              <Text style={[s.headerTitle, { fontSize: fs(21) }]} accessibilityRole="header">
                Editar tarea
              </Text>
              <Pressable
                onPress={onCerrar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cerrar edición"
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.purpleDk} accessibilityElementsHidden importantForAccessibility="no" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView style={{ flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" accessible={false} contentContainerStyle={[s.body, { paddingBottom: 20 + insets.bottom }]}>

            {/* Título */}
            <View style={s.inputRow} accessible={false}>
              <TextInput
                value={editTitulo}
                onChangeText={(texto) => {
                  setEditTitulo(texto);
                  buscarPictosDebounced(texto, (ids) => setEditPictogramas(ids));
                }}
                style={{ flex: 1, paddingVertical: 14, fontSize: fs(17), fontFamily: AppFonts.body, color: '#3A3140' }}
                accessibilityLabel="Título de la tarea"
                returnKeyType="done"
                clearButtonMode="while-editing"
                autoFocus
              />
            </View>

            {/* Selector de pictogramas */}
            {editPictogramas.length > 0 && (
              <View style={{ marginTop: 20 }} accessible={false}>
                <Text style={s.pictoLabel} accessibilityRole="header">Elige un pictograma</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                  accessible={false}
                >
                  {editPictogramas.map((id, i) => (
                    <Pressable
                      key={id}
                      onPress={() => setEditPictogramId(id)}
                      style={[s.pictoOpcion, editPictogramId === id && s.pictoOpcionSelec]}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Pictograma opción ${i + 1}${editPictogramId === id ? ', seleccionado' : ''}`}
                      accessibilityState={{ selected: editPictogramId === id }}
                    >
                      <Image
                        source={{ uri: `https://static.arasaac.org/pictograms/${id}/${id}_300.png` }}
                        style={s.pictoImg}
                        accessibilityIgnoresInvertColors
                      />
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setEditPictogramId(null)}
                    style={[s.pictoOpcion, s.pictoNinguno, editPictogramId === null && s.pictoOpcionSelec]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Sin pictograma${editPictogramId === null ? ', seleccionado' : ''}`}
                    accessibilityState={{ selected: editPictogramId === null }}
                  >
                    <Ionicons name="close" size={22} color={editPictogramId === null ? Colors.purple : '#CCC'} accessibilityElementsHidden importantForAccessibility="no" />
                    <Text style={[s.pictoNingunoTxt, editPictogramId === null && { color: Colors.purple }]} accessibilityElementsHidden importantForAccessibility="no">
                      Ninguno
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* Hora */}
            <Text style={[s.pictoLabel, { marginTop: 20 }]}>Hora (opcional)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={editHora ?? ''}
                onChange={e => setEditHora(e.target.value || null)}
                style={{ padding: 10, fontSize: 16, borderRadius: 10, marginBottom: 8 }}
              />
            ) : (
              <>
                <Pressable
                  onPress={() => setShowEditPicker(true)}
                  style={[s.inputRow, { marginBottom: showEditPicker ? 8 : 16 }]}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={editHora ? `Hora: ${editHora}. Pulsa para cambiar` : 'Seleccionar hora, opcional'}
                >
                  <Ionicons name="time-outline" size={18} color={Colors.purpleDk} style={{ marginRight: 4 }} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text
                    style={{ color: editHora ? '#3A3140' : '#B9AFC4', flex: 1, paddingVertical: 14, fontSize: fs(16), fontFamily: editHora ? AppFonts.bodyBold : AppFonts.body }}
                    accessibilityElementsHidden importantForAccessibility="no"
                  >
                    {editHora ?? 'Sin hora seleccionada'}
                  </Text>
                  {editHora && (
                    <Pressable
                      onPress={() => { setEditHora(null); setShowEditPicker(false); }}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel="Quitar hora"
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
                    </Pressable>
                  )}
                </Pressable>

                {showEditPicker && (
                  <View style={{ marginBottom: 8 }} accessible={false}>
                    <DateTimePicker
                      value={editTempTime}
                      mode="time"
                      is24Hour
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') setShowEditPicker(false);
                        if (date) {
                          setEditTempTime(date);
                          setEditHora(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                        }
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <Pressable
                        onPress={() => setShowEditPicker(false)}
                        style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 6 }}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel="Confirmar hora"
                      >
                        <Text style={{ color: Colors.purple, fontFamily: AppFonts.bodyBold, fontSize: 15 }}>Listo</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Repetición */}
            <Text style={[s.pictoLabel, { marginTop: 20 }]}>¿Se repite?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }} accessible={false}>
              {(['ninguna', 'diaria', 'semanal'] as const).map((opcion) => (
                <Pressable
                  key={opcion}
                  onPress={() => setEditRepeticion(opcion)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: editRepeticion === opcion ? Colors.purple : '#E5E5E5',
                    backgroundColor: editRepeticion === opcion ? Colors.purpleBg : '#fff',
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={
                    opcion === 'ninguna' ? 'Una vez' : opcion === 'diaria' ? 'Cada día' : 'Cada semana'
                  }
                  accessibilityState={{ selected: editRepeticion === opcion }}
                >
                  <Ionicons
                    name={
                      opcion === 'ninguna'
                        ? 'checkmark-circle-outline'
                        : opcion === 'diaria'
                          ? 'repeat-outline'
                          : 'calendar-outline'
                    }
                    size={22}
                    color={editRepeticion === opcion ? Colors.purple : '#999'}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text
                    style={{
                      fontSize: fs(11),
                      fontWeight: '600',
                      color: editRepeticion === opcion ? Colors.purple : '#999',
                      marginTop: 2,
                    }}
                  >
                    {opcion === 'ninguna' ? 'Una vez' : opcion === 'diaria' ? 'Cada día' : 'Semanal'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {editRepeticion === 'semanal' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.pictoLabel}>¿Qué días?</Text>
                <SelectorDiasSemana diasSemana={editDiasSemana} onChange={setEditDiasSemana} />
              </View>
            )}

            {/* Duración con temporizador */}
            <View style={{ marginTop: 20 }}>
              <DuracionPicker valorSeg={editDuracionSeg} onChange={setEditDuracionSeg} />
            </View>

            {/* Botón guardar */}
            <Pressable
              onPress={guardar}
              disabled={!editTitulo.trim() || faltaDia}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                !editTitulo.trim()
                  ? 'Escribe un título primero'
                  : faltaDia
                    ? 'Marca al menos un día de la semana'
                    : `Guardar cambios en ${editTitulo}`
              }
              style={({ pressed }) => [{ opacity: !editTitulo.trim() || faltaDia ? 0.4 : pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={['#C9A9DB', Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btnPrimary}
              >
                <Ionicons name="checkmark-circle" size={22} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[s.btnPrimaryText, { fontSize: fs(18) }]} accessibilityElementsHidden importantForAccessibility="no">
                  Guardar cambios
                </Text>
              </LinearGradient>
            </Pressable>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(46,32,58,0.45)', justifyContent: 'flex-start', alignItems: 'center' },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 26,
    width: '90%',
    overflow: 'hidden',
    shadowColor: '#2E203A',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EDE3F2',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: AppFonts.displayExtraBold, color: '#5F4479' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingTop: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FBF9FC',
    borderWidth: 1.5,
    borderColor: Colors.purpleLt,
    minHeight: 54,
  },

  pictoLabel: {
    fontSize: 12,
    fontFamily: AppFonts.bodyBold,
    color: Colors.purpleDk,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  pictoOpcion: {
    width: 78,
    height: 78,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#EDEAF1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pictoOpcionSelec: {
    borderColor: Colors.purple,
    borderWidth: 3,
    backgroundColor: Colors.purpleBg,
    shadowColor: Colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  pictoImg:        { width: 68, height: 68, borderRadius: 12 },
  pictoNinguno:    { gap: 2 },
  pictoNingunoTxt: { fontSize: 10, color: '#CCC', fontFamily: AppFonts.bodyBold },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 8,
    minHeight: 44,
    shadowColor: Colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },
});
