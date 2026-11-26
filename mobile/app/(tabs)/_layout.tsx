import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/lib/theme";

type TabIcon = React.ComponentProps<typeof Ionicons>["name"];

const icon = (focused: TabIcon, idle: TabIcon) =>
  function TabBarIcon({ color, focused: isFocused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={isFocused ? focused : idle} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  const { isOrganizer } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#8a948d",
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Discover", tabBarIcon: icon("compass", "compass-outline") }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: icon("heart", "heart-outline") }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets", tabBarIcon: icon("ticket", "ticket-outline") }} />
      <Tabs.Screen
        name="studio"
        options={{
          title: "Studio",
          href: isOrganizer ? undefined : null,
          tabBarIcon: icon("calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-circle", "person-circle-outline") }} />
    </Tabs>
  );
}
