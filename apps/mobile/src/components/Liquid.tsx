import { createContext, useCallback, useContext, useEffect, useRef, type PropsWithChildren, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Inbox, RotateCw, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, shadows } from "../theme/liquid";

interface LiquidCardProps extends PropsWithChildren {
  dark?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function LiquidCard({ children, dark = true, onPress, style }: LiquidCardProps) {
  const content = (
    <View style={[styles.card, dark && styles.cardDark, style]}>
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

export function SuccessToast({
  detail,
  duration = 1550,
  onHidden,
  title,
  visible,
}: {
  detail?: string;
  duration?: number;
  onHidden?: () => void;
  title: string;
  visible: boolean;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const onHiddenRef = useRef(onHidden);

  onHiddenRef.current = onHidden;

  useEffect(() => {
    if (!visible) {
      return;
    }

    fade.setValue(0);
    scale.setValue(0.86);

    Animated.parallel([
      Animated.timing(fade, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        damping: 12,
        mass: 0.75,
        stiffness: 150,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.timing(fade, {
        duration: 260,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(() => onHiddenRef.current?.());
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, fade, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.successOverlay, { opacity: fade }]}>
      <Animated.View style={[styles.successToast, { transform: [{ scale }] }]}>
        <View style={styles.successIconWrap}>
          <CheckCircle2 color={colors.white} size={32} strokeWidth={2.6} />
        </View>
        <Text style={styles.successTitle}>{title}</Text>
        {detail ? <Text style={styles.successDetail}>{detail}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonGroup({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const opacity = useRef(new Animated.Value(0.48)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0.92,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 720,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0.48,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

export function ErrorState({
  message,
  onRetry,
  retrying = false,
  title,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  title: string;
}) {
  return (
    <LiquidCard style={styles.errorState}>
      <View style={styles.errorStateIcon}>
        <AlertCircle color={colors.red} size={19} strokeWidth={2.4} />
      </View>
      <View style={styles.errorStateBody}>
        <Text style={styles.errorStateTitle}>{title}</Text>
        <Text style={styles.errorStateMessage}>{message}</Text>
      </View>
      <Pressable
        accessibilityLabel="Reintentar"
        accessibilityRole="button"
        disabled={retrying}
        onPress={onRetry}
        style={({ pressed }) => [styles.errorStateRetry, pressed && styles.pressed]}
      >
        {retrying ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <RotateCw color={colors.white} size={17} strokeWidth={2.5} />
        )}
      </Pressable>
    </LiquidCard>
  );
}

const ScreenTransitionContext = createContext<((onExited: () => void) => void) | null>(null);

export function ScreenEnter({ children }: PropsWithChildren) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(18)).current;
  const exiting = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateX]);

  const exitScreen = useCallback(
    (onExited: () => void) => {
      if (exiting.current) {
        return;
      }

      exiting.current = true;
      Animated.parallel([
        Animated.timing(opacity, {
          duration: 180,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          duration: 180,
          easing: Easing.in(Easing.cubic),
          toValue: 18,
          useNativeDriver: true,
        }),
      ]).start(() => onExited());
    },
    [opacity, translateX],
  );

  return (
    <ScreenTransitionContext.Provider value={exitScreen}>
      <Animated.View style={[styles.screenEnter, { opacity, transform: [{ translateX }] }]}>{children}</Animated.View>
    </ScreenTransitionContext.Provider>
  );
}

export function InternalHeader({
  accessory,
  onBack,
  subtitle,
  title,
}: {
  accessory?: ReactNode;
  onBack: () => void;
  subtitle?: string;
  title: string;
}) {
  const exitScreen = useContext(ScreenTransitionContext);

  return (
    <View style={styles.internalHeader}>
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => (exitScreen ? exitScreen(onBack) : onBack())}
        style={({ pressed }) => [styles.internalBackButton, pressed && styles.pressed]}
      >
        <ChevronLeft color={colors.violet} size={19} strokeWidth={2.6} />
      </Pressable>
      <View style={styles.internalHeaderText}>
        <Text numberOfLines={1} style={styles.internalTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.internalSubtitle}>{subtitle}</Text> : null}
      </View>
      {accessory}
    </View>
  );
}

export function EmptyState({
  description,
  Icon = Inbox,
  title,
}: {
  description: string;
  Icon?: LucideIcon;
  title: string;
}) {
  return (
    <LiquidCard style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Icon color={colors.violet} size={21} strokeWidth={2.2} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDescription}>{description}</Text>
    </LiquidCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.glass,
  },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.68)",
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
  successOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.68)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 32,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 80,
  },
  successToast: {
    alignItems: "center",
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 26,
    shadowColor: "#000000",
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    width: "100%",
  },
  successIconWrap: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 2,
    height: 62,
    justifyContent: "center",
    marginBottom: 13,
    shadowColor: colors.mint,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    width: 62,
  },
  successTitle: {
    color: colors.foreground,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  successDetail: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 7,
    textAlign: "center",
  },
  skeletonBlock: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  errorState: {
    alignItems: "center",
    borderColor: "rgba(224,82,113,0.22)",
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  errorStateIcon: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.1)",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  errorStateBody: {
    flex: 1,
  },
  errorStateTitle: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "900",
  },
  errorStateMessage: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  errorStateRetry: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  screenEnter: {
    flex: 1,
  },
  internalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 44,
  },
  internalBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  internalHeaderText: {
    flex: 1,
  },
  internalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  internalSubtitle: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  emptyStateIcon: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.1)",
    borderColor: "rgba(155,93,229,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginBottom: 12,
    width: 46,
  },
  emptyStateTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyStateDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
});
