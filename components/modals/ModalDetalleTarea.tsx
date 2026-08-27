import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
import { useTemporizadorTarea } from '../../context/TemporizadorContext';
import { Tarea } from '../../types/tarea';
import { StarRow } from '../ui/StarRow';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModalDetalleTareaProps {
  visible:     boolean;
  tarea:       Tarea | null;
  onCerrar:    () => void;
  onCompletar: (tarea: Tarea) => void;
  onEditar:    () => void;
  onEliminar:  (tarea: Tarea) => void;
  onIniciarTemporizador?: (tarea: Tarea) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalDetalleTarea({
  visible, tarea, onCerrar, onCompletar, onEditar, onEliminar, onIniciarTemporizador,
}: ModalDetalleTareaProps) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  const insets = useSafeAreaInsets();
  const { height: alturaVentana } = useWindowDimensions();
  // El campo tarea.tiempoCumplido viene de la lista de tareas cargada de la
  // base de datos, que puede tardar en refrescarse. El temporizador en sí
  // vive en un contexto global independiente de esa recarga, así que se
  // consulta también en directo aquí para no depender de que la lista se
  // haya actualizado a tiempo.
  const { activo: timerActivo } = useTemporizadorTarea();
  const temporizadorTerminadoEnVivo =
    !!tarea && timerActivo?.tareaId === tarea.id && timerActivo.estado === 'finished';
  const tiempoBloqueado =
    !!tarea?.duracionSeg && !tarea?.tiempoCumplido && !temporizadorTerminadoEnVivo;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      accessibilityViewIsModal
    >
      <Pressable style={[s.overlay, { paddingTop: insets.top + 20 }]} onPress={onCerrar} accessible={false}>
        <Pressable
          style={[s.modalBox, { maxHeight: alturaVentana * 0.8 }]}
          onPress={e => e.stopPropagation()}
          accessible={false}
          importantForAccessibility="yes"
        >
          <LinearGradient
            colors={['#F7F2FA', '#EFE6F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={s.headerRow}>
              <Text style={[s.headerTitle, { fontSize: fs(21) }]} accessibilityRole="header" numberOfLines={1}>
                {tarea?.title}
              </Text>
              <Pressable
                onPress={onCerrar}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle de tarea"
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.purpleDk} accessibilityElementsHidden importantForAccessibility="no" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView
            style={{ flexShrink: 1, minHeight: 0 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.body, { paddingBottom: 22 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >

          {/* Pictograma */}
          {tarea?.pictogramId ? (
            <Image
              source={{ uri: `https://static.arasaac.org/pictograms/${tarea.pictogramId}/${tarea.pictogramId}_300.png` }}
              style={s.picto}
              accessibilityLabel={`Pictograma de ${tarea.title}`}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={s.pictoEmpty} accessibilityElementsHidden importantForAccessibility="no">
              <Ionicons name="document-outline" size={56} color="#C7BED1" accessibilityElementsHidden importantForAccessibility="no" />
            </View>
          )}

          {/* Hora */}
          <View
            style={s.horaPill}
            accessible
            accessibilityLabel={tarea?.hora && tarea.hora !== 'Sin hora' ? `Hora: ${tarea.hora}` : 'Sin hora asignada'}
          >
            <Ionicons name="time-outline" size={15} color={Colors.purpleDk} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={s.hora} accessibilityElementsHidden importantForAccessibility="no">
              {tarea?.hora ?? 'Sin hora'}
            </Text>
          </View>

          {/* Botones o estado completada */}
          {tarea?.completed ? (
            <View
              style={s.doneBox}
              accessible
              accessibilityLabel={`Tarea completada con ${tarea.stars ?? 5} de 5 estrellas`}
            >
              <StarRow count={tarea.stars ?? 5} size={30} />
              <Text style={[s.doneText, { fontSize: fs(15) }]} accessibilityElementsHidden importantForAccessibility="no">
                ¡Tarea completada!
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%', gap: 10, marginTop: 6 }} accessible={false}>
              {tiempoBloqueado ? (
                <>
                  <View
                    style={s.bloqueadoBox}
                    accessible
                    accessibilityLabel={`Tarea con temporizador de ${Math.round((tarea?.duracionSeg ?? 0) / 60)} minutos. No se puede marcar como realizada hasta que termine`}
                  >
                    <Ionicons name="time-outline" size={16} color={Colors.purpleDk} accessibilityElementsHidden importantForAccessibility="no" />
                    <Text style={s.bloqueadoTexto} accessibilityElementsHidden importantForAccessibility="no">
                      No se puede marcar como realizada hasta que termine el temporizador
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => tarea && onIniciarTemporizador?.(tarea)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Iniciar temporizador de ${Math.round((tarea?.duracionSeg ?? 0) / 60)} minutos`}
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <LinearGradient
                      colors={['#C9A9DB', Colors.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={s.btnPrimary}
                    >
                      <Ionicons name="play" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
                      <Text style={[s.btnPrimaryText, { fontSize: fs(17) }]} accessibilityElementsHidden importantForAccessibility="no">
                        Iniciar temporizador
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    if (tarea) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onCompletar(tarea);
                    }
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar como realizada la tarea ${tarea?.title}`}
                  accessibilityHint="Marca la tarea como completada y suma estrellas"
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <LinearGradient
                    colors={['#C9A9DB', Colors.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btnPrimary}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
                    <Text style={[s.btnPrimaryText, { fontSize: fs(17) }]} accessibilityElementsHidden importantForAccessibility="no">
                      Realizada
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}

              <Pressable
                onPress={onEditar}
                style={[s.btnSecundario, { backgroundColor: '#E8F4FD', borderColor: '#CBE6F7' }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Editar la tarea ${tarea?.title}`}
                accessibilityHint="Cambia el nombre o el pictograma de la tarea"
              >
                <Ionicons name="pencil" size={17} color="#2980B9" accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[s.btnSecundarioText, { color: '#2980B9', fontSize: fs(16) }]} accessibilityElementsHidden importantForAccessibility="no">
                  Editar tarea
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (tarea) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onEliminar(tarea);
                  }
                }}
                style={[s.btnSecundario, { backgroundColor: '#FDE8E8', borderColor: '#F5C6C6' }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Eliminar la tarea ${tarea?.title}`}
                accessibilityHint="Elimina la tarea y la mueve al historial como cancelada"
              >
                <Ionicons name="trash-outline" size={17} color={Colors.red} accessibilityElementsHidden importantForAccessibility="no" />
                <Text style={[s.btnSecundarioText, { color: Colors.red, fontSize: fs(16) }]} accessibilityElementsHidden importantForAccessibility="no">
                  Eliminar tarea
                </Text>
              </Pressable>
            </View>
          )}
          </ScrollView>
        </Pressable>
      </Pressable>
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
  headerTitle: { flex: 1, fontFamily: AppFonts.displayExtraBold, color: '#5F4479' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { alignItems: 'center', padding: 20, paddingTop: 22 },

  picto:      { width: 150, height: 150, marginBottom: 18, borderRadius: 20 },
  pictoEmpty: { width: 150, height: 150, marginBottom: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.purpleBg, borderRadius: 20 },

  horaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.purpleBg,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  hora: { color: Colors.purpleDk, fontSize: 16, fontFamily: AppFonts.bodyBold },

  doneBox:  { alignItems: 'center', paddingVertical: 12, width: '100%' },
  doneText: { color: Colors.green, fontFamily: AppFonts.bodyBold, marginTop: 10 },

  bloqueadoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.purpleBg,
    borderRadius: 14,
    padding: 12,
  },
  bloqueadoTexto: { flex: 1, fontSize: 12.5, fontFamily: AppFonts.body, color: Colors.purpleDk, lineHeight: 17 },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 999,
    minHeight: 44,
    shadowColor: Colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },

  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 44,
  },
  btnSecundarioText: { fontFamily: AppFonts.bodyBold },
});
