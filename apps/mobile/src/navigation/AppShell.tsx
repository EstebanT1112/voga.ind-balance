import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Home, Package, ReceiptText, ShoppingBag } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Animated, Easing, PanResponder, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../auth/AuthProvider";
import { HomeScreen } from "../screens/HomeScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { SalesScreen } from "../screens/SalesScreen";
import { colors } from "../theme/liquid";

type Tab = "home" | "products" | "sales" | "expenses" | "analytics";
type TabItem = { id: Tab; label: string; Icon: LucideIcon };

const ownerTabs: TabItem[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "products", label: "Catálogo", Icon: Package },
  { id: "sales", label: "Ventas", Icon: ShoppingBag },
  { id: "expenses", label: "Gastos", Icon: ReceiptText },
  { id: "analytics", label: "Analíticas", Icon: BarChart3 },
];

const sellerTabs: TabItem[] = ownerTabs.filter((item) =>
  item.id === "home" || item.id === "products" || item.id === "sales",
);

export function AppShell() {
  const { profile } = useAuth();
  const [chromeHidden, setChromeHidden] = useState(false);
  const [navWidth, setNavWidth] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const tabs = profile?.role === "owner" ? ownerTabs : sellerTabs;
  const tabIndex = Math.max(0, tabs.findIndex((item) => item.id === tab));

  useEffect(() => {
    if (tabs.some((item) => item.id === tab)) {
      return;
    }

    setChromeHidden(false);
    setTab("home");
    indicatorPosition.setValue(0);
  }, [indicatorPosition, tab, tabs]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(indicatorPosition, {
        damping: 20,
        mass: 0.72,
        stiffness: 190,
        toValue: tabIndex,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateX, indicatorPosition, tabIndex]);

  const changeTab = (nextTab: Tab) => {
    if (nextTab === tab) {
      return;
    }

    const nextIndex = tabs.findIndex((item) => item.id === nextTab);
    const direction = nextIndex > tabIndex ? 1 : -1;
    contentOpacity.setValue(0.58);
    contentTranslateX.setValue(direction * 34);
    setChromeHidden(false);
    setTab(nextTab);
  };

  const resetSwipe = useCallback(() => {
    Animated.parallel([
      Animated.spring(contentTranslateX, {
        damping: 18,
        mass: 0.7,
        stiffness: 210,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        duration: 160,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateX]);

  const completeSwipe = useCallback((nextTab: Tab, direction: number) => {
    Animated.parallel([
      Animated.timing(contentTranslateX, {
        duration: 120,
        easing: Easing.in(Easing.cubic),
        toValue: direction * -72,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        duration: 120,
        toValue: 0.35,
        useNativeDriver: true,
      }),
    ]).start(() => {
      contentTranslateX.setValue(direction * 34);
      contentOpacity.setValue(0.58);
      setTab(nextTab);
    });
  }, [contentOpacity, contentTranslateX]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (chromeHidden || Math.abs(gesture.dx) < 18 || Math.abs(gesture.dx) <= Math.abs(gesture.dy) * 1.35) {
            return false;
          }

          const swipingToPrevious = gesture.dx > 0;
          return swipingToPrevious ? tabIndex > 0 : tabIndex < tabs.length - 1;
        },
        onPanResponderGrant: () => {
          contentOpacity.stopAnimation();
          contentTranslateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const resistedDistance = Math.max(-84, Math.min(84, gesture.dx * 0.55));
          contentTranslateX.setValue(resistedDistance);
          contentOpacity.setValue(Math.max(0.82, 1 - Math.abs(resistedDistance) / 420));
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldChangeTab = Math.abs(gesture.dx) > 72 || Math.abs(gesture.vx) > 0.48;

          if (!shouldChangeTab) {
            resetSwipe();
            return;
          }

          const direction = gesture.dx < 0 ? 1 : -1;
          const nextIndex = tabIndex + direction;

          if (nextIndex < 0 || nextIndex >= tabs.length) {
            resetSwipe();
            return;
          }

          const nextTab = tabs[nextIndex];

          if (!nextTab) {
            resetSwipe();
            return;
          }

          completeSwipe(nextTab.id, direction);
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
      }),
    [chromeHidden, completeSwipe, contentOpacity, contentTranslateX, resetSwipe, tabIndex, tabs],
  );

  const navItemWidth = navWidth > 0 ? (navWidth - 14) / tabs.length : 0;

  return (
    <View style={styles.safeArea}>
      <Animated.View
        {...swipeResponder.panHandlers}
        style={[styles.content, { opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] }]}
      >
        {tab === "home" ? (
          <HomeScreen onChromeHiddenChange={setChromeHidden} />
        ) : tab === "products" ? (
          <ProductsScreen />
        ) : tab === "sales" ? (
          <SalesScreen onChromeHiddenChange={setChromeHidden} />
        ) : tab === "expenses" && profile?.role === "owner" ? (
          <ExpensesScreen />
        ) : tab === "analytics" && profile?.role === "owner" ? (
          <AnalyticsScreen />
        ) : (
          null
        )}
      </Animated.View>

      {chromeHidden ? null : <View style={styles.navWrap}>
        <View onLayout={(event) => setNavWidth(event.nativeEvent.layout.width)} style={styles.nav}>
          {navItemWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.navIndicator,
                {
                  transform: [{ translateX: Animated.multiply(indicatorPosition, navItemWidth) }],
                  width: navItemWidth,
                },
              ]}
            />
          ) : null}
          {tabs.map((item) => {
            const isActive = item.id === tab;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => changeTab(item.id)}
                style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
              >
                <item.Icon
                  color={isActive ? colors.violet : "rgba(155,93,229,0.38)"}
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                <Text numberOfLines={1} style={[styles.navLabel, isActive && styles.navTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 24 : 52,
  },
  content: {
    backgroundColor: colors.background,
    flex: 1,
  },
  navWrap: {
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 10,
    position: "absolute",
    right: 0,
  },
  nav: {
    backgroundColor: "rgba(18,18,18,0.96)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 7,
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 20,
    flex: 1,
    gap: 2,
    minHeight: 54,
    justifyContent: "center",
    zIndex: 1,
  },
  navIndicator: {
    backgroundColor: "rgba(155,93,229,0.12)",
    borderRadius: 20,
    bottom: 7,
    left: 7,
    position: "absolute",
    top: 7,
  },
  navItemPressed: {
    opacity: 0.75,
  },
  navLabel: {
    color: "rgba(255,255,255,0.46)",
    fontSize: 10,
    fontWeight: "900",
  },
  navTextActive: {
    color: colors.violet,
  },
});
