import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { color, formatInrPaise } from "@scoot/design-system";
import { s } from "../../src/theme/styles";
import { useSession } from "../../src/store/session";

const days = [
  { d: "Mon", n: "10", on: true },
  { d: "Tue", n: "11", on: false },
  { d: "Wed", n: "12", on: false },
  { d: "Thu", n: "13", on: false },
  { d: "Fri", n: "14", on: false },
];

export default function Dashboard() {
  const router = useRouter();
  const session = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}>
        <Text style={s.subtitle}>Good morning</Text>
        <Text style={s.title}>Hello, student</Text>
        <View style={s.chip}>
          <Text style={s.chipText}>{session.institution} • Verified campus</Text>
        </View>
        <View style={{ flexDirection: "row", backgroundColor: color.surfaceSubtle, borderRadius: 999, padding: 6, gap: 6 }}>
          {days.map((day) => (
            <View
              key={day.d}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: day.on ? color.ink : "transparent",
              }}
            >
              <Text style={{ color: day.on ? "#fff" : color.inkSecondary, fontSize: 11 }}>{day.d}</Text>
              <Text style={{ color: day.on ? "#fff" : color.ink, fontWeight: "700" }}>{day.n}</Text>
            </View>
          ))}
        </View>
        <View style={s.skyCard}>
          <Text style={s.cardTitle}>Your plan</Text>
          <Text>
            {session.pickup} → {session.campus}
          </Text>
          <Text>08:15–08:45 • private carpool corridor</Text>
        </View>
        <View style={s.ochreCard}>
          <Text style={s.cardTitle}>Suggested match</Text>
          <Text>Driver-owned Baner → Gate 3 • 2 seats</Text>
          <Text style={s.fare}>{formatInrPaise(session.quotePaise)} permitted</Text>
          <Text>Walk 180 m • detour 4 min • no surge</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.push("/matches")}>
            <Text style={s.primaryText}>Review matches</Text>
          </Pressable>
        </View>
        <View style={s.pinkCard}>
          <Text style={s.cardTitle}>Fair split preview</Text>
          <Text>Segment occupancy, then Maharashtra cap version. Raw and permitted stay separate.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
