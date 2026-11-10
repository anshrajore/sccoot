import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { s } from "../../src/theme/styles";

export default function Requests() {
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.canvas, { paddingBottom: 120, gap: 16 }]}>
      <Text style={s.title}>Requests</Text>
      <View style={s.skyCard}>
        <Text style={s.cardTitle}>Aditi • Gate 3</Text>
        <Text>Pickup walk 180 m • same quote version</Text>
        <Pressable style={s.primaryBtn} onPress={() => undefined}>
          <Text style={s.primaryText}>Accept exact route + quote</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(true)}>
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Decline with a preset</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={s.sheet}>
          <Text>Seats full</Text>
          <Text>Detour too far</Text>
          <Text>Schedule mismatch</Text>
        </View>
      ) : null}
    </View>
  );
}
