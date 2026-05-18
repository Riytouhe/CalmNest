import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/ThemeContext";

const ACCENT = "#7C5CFC";

export default function TabLayout() {
  const { C } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="breathe"
        options={{
          title: "Breathe",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "cloud" : "cloud-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="meditate"
        options={{
          title: "Meditate",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "timer" : "timer-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="sleep" options={{ href: null }} />
      <Tabs.Screen
        name="water"
        options={{
          title: "Water",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "water" : "water-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: "Mood",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "happy" : "happy-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
