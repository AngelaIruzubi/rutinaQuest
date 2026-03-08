import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Pressable } from 'react-native';
import AvatarMini from '../../components/AvatarMini';
import { Colors } from '../../constants/theme';
import { AvatarProvider } from '../../context/AvatarContext';

export default function Layout() {

  const router = useRouter();


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
            fontSize: 30,
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
              <AvatarMini />
            </Pressable>
          ),
        }}
      />
    </AvatarProvider>
  );
}

