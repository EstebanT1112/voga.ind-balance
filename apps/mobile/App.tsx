import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AppShell } from "./src/navigation/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme/liquid";

function Root() {
  const { bootstrapping, session } = useAuth();

  if (bootstrapping) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

  return session ? <AppShell /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
