import { Stack } from "expo-router";

export default function ProtectedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    >
      <Stack.Screen name="(home)" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
