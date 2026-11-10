import { Pressable, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { s } from "../theme/styles";

const items = [
  { href: "/(app)", label: "Home" },
  { href: "/(app)/matches", label: "Match" },
  { href: "/(app)/passport", label: "Passport" },
  { href: "/(app)/driver", label: "Drive" },
];

export function Dock() {
  const router = useRouter();
  const path = usePathname();
  return (
    <View style={s.dock}>
      {items.map((item) => {
        const active = path === item.href || (item.href === "/" && path === "/index");
        return (
          <Pressable key={item.href} onPress={() => router.push(item.href as never)}>
            <Text style={active ? s.dockActive : s.dockItem}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
