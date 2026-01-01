import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStateProvider, DiscoveryProvider } from "@/contexts/AppStateContext";
import { PerformerProvider } from "@/contexts/PerformerContext";
import { SocialProvider } from "@/contexts/SocialContext";
import { FeedProvider } from "@/contexts/FeedContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { GlowProvider, useGlow } from "@/contexts/GlowContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { GlowOverlay } = useGlow();
  
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="management" options={{ headerShown: false }} />
      </Stack>
      <GlowOverlay />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppStateProvider>
          <GlowProvider>
            <ToastProvider>
              <SocialProvider>
                <FeedProvider>
                  <DiscoveryProvider>
                    <PerformerProvider>
                      <RootLayoutNav />
                    </PerformerProvider>
                  </DiscoveryProvider>
                </FeedProvider>
              </SocialProvider>
            </ToastProvider>
          </GlowProvider>
        </AppStateProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
