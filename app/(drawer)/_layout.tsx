import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PixelRatio, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { AjustesProvider } from '../../context/AjustesContext';
import { AvatarProvider } from '../../context/AvatarContext';
import { initDB } from '../../database/database';

try {
  if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();
} catch {} 

// ─── INICIALIZACIÓN SÍNCRONA DE LA BD ────────────────────────────────────────
// Se ejecuta cuando el módulo se importa, ANTES de cualquier render.
// Así ninguna pantalla puede llamar a la BD antes de que esté lista.
try {
  initDB();
} catch (e) {
  console.warn('Error inicializando BD:', e);
}
// ─────────────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

const PURPLE = '#A77BBE';
const WHITE  = '#ffffff';

function DL({ icono, label, color = '#333' }: { icono: string; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icono as any} size={20} color={PURPLE} />
      <Text style={{ fontSize: 15, fontWeight: '600', color }} allowFontScaling={false}>{label}</Text>
    </View>
  );
}

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: -insets.top + 40 }}
    >
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

const LabelInicio       = () => <DL icono="home-outline"         label="Inicio"       />;
const LabelCalendario   = () => <DL icono="calendar-outline"     label="Calendario"   />;
const LabelTemporizador = () => <DL icono="timer-outline"        label="Temporizador" />;
const LabelProgreso     = () => <DL icono="bar-chart-outline"    label="Progreso"     />;
const LabelHistorial    = () => <DL icono="time-outline"         label="Historial"    />;
const LabelNormas       = () => <DL icono="document-text-outline" label="Normas"      />;

function HeaderPerfilBtn() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/perfil')}
      style={{ width: 46, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Mi perfil"
      accessibilityHint="Abre la pantalla de personalización del avatar"
    >
      <Ionicons name="person-circle-outline" size={32} color={WHITE} accessibilityElementsHidden importantForAccessibility="no" />
    </Pressable>
  );
}
const HeaderRight = () => <HeaderPerfilBtn />;

export default function Layout() {
  const { width } = useWindowDimensions();
  const fontScale   = PixelRatio.getFontScale();
  const clampedScale = Math.min(fontScale, 1.4);
  const titleSize   = Math.max(16, Math.min(30, (width * 0.072) / clampedScale));

  useEffect(() => {
    // La BD ya está lista; solo ocultamos la splash
    if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AjustesProvider>
      <AvatarProvider>
        <Drawer
          drawerContent={CustomDrawerContent}
          screenOptions={{
            headerStyle:                { backgroundColor: Colors.light.primary, shadowColor: 'transparent' },
            headerTintColor:            WHITE,
            headerTitleAlign:           'center',
            headerTitleStyle:           { fontSize: titleSize, fontWeight: 'bold' },
            headerTitleAllowFontScaling:  false,
            headerRight:                HeaderRight,
            drawerStyle:                { backgroundColor: '#fff' },
            drawerActiveTintColor:      PURPLE,
            drawerInactiveTintColor:    '#555',
            drawerActiveBackgroundColor: PURPLE + '15',
          }}
        >
          <Drawer.Screen name="index"        options={{ drawerLabel: LabelInicio,       headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="calendario"   options={{ drawerLabel: LabelCalendario,   headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="temporizador" options={{ drawerLabel: LabelTemporizador, headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="progreso"     options={{ drawerLabel: LabelProgreso,     headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="historial"    options={{ drawerLabel: LabelHistorial,    headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="perfil"       options={{ drawerItemStyle: { display: 'none' }, headerTitle: 'RutinaQuest' }} />
          <Drawer.Screen name="normas"       options={{ drawerLabel: LabelNormas,       headerTitle: 'RutinaQuest' }} />
        </Drawer>
      </AvatarProvider>
    </AjustesProvider>
  );
}