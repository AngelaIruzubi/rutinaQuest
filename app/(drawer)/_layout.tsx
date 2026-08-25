import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible";
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Bienvenida } from "../../components/Bienvenida";
import { Colors } from "../../constants/theme";
import { AjustesProvider } from "../../context/AjustesContext";
import { AvatarProvider } from "../../context/AvatarContext";
import { DBReadyContext } from "../../context/Dbreadycontext";
import { initDB } from "../../database/database";

const CLAVE_BIENVENIDA_VISTA = "rutinaquest_bienvenida_vista";

Sentry.init({
  dsn: "https://7d8296b71552a8579eb246c9fe060bd0@o4511767324393472.ingest.de.sentry.io/4511767331536976",
  tracesSampleRate: 1.0,
  environment: __DEV__ ? "development" : "production",
});

try {
  if (Platform.OS !== "web") SplashScreen.preventAutoHideAsync();
} catch {}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    // TEMPORAL: mientras se ajusta el diseño de la bienvenida, se muestra
    // siempre (sin guardar el flag en AsyncStorage) para poder verla en
    // cada recarga. Volver a activar la persistencia cuando esté cerrada:
    // const vista = await AsyncStorage.getItem(CLAVE_BIENVENIDA_VISTA);
    // setMostrarBienvenida(vista !== "true");
    setMostrarBienvenida(true);
  }, []);

  const handleEmpezar = () => {
    setMostrarBienvenida(false);
  };

  // initDB() ya no hace nada real (los datos se guardan con AsyncStorage,
  // sin migraciones que ejecutar), pero se mantiene la señal dbReady porque
  // varias pantallas todavía la usan para saber cuándo pueden cargar datos.
  useEffect(() => {
    (async () => {
      try {
        await initDB();
      } catch (e) {
        console.warn("Error inicializando BD:", e);
      }
      setDbReady(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // Pedir permisos de notificación
      if (Platform.OS !== "web") {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log("[NOTIF] Permiso:", status);

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#A77BBE",
            sound: "default",
          });
        }
      }
      // Solo se oculta el splash una vez las fuentes están listas (o han
      // fallado) y ya sabemos si hay que mostrar la bienvenida — si no,
      // habría un parpadeo con texto sin la tipografía definitiva, o un
      // flash de la app antes de la bienvenida.
      if ((fontsLoaded || fontError) && mostrarBienvenida !== null) {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, [fontsLoaded, fontError, mostrarBienvenida]);

  if ((!fontsLoaded && !fontError) || mostrarBienvenida === null) return null;

  if (mostrarBienvenida) {
    return <Bienvenida onEmpezar={handleEmpezar} />;
  }

  return (
    <DBReadyContext.Provider value={dbReady}>
      <AjustesProvider>
        <AvatarProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: "#FBF6F0",
              },
              headerTintColor: Colors.purpleDk,
              headerTitle: () => null,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
            <Stack.Screen name="normas" options={{ headerShown: false }} />
          </Stack>
        </AvatarProvider>
      </AjustesProvider>
    </DBReadyContext.Provider>
  );
}
