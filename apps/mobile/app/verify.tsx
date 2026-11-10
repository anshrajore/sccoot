import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { s } from "../src/theme/styles";
import { useSession } from "../src/store/session";

export default function Verify() {
  const router = useRouter();
  const attest = useSession((st) => st.attestAdult);
  return (
    <View style={s.canvas}>
      <View style={s.sheet}>
        <View style={s.chip}>
          <Text style={s.chipText}>AISHE • Pilot Institute of Technology Pune</Text>
        </View>
        <Text style={s.title}>Mobility passport</Text>
        <Text style={s.subtitle}>
          Live rides are adult-only in this pilot. Upload student ID for reviewer verification. Documents stay in a
          private bucket.
        </Text>
        <Pressable
          style={s.primaryBtn}
          onPress={() => {
            attest();
            router.replace("/(app)");
          }}
        >
          <Text style={s.primaryText}>I am 18+ and continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
