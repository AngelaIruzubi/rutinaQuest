import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { Colors } from '../../constants/theme';
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
          <ScrollView keyboardShouldPersistTaps="handled" accessible={false}>

            {/* Cabecera */}
            <View style={s.topBar} accessible={false}>
              <Pressable
                onPress={onCerrar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cerrar edición"
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={26} color={Colors.purple} accessibilityElementsHidden importantForAccessibility="no" />
              </Pressable>
              <Text style={s.topTitle} accessibilityRole="header">Editar tarea</Text>
            </View>

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
                style={{ flex: 1, paddingVertical: 10, fontSize: 16 }}
                accessibilityLabel="Título de la tarea"
                returnKeyType="done"
                clearButtonMode="while-editing"
                autoFocus
              />
            </View>

            {/* Selector de pictogramas */}
            {editPictogramas.length > 0 && (
              <View style={{ marginTop: 16 }} accessible={false}>
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
                    <Ionicons name="close" size={24} color={editPictogramId === null ? Colors.purple : '#CCC'} accessibilityElementsHidden importantForAccessibility="no" />
                    <Text style={[s.pictoNingunoTxt, editPictogramId === null && { color: Colors.purple }]} accessibilityElementsHidden importantForAccessibility="no">
                      Ninguno
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* Hora */}
            <Text style={[s.pictoLabel, { marginTop: 16 }]}>Hora (opcional)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={editHora ?? ''}
                onChange={e => setEditHora(e.target.value || null)}
                style={{ padding: 10, fontSize: 15, borderRadius: 10, marginBottom: 8 }}
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
                  <Ionicons name="time-outline" size={18} color={Colors.purple} style={{ marginRight: 8 }} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text
                    style={[s.inputRow, { color: editHora ? '#333' : '#AAA', flex: 1, borderWidth: 0, paddingVertical: 12 }]}
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
                        <Text style={{ color: Colors.purple, fontWeight: '700', fontSize: 15 }}>Listo</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Botón guardar */}
            <Pressable
              onPress={guardar}
              style={[s.btnPrimary, !editTitulo.trim() && { opacity: 0.4 }]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={editTitulo.trim() ? `Guardar cambios en ${editTitulo}` : 'Escribe un título primero'}
            >
              <Text style={s.btnPrimaryText} accessibilityElementsHidden importantForAccessibility="no">
                Guardar cambios ✓
              </Text>
            </Pressable>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center' },
  modalBox:        { backgroundColor: Colors.purpleBg, borderRadius: 22, padding: 20, width: '90%' },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  topTitle:        { fontSize: 20, fontWeight: '600', color: Colors.purple, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'white', minHeight: 44 },
  pictoLabel:      { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  pictoOpcion:     { width: 80, height: 80, borderRadius: 14, borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 },
  pictoOpcionSelec:{ borderColor: Colors.purple, borderWidth: 3, backgroundColor: Colors.purpleBg },
  pictoImg:        { width: 68, height: 68, borderRadius: 10 },
  pictoNinguno:    { gap: 2 },
  pictoNingunoTxt: { fontSize: 10, color: '#CCC', fontWeight: '600' },
  btnPrimary:      { backgroundColor: Colors.purpleLt, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 16, minHeight: 44 },
  btnPrimaryText:  { fontSize: 20, color: Colors.purple, fontWeight: '600' },
});