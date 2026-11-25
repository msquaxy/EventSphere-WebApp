import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { AuthProvider } from "@/context/AuthContext";
import { colors, fonts } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, fontError]);

  if (!loaded && !fontError) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: 17 },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in", presentation: "modal" }} />
        <Stack.Screen name="register" options={{ title: "Create account", presentation: "modal" }} />
        <Stack.Screen name="event/[id]" options={{ title: "Event" }} />
        <Stack.Screen name="checkout/[orderId]" options={{ title: "Your booking" }} />
        <Stack.Screen name="studio/edit" options={{ title: "Event" }} />
        <Stack.Screen name="studio/check-in/[id]" options={{ title: "Guest check-in" }} />
      </Stack>
    </AuthProvider>
  );
}
