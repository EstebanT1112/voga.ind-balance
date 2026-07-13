import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AppShell } from "./src/navigation/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme/liquid";

function Root() {
  const { bootstrapping, profile, session } = useAuth();
  const profileReady = session !== null && profile?.id === session.user.id;

  if (bootstrapping || (session !== null && !profileReady)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

  return profileReady ? <AppShell /> : <LoginScreen />;
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
