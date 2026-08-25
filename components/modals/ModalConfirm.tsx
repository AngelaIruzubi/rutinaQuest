import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable, Text, View } from 'react-native';
import { AppFonts, Colors } from '../../constants/theme';
import { useAjustesCtx } from '../../context/AjustesContext';

interface Opcion {
  texto:       string;
  valor:       any;
  destructivo?: boolean;
}

interface ModalConfirmProps {
  visible: boolean;
  titulo:  string;
  mensaje: string;
  opciones: Opcion[];
  onOpcion: (valor: any) => void;
}

export function ModalConfirm({ visible, titulo, mensaje, opciones, onOpcion }: ModalConfirmProps) {
  const { escala } = useAjustesCtx();
  const fs = (n: number) => Math.round(n * escala);
  return (
    <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(46,32,58,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 26, width: '100%', maxWidth: 340,
            shadowColor: Colors.purpleDk, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.purpleBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Ionicons name="help-circle" size={26} color={Colors.purple} />
          </View>
          <Text style={{ fontSize: fs(19), fontFamily: AppFonts.displayExtraBold, color: '#3A3140', marginBottom: 8 }}>{titulo}</Text>
          <Text style={{ fontSize: fs(15), color: '#786F82', fontFamily: AppFonts.body, marginBottom: 24, lineHeight: 22 }}>{mensaje}</Text>
          <View style={{ gap: 10 }}>
            {opciones.map((op, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (op.destructivo) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  onOpcion(op.valor);
                }}
                style={{
                  paddingVertical: 14, borderRadius: 999, alignItems: 'center',
                  backgroundColor: op.destructivo ? '#FDE8E8' : op.valor === null ? '#F5F3F6' : Colors.purpleBg,
                  borderWidth: 1.5,
                  borderColor: op.destructivo ? '#F5C6C6' : op.valor === null ? '#E5E0E8' : Colors.purpleLt,
                  minHeight: 44, justifyContent: 'center',
                }}
                accessible accessibilityRole="button" accessibilityLabel={op.texto}
              >
                <Text style={{ fontFamily: AppFonts.bodyBold, fontSize: fs(15), color: op.destructivo ? Colors.red : op.valor === null ? '#8A8092' : Colors.purpleDk }}>
                  {op.texto}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
