import { Drawer } from 'expo-router/drawer';
import { Colors } from '../../constants/theme';




export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.primary,
        },
        headerLeftContainerStyle: {
        paddingLeft: 15,
        },
        headerTintColor: 'white',
        headerTitleAlign: 'center',
        headerTitle: 'RutinaQuest',
        headerTitleStyle: {
          fontSize: 36,         
          fontWeight: 'bold',  
        },
      }}
    />
  );
}

