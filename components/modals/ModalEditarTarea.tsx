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
  View,
} from 'react-native';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
import { buscarPictogramas } from '../../services/arasaac';
import { Tarea } from '../../types/tarea';
import { fechaAppDate } from '../../utils/fecha';
import { parseTiempoLim } from '../../utils/tiempo';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModalEditarTareaProps {
  visible:   boolean;
  tarea:     Tarea | null;
  onCerrar:  () => void;
  onGuardar: (titulo: string, pictogramId: number | null, hora: string) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalEditarTarea({ visible, tarea, onCerrar, onGuardar }: ModalEditarTareaProps) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const [editTitulo,      setEditTitulo]      = useState('');
  const [editPictogramas, setEditPictogramas] = useState<number[]>([]);
  const [editPictogramId, setEditPictogramId] = useState<number | null>(null);
  const [editHora,        setEditHora]        = useState<string | null>(null);
  const [showEditPicker,  setShowEditPicker]  = useState(false);
  const [editTempTime,    setEditTempTime]    = useState(fechaAppDate());

  // Inicializar estado cuando se abre el modal con una tarea
  useEffect(() => {
    if (!visible || !tarea) return;
    setEditTitulo(tarea.title);
    setEditPictogramId(tarea.pictogramId ?? null);
    setEditHora(tarea.hora !== 'Sin hora' ? tarea.hora : null);
    const dl = parseTiempoLim(tarea.hora);
    setEditTempTime(dl ?? fechaAppDate());
    setShowEditPicker(false);
    if (tarea.title.trim().length >= 2) {
      buscarPictogramas(tarea.title, 6).then(ids => setEditPictogramas(ids));
    } else {
      setEditPictogramas(tarea.pictogramId ? [tarea.pictogramId] : []);
    }
  }, [visible, tarea?.id]);

  const guardar = () => {
    if (!editTitulo.trim()) return;
    const horaFinal = editHora ?? 'Sin hora';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGuardar(editTitulo.trim(), editPictogramId, horaFinal);
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
      <View style={s.overlay} accessible={false}>
        <View style={s.modalBox} accessible={false} importantForAccessibility="yes">
          <LinearGradient
            colors={['#C9A9DB', Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <Text style={[s.headerTitle, { fontSize: fs(19) }]} accessibilityRole="header">
              Editar tarea
            </Text>
            <Pressable
              onPress={onCerrar}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cerrar edición"
              style={s.closeBtn}
            >
              <Ionicons name="close" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
            </Pressable>
          </LinearGradient>

          <ScrollView keyboardShouldPersistTaps="handled" accessible={false} contentContainerStyle={s.body}>

            {/* Título */}
            <View style={s.inputRow} accessible={false}>
              <TextInput
                value={editTitulo}
                onChangeText={async (texto) => {
                  setEditTitulo(texto);
                  if (texto.trim().length >= 2) {
                    const ids = await buscarPictogramas(texto, 6);
                    setEditPictogramas(ids);
                  }
                }}
                style={{ flex: 1, paddingVertical: 12, fontSize: fs(16), fontFamily: AppFonts.body, color: '#3A3140' }}
                accessibilityLabel="Título de la tarea"
                returnKeyType="done"
                clearButtonMode="while-editing"
                autoFocus
              />
            </View>

            {/* Selector de pictogramas */}
            {editPictogramas.length > 0 && (
              <View style={{ marginTop: 18 }} accessible={false}>
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
            <Text style={[s.pictoLabel, { marginTop: 18 }]}>Hora (opcional)</Text>
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
                    style={{ color: editHora ? '#3A3140' : '#B9AFC4', flex: 1, paddingVertical: 12, fontSize: fs(15), fontFamily: editHora ? AppFonts.bodyBold : AppFonts.body }}
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

            {/* Botón guardar */}
            <Pressable
              onPress={guardar}
              disabled={!editTitulo.trim()}
              accessible
              accessibilityRole="button"
              accessibilityLabel={editTitulo.trim() ? `Guardar cambios en ${editTitulo}` : 'Escribe un título primero'}
              style={({ pressed }) => [{ opacity: !editTitulo.trim() ? 0.4 : pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={['#C9A9DB', Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btnPrimary}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
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
  overlay:    { flex: 1, backgroundColor: 'rgba(46,32,58,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox:   { backgroundColor: '#fff', borderRadius: 28, width: '90%', maxHeight: '90%', overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  headerTitle: { fontFamily: AppFonts.displayBold, color: '#fff' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingTop: 18 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.purpleLt,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FBF9FC',
    minHeight: 48,
  },

  pictoLabel: {
    fontSize: 12,
    fontFamily: AppFonts.bodyBold,
    color: Colors.purpleDk,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  pictoOpcion: {
    width: 78,
    height: 78,
    borderRadius: 16,
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
    shadowRadius: 6,
    elevation: 4,
  },
  pictoImg:        { width: 64, height: 64, borderRadius: 10 },
  pictoNinguno:    { gap: 2 },
  pictoNingunoTxt: { fontSize: 10, color: '#CCC', fontFamily: AppFonts.bodyBold },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 6,
    minHeight: 44,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },
});
