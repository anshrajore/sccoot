import { Slot } from "expo-router";
import { View } from "react-native";
import { Dock } from "../../src/components/Dock";
import { color } from "@scoot/design-system";

export default function AppShell() {
  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <Slot />
      <Dock />
    </View>
  );
}
