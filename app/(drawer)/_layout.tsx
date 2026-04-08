import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { Colors } from '../../constants/theme';
import { AvatarProvider } from '../../context/AvatarContext';
import { initDB, limpiarTareasViejas } from '../../database/database';

// Evita que la splash desaparezca sola antes de que estemos listos
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const WHITE  = '#ffffff';
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        // Inicializa la base de datos antes de mostrar la app
        initDB();
        limpiarTareasViejas();
      } catch (e) {
        console.warn('Error en carga inicial:', e);
      } finally {
        // Siempre oculta la splash al terminar (aunque haya error)
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  return (
    <AvatarProvider>
      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
          headerTitle: 'RutinaQuest',
          headerTitleStyle: {
            fontSize: 34,
            fontWeight: 'bold',
          },
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/perfil')}
              style={{
                width: 50,
                height: 40,
                overflow: 'hidden',
              }}
            >
              {/* <AvatarMini /> */}
              <Ionicons name="person-outline" size={35} color={WHITE} />
            </Pressable>
          ),
        }}
      >
        <Drawer.Screen
          name="testing"
          options={{
            drawerLabel: '🧪 Testing',
            drawerItemStyle: { display: __DEV__ ? 'flex' : 'none' },
            headerTitle: '🧪 Testing Gamificación',
          }}
        />
      </Drawer>
    </AvatarProvider>
  );
}