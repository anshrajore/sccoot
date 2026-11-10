import { Text, View } from "react-native";
import { formatInrPaise } from "@scoot/design-system";
import { s } from "../../src/theme/styles";

export default function Receipt() {
  return (
    <View style={s.canvas}>
      <View style={s.sheet}>
        <Text style={s.title}>Trip receipt</Text>
        <Text>Permitted contribution {formatInrPaise(3333)}</Text>
        <Text style={s.subtitle}>Payment status comes from a signed PSP event in P1, not this screen.</Text>
        <Text>Rate your peer • report if needed</Text>
      </View>
    </View>
  );
}
