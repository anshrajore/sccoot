import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { s } from "../../src/theme/styles";

export default function Driver() {
  const router = useRouter();
  return (
    <View style={[s.canvas, { paddingBottom: 120, gap: 16 }]}>
      <Text style={s.title}>Offer a ride</Text>
      <Text style={s.subtitle}>Publish a journey you already plan to drive. Passengers cannot redefine origin or destination.</Text>
      <View style={s.sheet}>
        <Text>Origin: Baner</Text>
        <Text>Destination: Hinjawadi Gate 3</Text>
        <Text>Seats: 2 • max detour 8 min • private non-transport car</Text>
      </View>
      <Pressable style={s.primaryBtn} onPress={() => router.push("/requests")}>
        <Text style={s.primaryText}>Review rider requests</Text>
      </Pressable>
    </View>
  );
}
