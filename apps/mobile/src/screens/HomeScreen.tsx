import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, DollarSign, Package, TrendingUp } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { apiRequest } from "../lib/api";
import { GlassBadge, IconBubble, LiquidCard, SectionLabel } from "../components/Liquid";
import { colors, formatMoney } from "../theme/liquid";
import type { ReportSummary } from "../reports/report.types";

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

export function HomeScreen() {
  const { profile, session, signOut } = useAuth();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const month = currentMonthRange();

  const loadReport = useCallback(async () => {
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
      setReport(await apiRequest<ReportSummary>(`/reports?${query.toString()}`, { method: "GET", session }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, profile?.role, session]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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
          <Text style={styles.emptyText}>El siguiente paso es conectar productos y ventas para tu rol.</Text>
        </LiquidCard>
      </ScrollView>
    );
  }

  const totals = report?.totals;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadReport} />}
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
        <View style={styles.heroLabelRow}>
          <IconBubble Icon={DollarSign} tone={colors.violet} />
          <Text style={styles.heroLabel}>Ingreso esperado</Text>
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
        <SectionLabel>Indicadores</SectionLabel>
        <View style={styles.metricsGrid}>
          <MetricCard label="Ganancia" value={formatMoney(totals?.collectedProfit ?? 0)} tone={colors.violet} />
          <MetricCard label="Egresos" value={formatMoney(totals?.expensesAmount ?? 0)} tone={colors.coral} />
          <MetricCard label="Comisiones" value={formatMoney(totals?.commissionAmount ?? 0)} tone={colors.rose} />
          <MetricCard label="Neto final" value={formatMoney(totals?.netProfitAfterExpenses ?? 0)} tone={colors.mint} />
        </View>
      </View>

      <View>
        <SectionLabel>Mayor salida</SectionLabel>
        <LiquidCard style={styles.listCard}>
          {(report?.topCategories ?? []).slice(0, 4).map((item) => (
            <View key={item.key} style={styles.rankRow}>
              <View style={styles.rankLeft}>
                <IconBubble Icon={Package} tone={colors.lilac} />
                <View>
                  <Text style={styles.rankTitle}>{item.key}</Text>
                  <Text style={styles.rankMeta}>{item.quantity} unidades</Text>
                </View>
              </View>
              <Text style={styles.rankAmount}>{formatMoney(item.amount)}</Text>
            </View>
          ))}
          {report?.topCategories.length === 0 ? <Text style={styles.emptyText}>Sin ventas confirmadas todavia.</Text> : null}
        </LiquidCard>
      </View>

      <View>
        <SectionLabel>Talles</SectionLabel>
        <View style={styles.sizeWrap}>
          {(report?.topSizes ?? []).slice(0, 8).map((item) => (
            <GlassBadge key={item.key} label={`${item.key} · ${item.quantity}`} tone={colors.violet} />
          ))}
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
        <Text style={[styles.metricTileLabel, { color: tone }]}>{label}</Text>
      </View>
      <Text style={styles.metricTileValue}>{value}</Text>
    </View>
  );
}

function MetricCard({ label, tone, value }: { label: string; tone: string; value: string }) {
  return (
    <LiquidCard style={styles.metricCard}>
      <Text style={[styles.metricLabel, { color: tone }]}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </LiquidCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  month: {
    color: "rgba(155,93,229,0.62)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 3,
  },
  subtitle: {
    color: colors.muted,
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
    backgroundColor: "rgba(255,255,255,0.36)",
    padding: 20,
  },
  heroLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  heroLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  heroValue: {
    color: colors.foreground,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
    marginBottom: 18,
  },
  heroGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricTile: {
    backgroundColor: "rgba(255,255,255,0.36)",
    borderColor: "rgba(255,255,255,0.66)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metricTileLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricTileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginBottom: 7,
  },
  metricTileValue: {
    color: colors.foreground,
    fontSize: 17,
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    minHeight: 92,
    padding: 15,
    width: "47.8%",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  listCard: {
    gap: 14,
    padding: 14,
  },
  rankRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rankLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  rankTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  rankMeta: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 1,
  },
  rankAmount: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  sizeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
