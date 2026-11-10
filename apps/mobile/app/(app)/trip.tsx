import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { s } from "../../src/theme/styles";
import { useSession } from "../../src/store/session";

export default function Trip() {
  const router = useRouter();
  const session = useSession();
  const stale = session.lastSeenAt
    ? Date.now() - Date.parse(session.lastSeenAt) > 15_000
    : true;
  return (
    <View style={s.canvas}>
      <View style={s.sheet}>
        <Text style={s.title}>Live commute</Text>
        <Text style={s.subtitle}>
          {stale ? "Location stale — last seen shown, not live." : `Last seen ${session.lastSeenAt}`}
        </Text>
        <Pressable style={s.primaryBtn} onPress={() => session.setTripStatus("active")}>
          <Text style={s.primaryText}>Verify pickup OTP</Text>
        </Pressable>
        <Pressable style={[s.primaryBtn, { backgroundColor: "#BA1A1A" }]} onPress={() => router.push("/sos")}>
          <Text style={s.primaryText}>SOS / report</Text>
        </Pressable>
        <Pressable
          style={s.primaryBtn}
          onPress={() => {
            session.setTripStatus("complete");
            router.push("/receipt");
          }}
        >
          <Text style={s.primaryText}>Verify drop-off</Text>
        </Pressable>
      </View>
    </View>
  );
}
