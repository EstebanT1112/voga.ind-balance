import { useState } from "react";
import { BarChart3, Home, Package, ReceiptText, ShoppingBag } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "../screens/HomeScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { SalesScreen } from "../screens/SalesScreen";
import { colors } from "../theme/liquid";

type Tab = "home" | "products" | "sales" | "expenses" | "analytics";

const tabs: Array<{ id: Tab; label: string; Icon: LucideIcon }> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "products", label: "Catálogo", Icon: Package },
  { id: "sales", label: "Ventas", Icon: ShoppingBag },
  { id: "expenses", label: "Gastos", Icon: ReceiptText },
  { id: "analytics", label: "Analíticas", Icon: BarChart3 },
];

export function AppShell() {
  const [chromeHidden, setChromeHidden] = useState(false);
  const [tab, setTab] = useState<Tab>("home");

  return (
    <View style={styles.safeArea}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.content}>
        {tab === "home" ? (
          <HomeScreen onChromeHiddenChange={setChromeHidden} />
        ) : tab === "products" ? (
          <ProductsScreen />
        ) : tab === "sales" ? (
          <SalesScreen onChromeHiddenChange={setChromeHidden} />
        ) : tab === "expenses" ? (
          <ExpensesScreen />
        ) : tab === "analytics" ? (
          <AnalyticsScreen />
        ) : (
          null
        )}
      </View>

      {chromeHidden ? null : <View style={styles.navWrap}>
        <View style={styles.nav}>
          {tabs.map((item) => {
            const isActive = item.id === tab;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setChromeHidden(false);
                  setTab(item.id);
                }}
                style={({ pressed }) => [styles.navItem, isActive && styles.navItemActive, pressed && styles.navItemPressed]}
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

      <StatusBar style="dark" />
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
    flex: 1,
  },
  blobTop: {
    backgroundColor: "rgba(192,132,252,0.28)",
    borderRadius: 190,
    height: 300,
    position: "absolute",
    right: -110,
    top: -110,
    width: 300,
  },
  blobBottom: {
    backgroundColor: "rgba(244,114,182,0.18)",
    borderRadius: 160,
    bottom: 70,
    height: 240,
    left: -90,
    position: "absolute",
    width: 240,
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
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 7,
    shadowColor: colors.violet,
    shadowOpacity: 0.12,
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
  },
  navItemActive: {
    backgroundColor: "rgba(155,93,229,0.12)",
  },
  navItemPressed: {
    opacity: 0.75,
  },
  navLabel: {
    color: "rgba(155,93,229,0.38)",
    fontSize: 10,
    fontWeight: "900",
  },
  navTextActive: {
    color: colors.violet,
  },
});
