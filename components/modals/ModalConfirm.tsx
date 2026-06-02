import { Modal, Pressable, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

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
  return (
    <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>{titulo}</Text>
          <Text style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 }}>{mensaje}</Text>
          <View style={{ gap: 10 }}>
            {opciones.map((op, i) => (
              <Pressable
                key={i}
                onPress={() => onOpcion(op.valor)}
                style={{
                  paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                  backgroundColor: op.destructivo ? '#FDE8E8' : op.valor === null ? '#f5f5f5' : Colors.purpleBg,
                  borderWidth: 1,
                  borderColor: op.destructivo ? '#E4A0A0' : op.valor === null ? '#ddd' : Colors.purpleLt,
                }}
                accessible accessibilityRole="button" accessibilityLabel={op.texto}
              >
                <Text style={{ fontWeight: '700', fontSize: 15, color: op.destructivo ? Colors.red : op.valor === null ? '#888' : Colors.purple }}>
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