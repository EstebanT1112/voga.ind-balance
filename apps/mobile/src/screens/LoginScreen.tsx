import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LiquidCard } from "../components/Liquid";
import { useAuth } from "../auth/AuthProvider";
import { colors } from "../theme/liquid";

export function LoginScreen() {
  const { email, password, errorMessage, loading, setEmail, setPassword, signIn } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>voga.ind</Text>
        <Text style={styles.title}>Balance</Text>
        <Text style={styles.subtitle}>Gestion de ventas, cobros y stock</Text>
      </View>

      <LiquidCard style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="duena@example.com"
            placeholderTextColor="rgba(90,60,120,0.38)"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            editable={!loading}
            onChangeText={setPassword}
            placeholder="Tu password"
            placeholderTextColor="rgba(90,60,120,0.38)"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable disabled={loading} onPress={signIn} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </Pressable>
      </LiquidCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  header: {
    marginBottom: 24,
  },
  brand: {
    color: colors.violet,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  title: {
    color: colors.foreground,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 42,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    gap: 16,
    padding: 18,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 20,
    minHeight: 52,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  error: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "700",
  },
});
