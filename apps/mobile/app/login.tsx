import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { s } from "../src/theme/styles";
import { useSession } from "../src/store/session";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const session = useSession();

  return (
    <View style={s.canvas}>
      <View style={s.sheet}>
        <Text style={s.title}>Scoot</Text>
        <Text style={s.subtitle}>Student mobility. Recurring commutes, not dispatched taxis.</Text>
        <TextInput
          style={s.input}
          placeholder="Mobile number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {sent ? (
          <TextInput style={s.input} placeholder="OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
        ) : null}
        <Pressable
          style={s.primaryBtn}
          onPress={() => {
            if (!sent) {
              setSent(true);
              return;
            }
            session.setPhone(phone);
            session.verify();
            router.replace("/verify");
          }}
        >
          <Text style={s.primaryText}>{sent ? "Verify session" : "Send OTP"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
