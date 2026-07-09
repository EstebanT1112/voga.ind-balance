import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertCircle, CheckCircle2, ChevronRight, DollarSign, TrendingUp, Users } from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import { IconBubble, LiquidCard, SectionLabel } from "../components/Liquid";
import { apiRequest } from "../lib/api";
import type { ApiProfile, ReportSummary, UsersResponse } from "../reports/report.types";
import { colors, formatMoney } from "../theme/liquid";

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    from: from.toISOString(),
    label: now.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    to: to.toISOString(),
  };
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HomeScreen() {
  const { profile, session, signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [sellers, setSellers] = useState<ApiProfile[]>([]);
  const month = currentMonthRange();

  const loadHome = useCallback(async () => {
    if (!session || profile?.role !== "owner") {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const query = new URLSearchParams({
        from: month.from,
        to: month.to,
      });
      const [reportResponse, sellersResponse] = await Promise.all([
        apiRequest<ReportSummary>(`/reports?${query.toString()}`, { method: "GET", session }),
        apiRequest<UsersResponse>("/users?role=seller&active=true", { method: "GET", session }),
      ]);

      setReport(reportResponse);
      setSellers(sellersResponse.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, profile?.role, session]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const employeeRows = useMemo(
    () =>
      sellers.map((seller, index) => {
        const commission = report?.commissionsBySeller.find((item) => item.sellerId === seller.id);

        return {
          color: seller.color ?? [colors.violet, colors.rose, colors.coral, colors.mint][index % 4] ?? colors.violet,
          commission: commission?.commissionAmount ?? 0,
          fullName: seller.fullName,
          initials: getInitials(seller.fullName),
          sold: commission?.collectedAmount ?? 0,
        };
      }),
    [report?.commissionsBySeller, sellers],
  );

  if (profile?.role !== "owner") {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.month}>{month.label}</Text>
          <Text style={styles.title}>Hola, {profile?.fullName}</Text>
          <Text style={styles.subtitle}>Tu acceso ya esta activo.</Text>
        </View>
        <LiquidCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Panel de vendedora</Text>
          <Text style={styles.emptyText}>Lo vamos a armar cuando terminemos la vista de dueña.</Text>
        </LiquidCard>
      </ScrollView>
    );
  }

  const totals = report?.totals;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadHome} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.month}>{month.label}</Text>
          <Text style={styles.title}>Hola, {profile?.fullName ?? "Dueña"}</Text>
          <Text style={styles.subtitle}>Tu resumen del mes</Text>
        </View>
        <Pressable onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      <LiquidCard style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroHighlight} />
        <View style={styles.heroLabelRow}>
          <IconBubble Icon={DollarSign} tone={colors.violet} />
          <Text style={styles.heroLabel}>Ingreso esperado del mes</Text>
        </View>
        <Text style={styles.heroValue}>{formatMoney(totals?.salesAmount ?? 0)}</Text>

        <View style={styles.heroGrid}>
          <MetricTile Icon={CheckCircle2} label="Cobrado" tone={colors.mint} value={formatMoney(totals?.netCollectedAmount ?? 0)} />
          <MetricTile Icon={AlertCircle} label="Por cobrar" tone={colors.red} value={formatMoney(totals?.pendingAmount ?? 0)} />
        </View>
      </LiquidCard>

      {loading && !report ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : null}

      {errorMessage ? (
        <LiquidCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar el resumen</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </LiquidCard>
      ) : null}

      <View>
        <View style={styles.sectionHeader}>
          <SectionLabel>Empleadas</SectionLabel>
          <Users color="rgba(155,93,229,0.5)" size={15} strokeWidth={2.3} />
        </View>
        <View style={styles.employeeList}>
          {employeeRows.map((item) => (
            <EmployeeCard
              key={item.fullName}
              color={item.color}
              commission={item.commission}
              fullName={item.fullName}
              initials={item.initials}
              sold={item.sold}
            />
          ))}
          {employeeRows.length === 0 ? (
            <LiquidCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Todavía no hay empleadas configuradas.</Text>
            </LiquidCard>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function MetricTile({
  Icon,
  label,
  tone,
  value,
}: {
  Icon: typeof TrendingUp;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricTileHeader}>
        <Icon color={tone} size={13} strokeWidth={2.4} />
        <Text style={styles.metricTileLabel}>{label}</Text>
      </View>
      <Text style={styles.metricTileValue}>{value}</Text>
    </View>
  );
}

function EmployeeCard({
  color,
  commission,
  fullName,
  initials,
  sold,
}: {
  color: string;
  commission: number;
  fullName: string;
  initials: string;
  sold: number;
}) {
  return (
    <LiquidCard style={styles.employeeCard}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.employeeBody}>
        <Text numberOfLines={1} style={styles.employeeName}>
          {fullName}
        </Text>
        <Text style={styles.employeeSold}>
          Vendido: <Text style={[styles.employeeSoldStrong, { color }]}>{formatMoney(sold)}</Text>
        </Text>
      </View>
      <View style={styles.employeeRight}>
        <Text style={styles.employeeCommissionLabel}>Comisión 15%</Text>
        <Text style={styles.employeeCommission}>{formatMoney(commission)}</Text>
      </View>
      <ChevronRight color="rgba(155,93,229,0.4)" size={15} strokeWidth={2.4} />
    </LiquidCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  month: {
    color: "rgba(155,93,229,0.55)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  subtitle: {
    color: "rgba(90,60,120,0.55)",
    fontSize: 13,
    marginTop: 2,
  },
  logout: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900",
  },
  hero: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 32,
    padding: 24,
    shadowColor: colors.violet,
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
  },
  heroGlow: {
    backgroundColor: "rgba(192,132,252,0.2)",
    borderRadius: 130,
    height: 190,
    position: "absolute",
    right: -68,
    top: -74,
    width: 190,
  },
  heroHighlight: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 999,
    height: 1,
    position: "absolute",
    top: 0,
    width: "78%",
  },
  heroLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  heroLabel: {
    color: "rgba(90,60,120,0.7)",
    fontSize: 12,
    fontWeight: "800",
  },
  heroValue: {
    color: colors.foreground,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 40,
    marginBottom: 20,
  },
  heroGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricTile: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  metricTileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  metricTileLabel: {
    color: "rgba(90,60,120,0.6)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricTileValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  loading: {
    alignItems: "center",
    paddingVertical: 12,
  },
  errorCard: {
    borderColor: "rgba(224,82,113,0.24)",
    padding: 16,
  },
  errorTitle: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "900",
  },
  errorText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  employeeList: {
    gap: 12,
  },
  employeeCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    width: 46,
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  employeeBody: {
    flex: 1,
  },
  employeeName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  employeeSold: {
    color: "rgba(90,60,120,0.6)",
    fontSize: 12,
    marginTop: 3,
  },
  employeeSoldStrong: {
    fontWeight: "900",
  },
  employeeRight: {
    alignItems: "flex-end",
  },
  employeeCommissionLabel: {
    color: "rgba(90,60,120,0.5)",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  employeeCommission: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyCard: {
    padding: 18,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
