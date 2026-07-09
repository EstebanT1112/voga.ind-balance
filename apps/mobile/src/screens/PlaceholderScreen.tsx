import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { IconBubble, LiquidCard } from "../components/Liquid";
import { colors } from "../theme/liquid";

export function PlaceholderScreen({ Icon, label, mark }: { Icon?: LucideIcon; label: string; mark: string }) {
  return (
    <View style={styles.container}>
      <LiquidCard style={styles.card}>
        <IconBubble Icon={Icon} label={mark} tone={colors.violet} />
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.text}>Esta seccion queda lista para conectar en el siguiente paso.</Text>
      </LiquidCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  card: {
    gap: 12,
    padding: 18,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
  },
  text: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
