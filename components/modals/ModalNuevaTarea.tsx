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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuracionPicker } from '../../components/ui/DuracionPicker';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useBuscarPictogramasDebounced } from '../../hooks/useBuscarPictogramasDebounced';
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
  const insets = useSafeAreaInsets();
  const { height: alturaVentana } = useWindowDimensions();
  const [titulo,      setTitulo]      = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { pictogramas, setPictogramas, buscar: buscarPictosDebounced } = useBuscarPictogramasDebounced();
  const [pictogramId, setPictogramId] = useState<number | null>(null);
  const [repeticion,  setRepeticion]  = useState<'ninguna' | 'diaria' | 'semanal'>('ninguna');
  const [duracionSeg, setDuracionSeg] = useState<number | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [tempTime]                    = useState(fechaAppDate());

  const buscarImagen = (texto: string) => {
    const capitalizado = texto.length > 0
      ? texto.charAt(0).toUpperCase() + texto.slice(1)
      : texto;
    setTitulo(capitalizado);
    buscarPictosDebounced(capitalizado, (ids) => {
      setPictogramId(ids.length > 0 ? ids[0] : null);
    });
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
    setDuracionSeg(null);
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
      duracionSeg,
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
      <View style={[s.overlay, { paddingTop: insets.top + 20 }]}>
        <View style={[s.modalBox, { maxHeight: alturaVentana * 0.85 }]}>
          <LinearGradient
            colors={['#F7F2FA', '#EFE6F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={s.headerRow}>
              <View style={s.headerIcon}>
                <Ionicons name="add-circle" size={22} color={Colors.purple} />
              </View>
              <Text style={[s.headerTitle, { fontSize: fs(21) }]} accessibilityRole="header">
                Nueva tarea
              </Text>
              <Pressable
                onPress={cerrar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.purpleDk} />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView style={{ flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.body, { paddingBottom: 20 + insets.bottom }]}>

            {/* Título */}
            <View style={s.inputRow}>
              <TextInput
                placeholder="Escribe tu tarea..."
                placeholderTextColor="#B9AFC4"
                value={titulo}
                onChangeText={buscarImagen}
                style={{ flex: 1, paddingVertical: 14, fontSize: fs(17), fontFamily: AppFonts.body, color: '#3A3140' }}
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
              <View style={{ marginTop: 20 }}>
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

            {/* Duración con temporizador */}
            <View style={{ marginTop: 20 }}>
              <DuracionPicker valorSeg={duracionSeg} onChange={setDuracionSeg} />
            </View>

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
                <Ionicons name="checkmark-circle" size={22} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
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
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingRight: 8,
    backgroundColor: '#FBF9FC',
    borderWidth: 1.5,
    borderColor: Colors.purpleLt,
    minHeight: 54,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
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
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 16,
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
    marginTop: 24,
    minHeight: 44,
    shadowColor: Colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },
});
