import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
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
import { ahoraAppMs, fechaAppDate, hoyAppStr } from '../../utils/fecha';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModalNuevaTareaProps {
  visible:   boolean;
  onCerrar:  () => void;
  onGuardar: (tarea: Partial<Tarea> & { repeticion: string }) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalNuevaTarea({ visible, onCerrar, onGuardar }: ModalNuevaTareaProps) {
  const [titulo,      setTitulo]      = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [pictogramas, setPictogramas] = useState<number[]>([]);
  const [pictogramId, setPictogramId] = useState<number | null>(null);
  const [repeticion,  setRepeticion]  = useState<'ninguna' | 'diaria' | 'semanal'>('ninguna');
  const [showPicker,  setShowPicker]  = useState(false);
  const [tempTime]                    = useState(fechaAppDate());

  const buscarImagen = async (texto: string) => {
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
    if (date) setSelectedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const cerrar = () => {
    setTitulo('');
    setSelectedTime(null);
    setPictogramId(null);
    setPictogramas([]);
    setRepeticion('ninguna');
    setShowPicker(false);
    onCerrar();
  };

  const guardar = () => {
    if (!titulo.trim()) return;
    const newTask = {
      id:          `${hoyAppStr()}_${ahoraAppMs()}_${Math.random().toString(36).slice(2, 8)}`,
      title:       titulo,
      pictogramId: pictogramId ?? null,
      hora:        selectedTime ?? 'Sin hora',
      completed:   false,
      stars:       0,
      repeticion,
    };
    onGuardar(newTask);
    AccessibilityInfo.announceForAccessibility(`Tarea ${titulo} añadida`);
    cerrar();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cerrar}
      accessibilityViewIsModal
    >
      <View style={s.overlay}>
        <View style={s.modalBox}>
          <ScrollView keyboardShouldPersistTaps="handled">

            {/* Cabecera */}
            <View style={s.topBar}>
              <Pressable
                onPress={cerrar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={26} color={Colors.purple} />
              </Pressable>
              <Text style={s.topTitle} accessibilityRole="header">Nueva tarea</Text>
            </View>

            {/* Título */}
            <View style={s.inputRow}>
              <TextInput
                placeholder="Escribe tu tarea..."
                value={titulo}
                onChangeText={buscarImagen}
                style={{ flex: 1, paddingVertical: 10, fontSize: 16 }}
                accessibilityLabel="Título de la tarea"
                accessibilityHint="Escribe el nombre de la tarea. Se buscarán pictogramas automáticamente"
                returnKeyType="done"
                clearButtonMode="while-editing"
                autoFocus
              />
              <Pressable
                onPress={() => setShowPicker(true)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Seleccionar hora"
                accessibilityHint="Abre el selector de hora para esta tarea"
                style={{ padding: 8 }}
              >
                <Ionicons name="calendar-outline" size={22} color={Colors.purple} />
              </Pressable>
            </View>

            {/* Hora seleccionada */}
            <Text
              style={s.timeText}
              accessibilityLiveRegion="polite"
              accessibilityLabel={selectedTime ? `Hora seleccionada: ${selectedTime}` : 'Sin hora seleccionada'}
            >
              {selectedTime ? `Hora: ${selectedTime}` : 'Sin hora seleccionada'}
            </Text>

            {/* Selector de hora nativo */}
            {showPicker && Platform.OS !== 'web' && (
              <View>
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
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar hora"
                  >
                    <Text style={{ color: Colors.purple, fontWeight: '700', fontSize: 15 }}>Listo</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Selector de hora web */}
            {showPicker && Platform.OS === 'web' && (
              <input
                type="time"
                onChange={(e) => { setSelectedTime(e.target.value); setShowPicker(false); }}
                style={{ marginTop: 10, padding: 8, fontSize: 16 }}
              />
            )}

            {/* Selector de pictogramas */}
            {pictogramas.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={s.pictoLabel}>Elige un pictograma:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                >
                  {pictogramas.map((id, i) => (
                    <Pressable
                      key={id}
                      onPress={() => setPictogramId(id)}
                      style={[s.pictoOpcion, pictogramId === id && s.pictoOpcionSelec]}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Pictograma opción ${i + 1}`}
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
                    accessibilityLabel="Sin pictograma"
                    accessibilityState={{ selected: pictogramId === null }}
                  >
                    <Ionicons name="close" size={24} color={pictogramId === null ? Colors.purple : '#CCC'} />
                    <Text style={[s.pictoNingunoTxt, pictogramId === null && { color: Colors.purple }]}>
                      Ninguno
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* Botón guardar */}
            <Pressable
              onPress={guardar}
              style={s.btnPrimary}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Añadir tarea"
              accessibilityHint={titulo.trim() ? `Guardará la tarea ${titulo}` : 'Escribe un título primero'}
            >
              <Text style={s.btnPrimaryText}>Añadir ✓</Text>
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
  timeText:        { marginTop: 8, textAlign: 'center', color: '#888', fontSize: 13 },
  pictoLabel:      { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  pictoOpcion:     { width: 80, height: 80, borderRadius: 14, borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 },
  pictoOpcionSelec:{ borderColor: Colors.purple, borderWidth: 3, backgroundColor: Colors.purpleBg },
  pictoImg:        { width: 68, height: 68, borderRadius: 10 },
  pictoNinguno:    { gap: 2 },
  pictoNingunoTxt: { fontSize: 10, color: '#CCC', fontWeight: '600' },
  btnPrimary:      { backgroundColor: Colors.purpleLt, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 16, minHeight: 44 },
  btnPrimaryText:  { fontSize: 20, color: Colors.purple, fontWeight: '600' },
});