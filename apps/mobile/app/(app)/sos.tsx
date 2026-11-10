import { Text, View } from "react-native";
import { s } from "../../src/theme/styles";

export default function Sos() {
  return (
    <View style={s.canvas}>
      <View style={s.sheet}>
        <Text style={s.title}>Safety</Text>
        <Text style={s.subtitle}>
          SOS notifies assigned operations reviewers. Live-audio is not part of P0. Emergency contact and incident case
          are persisted.
        </Text>
        <Text>Assigned reviewer SLA: acknowledge, locate last-seen, escalate.</Text>
      </View>
    </View>
  );
}
