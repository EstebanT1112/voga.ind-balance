function requireEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: requireEnv("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  apiUrl: requireEnv("EXPO_PUBLIC_API_URL").replace(/\/$/, ""),
};
