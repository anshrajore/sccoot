import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatInrPaise } from "@scoot/design-system";
import { s } from "../../src/theme/styles";
import { useSession } from "../../src/store/session";

export default function Matches() {
  const router = useRouter();
  const setTripStatus = useSession((st) => st.setTripStatus);
  const quote = useSession((st) => st.quotePaise);
  return (
    <View style={[s.canvas, { paddingBottom: 120, gap: 16 }]}>
      <Text style={s.title}>Matches</Text>
      <Text style={s.subtitle}>Private cars only. Driver origin and destination stay on the published journey.</Text>
      <View style={s.ochreCard}>
        <Text style={s.cardTitle}>Baner → Gate 3</Text>
        <Text>Walk 180 m • detour 4 min • 1 seat</Text>
        <Text style={s.fare}>{formatInrPaise(quote)}</Text>
        <Text style={s.subtitle}>Raw allocation equals permitted under current MH cap version.</Text>
        <Pressable
          style={s.primaryBtn}
          onPress={() => {
            setTripStatus("held");
            router.push("/quote");
          }}
        >
          <Text style={s.primaryText}>Request seat</Text>
        </Pressable>
      </View>
    </View>
  );
}
