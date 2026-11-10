import { Redirect } from "expo-router";
import { useSession } from "../src/store/session";

export default function Index() {
  const verified = useSession((s) => s.verified);
  const adult = useSession((s) => s.adult);
  if (!verified) return <Redirect href="/login" />;
  if (!adult) return <Redirect href="/verify" />;
  return <Redirect href="/(app)" />;
}
