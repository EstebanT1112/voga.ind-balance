import type { PropsWithChildren } from "react";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, shadows } from "../theme/liquid";

interface LiquidCardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function LiquidCard({ children, onPress, style }: LiquidCardProps) {
  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.shimmer} />
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function GlassBadge({ label, tone = colors.violet }: { label: string; tone?: string }) {
  return (
    <View style={[styles.badge, { borderColor: `${tone}33`, backgroundColor: `${tone}18` }]}>
      <Text style={[styles.badgeText, { color: tone }]}>{label}</Text>
    </View>
  );
}

export function IconBubble({
  Icon,
  label,
  tone = colors.violet,
}: {
  Icon?: LucideIcon;
  label?: string;
  tone?: string;
}) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: `${tone}22`, borderColor: `${tone}33` }]}>
      {Icon ? <Icon color={tone} size={18} strokeWidth={2.3} /> : <Text style={[styles.iconText, { color: tone }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.glass,
  },
  shimmer: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    height: 1,
    position: "absolute",
    top: 0,
    width: "78%",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sectionLabel: {
    color: "rgba(155,93,229,0.62)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
