import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#6366F1",
        headerTitleStyle: { fontWeight: "600", fontSize: 17, color: "#0F172A" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="analysis"
        options={{
          title: "Results",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="history"
        options={{ title: "History" }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: "About",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
