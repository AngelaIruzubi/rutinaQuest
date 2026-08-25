import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';
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
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalDetalleTarea({
  visible, tarea, onCerrar, onCompletar, onEditar, onEliminar,
}: ModalDetalleTareaProps) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      accessibilityViewIsModal
    >
      <Pressable style={s.overlay} onPress={onCerrar} accessible={false}>
        <Pressable
          style={[s.modalBox, { maxHeight: '85%' }]}
          onPress={e => e.stopPropagation()}
          accessible={false}
          importantForAccessibility="yes"
        >
          <LinearGradient
            colors={['#C9A9DB', Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <Text style={[s.headerTitle, { fontSize: fs(19) }]} accessibilityRole="header" numberOfLines={1}>
              {tarea?.title}
            </Text>
            <Pressable
              onPress={onCerrar}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle de tarea"
              style={s.closeBtn}
            >
              <Ionicons name="close" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
            </Pressable>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.body}
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
                  <Ionicons name="checkmark-circle" size={20} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
                  <Text style={[s.btnPrimaryText, { fontSize: fs(17) }]} accessibilityElementsHidden importantForAccessibility="no">
                    Realizada
                  </Text>
                </LinearGradient>
              </Pressable>

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
  overlay:  { flex: 1, backgroundColor: 'rgba(46,32,58,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 28, width: '90%', overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  headerTitle: { flex: 1, fontFamily: AppFonts.displayBold, color: '#fff' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { alignItems: 'center', padding: 20, paddingTop: 22 },

  picto:      { width: 150, height: 150, marginBottom: 16, borderRadius: 16 },
  pictoEmpty: { width: 150, height: 150, marginBottom: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.purpleBg, borderRadius: 16 },

  horaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.purpleBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  hora: { color: Colors.purpleDk, fontSize: 16, fontFamily: AppFonts.bodyBold },

  doneBox:  { alignItems: 'center', paddingVertical: 12, width: '100%' },
  doneText: { color: Colors.green, fontFamily: AppFonts.bodyBold, marginTop: 10 },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    minHeight: 44,
  },
  btnPrimaryText: { color: '#fff', fontFamily: AppFonts.displayBold },

  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 44,
  },
  btnSecundarioText: { fontFamily: AppFonts.bodyBold },
});
