function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function assertPublicEnv(): void {
  required("EXPO_PUBLIC_SUPABASE_URL");
  required("EXPO_PUBLIC_SUPABASE_ANON_KEY");
}
