import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Varias pantallas necesitan asegurarse de que el permiso de notificaciones
// está pedido antes de programar avisos. Si cada una llama a
// requestPermissionsAsync() por su cuenta, en Android 13+ eso puede lanzar
// el diálogo nativo de permiso más de una vez casi a la vez — y si una
// segunda petición llega mientras la primera todavía se está resolviendo,
// Android puede bloquear el lanzamiento de esa actividad en segundo plano y
// forzar el cierre de la pantalla en primer plano (visto en logs reales:
// "Background activity launch blocked" + "Force remove immediately
// ActivityRecord ... state=RESUMED").
//
// Esta función cachea la promesa en curso para que, sin importar cuántas
// pantallas la llamen ni en qué orden, la petición nativa real solo se
// dispare una vez por sesión de la app.
let solicitudEnCurso: Promise<string> | null = null;

export function pedirPermisosNotificaciones(): Promise<string> {
  if (Platform.OS === "web") return Promise.resolve("granted");
  if (!solicitudEnCurso) {
    solicitudEnCurso = Notifications.requestPermissionsAsync()
      .then(({ status }) => status)
      .catch(() => "undetermined");
  }
  return solicitudEnCurso;
}
