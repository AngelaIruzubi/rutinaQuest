import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';
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
          style={[s.modalBox, { alignItems: 'center' }]}
          onPress={e => e.stopPropagation()}
          accessible={false}
          importantForAccessibility="yes"
        >
          {/* Botón cerrar */}
          <Pressable
            onPress={onCerrar}
            style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle de tarea"
          >
            <Ionicons name="close" size={26} color={Colors.purple} accessibilityElementsHidden importantForAccessibility="no" />
          </Pressable>

          {/* Título */}
          <View style={[s.topBar, { justifyContent: 'center' }]} accessible={false}>
            <Text style={s.topTitle} accessibilityRole="header">{tarea?.title}</Text>
          </View>

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
              <Ionicons name="document-outline" size={60} color="#CCC" accessibilityElementsHidden importantForAccessibility="no" />
            </View>
          )}

          {/* Hora */}
          <View
            style={{ marginBottom: 12, padding: 8 }}
            accessible
            accessibilityLabel={tarea?.hora && tarea.hora !== 'Sin hora' ? `Hora: ${tarea.hora}` : 'Sin hora asignada'}
          >
            <Text style={s.hora} accessibilityElementsHidden importantForAccessibility="no">
              🕐 {tarea?.hora ?? 'Sin hora'}
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
              <Text style={{ color: Colors.green, fontWeight: '700', marginTop: 8, fontSize: 15 }} accessibilityElementsHidden importantForAccessibility="no">
                ¡Tarea completada!
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%', gap: 8 }} accessible={false}>
              <Pressable
                onPress={() => {
                  if (tarea) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onCompletar(tarea);
                  }
                }}
                style={s.btnPrimary}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Marcar como realizada la tarea ${tarea?.title}`}
                accessibilityHint="Marca la tarea como completada y suma estrellas"
              >
                <Text style={s.btnPrimaryText} accessibilityElementsHidden importantForAccessibility="no">Realizada ✓</Text>
              </Pressable>

              <Pressable
                onPress={onEditar}
                style={[s.btnPrimary, { backgroundColor: '#E8F4FD' }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Editar la tarea ${tarea?.title}`}
                accessibilityHint="Cambia el nombre o el pictograma de la tarea"
              >
                <Text style={[s.btnPrimaryText, { color: '#2980B9' }]} accessibilityElementsHidden importantForAccessibility="no">
                  Editar tarea
                  <Ionicons name="pencil" size={16} color="#2980B9" style={{ marginLeft: 6 }} accessibilityElementsHidden importantForAccessibility="no" />
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (tarea) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onEliminar(tarea);
                  }
                }}
                style={[s.btnPrimary, { backgroundColor: '#FDE8E8' }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Eliminar la tarea ${tarea?.title}`}
                accessibilityHint="Elimina la tarea y la mueve al historial como cancelada"
              >
                <Text style={[s.btnPrimaryText, { color: Colors.red }]} accessibilityElementsHidden importantForAccessibility="no">
                  Eliminar tarea ✕
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center' },
  modalBox:   { backgroundColor: Colors.purpleBg, borderRadius: 22, padding: 20, width: '90%' },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  topTitle:   { fontSize: 20, fontWeight: '600', color: Colors.purple, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  picto:      { width: 160, height: 160, marginVertical: 16, borderRadius: 12 },
  pictoEmpty: { width: 160, height: 160, marginVertical: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 12 },
  hora:       { color: '#888', fontSize: 20 },
  doneBox:    { alignItems: 'center', paddingVertical: 16, width: '100%' },
  btnPrimary: { backgroundColor: Colors.purpleLt, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 16, minHeight: 44 },
  btnPrimaryText: { fontSize: 20, color: Colors.purple, fontWeight: '600' },
});