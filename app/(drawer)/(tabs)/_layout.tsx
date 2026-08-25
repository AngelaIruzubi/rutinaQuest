import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { AppFonts, Colors } from "../../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // el header ya lo pone el Drawer padre
        tabBarActiveTintColor: Colors.purpleDk,
        tabBarInactiveTintColor: "#B3ABBB",
        tabBarLabelStyle: {
          fontFamily: AppFonts.displayBold,
          fontSize: 10.5,
        },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: Colors.purpleLt,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarItemStyle: { minHeight: 44 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: "Calendario",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: "Progreso",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "star" : "star-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="temporizador"
        options={{
          title: "Temporizador",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "timer" : "timer-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
