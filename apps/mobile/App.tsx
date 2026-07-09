import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";

function LoginScreen() {
  const { email, password, errorMessage, loading, setEmail, setPassword, signIn } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>voga.ind</Text>
          <Text style={styles.title}>Balance</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              inputMode="email"
              onChangeText={setEmail}
              placeholder="duena@example.com"
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
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable disabled={loading} onPress={signIn} style={[styles.button, loading && styles.buttonDisabled]}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
          </Pressable>
        </View>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function HomeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>voga.ind</Text>
          <Text style={styles.title}>Hola, {profile?.fullName ?? "usuario"}</Text>
          <Text style={styles.subtitle}>Rol: {profile?.role ?? "-"}</Text>
        </View>

        <Pressable onPress={signOut} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cerrar sesion</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function Root() {
  const { bootstrapping, session } = useAuth();

  if (bootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return session ? <HomeScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7f4",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  header: {
    gap: 6,
    marginBottom: 32,
  },
  brand: {
    color: "#2f6f5e",
    fontSize: 18,
    fontWeight: "700",
  },
  title: {
    color: "#1d1a18",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#66736d",
    fontSize: 16,
  },
  form: {
    gap: 18,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#2b3430",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd8d2",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1d1a18",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#1d1a18",
    borderRadius: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#1d1a18",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1d1a18",
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: "#b42318",
    fontSize: 14,
  },
});
