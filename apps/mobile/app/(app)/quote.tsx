import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatInrPaise } from "@scoot/design-system";
import { s } from "../../src/theme/styles";
import { useSession } from "../../src/store/session";

export default function Quote() {
  const router = useRouter();
  const setTripStatus = useSession((st) => st.setTripStatus);
  return (
    <View style={s.canvas}>
      <View style={s.pinkCard}>
        <Text style={s.cardTitle}>Fair split</Text>
        <Text>Segment occupant's equal share, then legal cap.</Text>
        <Text style={s.fare}>{formatInrPaise(3333)}</Text>
        <Text style={s.subtitle}>No surge. No Scoot wallet. UPI is a later PSP adapter.</Text>
        <Pressable
          style={s.primaryBtn}
          onPress={() => {
            setTripStatus("confirmed");
            router.push("/trip");
          }}
        >
          <Text style={s.primaryText}>Confirm route + quote</Text>
        </Pressable>
      </View>
    </View>
  );
}
