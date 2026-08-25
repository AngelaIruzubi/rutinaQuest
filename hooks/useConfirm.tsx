import { useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { ModalConfirm } from "../components/modals/ModalConfirm";

type Opcion = { texto: string; valor: any; destructivo?: boolean };

/**
 * Diálogo de confirmación reutilizable: Alert.alert nativo en iOS/Android,
 * y un modal propio en web (Alert.alert no existe ahí). Se usa como:
 *
 *   const { mostrarConfirm, confirmModal } = useConfirm();
 *   const ok = await mostrarConfirm("Título", "Mensaje", [
 *     { texto: "Cancelar", valor: false },
 *     { texto: "Eliminar", valor: true, destructivo: true },
 *   ]);
 *
 * y renderizar `{confirmModal}` una vez en el árbol del componente.
 */
export function useConfirm() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<{
    titulo: string;
    mensaje: string;
    opciones: Opcion[];
  } | null>(null);
  const resolveRef = useRef<((val: any) => void) | null>(null);

  const mostrarConfirm = (
    titulo: string,
    mensaje: string,
    opciones: Opcion[],
  ) =>
    new Promise<any>((resolve) => {
      if (Platform.OS !== "web") {
        Alert.alert(
          titulo,
          mensaje,
          opciones.map((op) => ({
            text: op.texto,
            style: (op.destructivo
              ? "destructive"
              : op.valor === null
                ? "cancel"
                : "default") as any,
            onPress: () => resolve(op.valor),
          })),
          { cancelable: true, onDismiss: () => resolve(null) },
        );
      } else {
        resolveRef.current = resolve;
        setConfig({ titulo, mensaje, opciones });
        setVisible(true);
      }
    });

  const confirmModal =
    visible && config ? (
      <ModalConfirm
        visible={visible}
        titulo={config.titulo}
        mensaje={config.mensaje}
        opciones={config.opciones}
        onOpcion={(valor) => {
          setVisible(false);
          resolveRef.current?.(valor);
        }}
      />
    ) : null;

  return { mostrarConfirm, confirmModal };
}
