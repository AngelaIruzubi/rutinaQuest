import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
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
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const [titulo,      setTitulo]      = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [pictogramas, setPictogramas] = useState<number[]>([]);
  const [pictogramId, setPictogramId] = useState<number | null>(null);
  const [repeticion,  setRepeticion]  = useState<'ninguna' | 'diaria' | 'semanal'>('ninguna');
  const [showPicker,  setShowPicker]  = useState(false);
  const [tempTime]                    = useState(fechaAppDate());

 const buscarImagen = (texto: string) => {
  const capitalizado = texto.length > 0
    ? texto.charAt(0).toUpperCase() + texto.slice(1)
    : texto;
  setTitulo(capitalizado);
  buscarPictogramasDebounced(capitalizado);
};

const buscarPictogramasDebounced = async (texto: string) => {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <LinearGradient
            colors={['#C9A9DB', Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <Text style={[s.headerTitle, { fontSize: fs(19) }]} accessibilityRole="header">
              Nueva tarea
            </Text>
            <Pressable
              onPress={cerrar}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={s.closeBtn}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>

            {/* Título */}
            <View style={s.inputRow}>
              <TextInput
                placeholder="Escribe tu tarea..."
                placeholderTextColor="#B9AFC4"
                value={titulo}
                onChangeText={buscarImagen}
                style={{ flex: 1, paddingVertical: 12, fontSize: fs(16), fontFamily: AppFonts.body, color: '#3A3140' }}
                accessibilityLabel="Título de la tarea"
                accessibilityHint="Escribe el nombre de la tarea. Se buscarán pictogramas automáticamente"
                returnKeyType="done"
                autoCapitalize="sentences"
                clearButtonMode="while-editing"
                autoFocus
              />
              <Pressable
                onPress={() => setShowPicker(true)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Seleccionar hora"
                accessibilityHint="Abre el selector de hora para esta tarea"
                style={s.iconBtn}
              >
                <Ionicons name="alarm-outline" size={20} color={Colors.purpleDk} />
              </Pressable>
            </View>

            {/* Hora seleccionada */}
            <View
              style={[s.timePill, selectedTime && s.timePillActivo]}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={selectedTime ? `Hora seleccionada: ${selectedTime}` : 'Sin hora seleccionada'}
            >
              <Ionicons name="time-outline" size={14} color={selectedTime ? Colors.purpleDk : '#A9A0B3'} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={[s.timeText, selectedTime && { color: Colors.purpleDk, fontFamily: AppFonts.bodyBold }]} accessibilityElementsHidden importantForAccessibility="no">
                {selectedTime ? `Hora: ${selectedTime}` : 'Sin hora seleccionada'}
              </Text>
            </View>

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
                    <Text style={{ color: Colors.purple, fontFamily: AppFonts.bodyBold, fontSize: 15 }}>Listo</Text>
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
              <View style={{ marginTop: 18 }}>
                <Text style={s.pictoLabel}>Elige un pictograma</Text>
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
                    <Ionicons name="close" size={22} color={pictogramId === null ? Colors.purple : '#CCC'} />
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
              accessible
              accessibilityRole="button"
              accessibilityLabel="Añadir tarea"
              accessibilityHint={titulo.trim() ? `Guardará la tarea ${titulo}` : 'Escribe un título primero'}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={['#C9A9DB', Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btnPrimary}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[s.btnPrimaryText, { fontSize: fs(18) }]}>Añadir tarea</Text>
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
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.purpleLt,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingRight: 8,
    backgroundColor: '#FBF9FC',
    minHeight: 48,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  timePillActivo: { backgroundColor: Colors.purpleBg },
  timeText:   { color: '#A9A0B3', fontSize: 13, fontFamily: AppFonts.body },

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
    marginTop: 22,
    minHeight: 44,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },
});
