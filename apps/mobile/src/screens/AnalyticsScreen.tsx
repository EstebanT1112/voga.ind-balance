import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Tag, TrendingUp } from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import { IconBubble, LiquidCard, SectionLabel } from "../components/Liquid";
import { apiRequest } from "../lib/api";
import type { ReportSummary } from "../reports/report.types";
import { colors, formatMoney } from "../theme/liquid";

const chartColors = [colors.violet, colors.rose, colors.lilac, colors.coral, colors.mint];

const categoryLabels: Record<string, string> = {
  lingerie: "Lencería",
  lower: "Inferior",
  upper: "Superior",
};

function formatCategory(value: string): string {
  return categoryLabels[value] ?? value;
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function AnalyticsScreen() {
  const { profile, session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportSummary | null>(null);
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
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las analíticas");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, profile?.role, session]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const topCategory = report?.topCategories[0]?.key ? formatCategory(report.topCategories[0].key) : "-";
  const topSubcategory = report?.topSubcategories[0]?.key ?? "-";
  const maxCategoryAmount = useMemo(
    () => Math.max(1, ...(report?.topCategories ?? []).map((item) => item.amount)),
    [report?.topCategories],
  );
  const maxCategoryQuantity = useMemo(
    () => Math.max(1, ...(report?.topCategories ?? []).map((item) => item.quantity)),
    [report?.topCategories],
  );
  const maxSizeQuantity = useMemo(
    () => Math.max(1, ...(report?.topSizes ?? []).map((item) => item.quantity)),
    [report?.topSizes],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadReport} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analíticas</Text>
        <Text style={styles.subtitle}>Qué se vende y qué comprar</Text>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard Icon={TrendingUp} color={colors.violet} label="Mejor categoría" value={topCategory} />
        <KpiCard Icon={Tag} color={colors.rose} label="Mejor subclasif." value={topSubcategory} />
      </View>

      {loading && !report ? <ActivityIndicator color={colors.violet} /> : null}

      {errorMessage ? (
        <LiquidCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar las analíticas</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </LiquidCard>
      ) : null}

      <ChartCard title="Ingresos por categoría">
        {(report?.topCategories ?? []).length > 0 ? (
          <View style={styles.verticalBars}>
            {(report?.topCategories ?? []).map((item, index) => (
              <VerticalBar
                key={item.key}
                color={chartColors[index % chartColors.length] ?? colors.violet}
                label={formatCategory(item.key)}
                percent={item.amount / maxCategoryAmount}
                value={formatMoney(item.amount)}
              />
            ))}
          </View>
        ) : (
          <EmptyText />
        )}
      </ChartCard>

      <ChartCard title="Unidades por categoría">
        {(report?.topCategories ?? []).length > 0 ? (
          <View style={styles.verticalBarsSmall}>
            {(report?.topCategories ?? []).map((item, index) => (
              <VerticalBar
                key={item.key}
                color={chartColors[index % chartColors.length] ?? colors.violet}
                label={formatCategory(item.key)}
                percent={item.quantity / maxCategoryQuantity}
                value={`${item.quantity}`}
              />
            ))}
          </View>
        ) : (
          <EmptyText />
        )}
      </ChartCard>

      <ChartCard title="Talles más vendidos">
        {(report?.topSizes ?? []).length > 0 ? (
          <View style={styles.sizeList}>
            {(report?.topSizes ?? []).slice(0, 6).map((item, index) => (
              <HorizontalBar
                key={item.key}
                color={chartColors[index % chartColors.length] ?? colors.violet}
                label={item.key}
                percent={item.quantity / maxSizeQuantity}
                value={`${item.quantity}`}
              />
            ))}
          </View>
        ) : (
          <EmptyText />
        )}
      </ChartCard>

      <ChartCard title="Subclasificación">
        <View style={styles.chips}>
          {(report?.topSubcategories ?? []).slice(0, 8).map((item, index) => {
            const color = chartColors[index % chartColors.length] ?? colors.violet;

            return (
              <View key={item.key} style={[styles.subChip, { backgroundColor: `${color}15`, borderColor: `${color}22` }]}>
                <View style={[styles.subDot, { backgroundColor: color }]} />
                <Text style={styles.subText}>{item.key}</Text>
                <Text style={styles.subCount}>{item.quantity}</Text>
              </View>
            );
          })}
        </View>
      </ChartCard>

      <ChartCard title="Mayor salida">
        {(report?.topProducts ?? []).length > 0 ? (
          <View style={styles.topList}>
            {(report?.topProducts ?? []).slice(0, 4).map((item, index) => (
              <View key={item.key} style={styles.topRow}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <View style={styles.topInfo}>
                  <Text numberOfLines={1} style={styles.topName}>
                    {item.key}
                  </Text>
                  <Text style={styles.topMeta}>{item.quantity} unidades</Text>
                </View>
                <Text style={styles.topAmount}>{formatMoney(item.amount)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyText />
        )}
      </ChartCard>
    </ScrollView>
  );
}

function EmptyText() {
  return <Text style={styles.emptyText}>Sin ventas activas en el período.</Text>;
}

function KpiCard({ Icon, color, label, value }: { Icon: typeof TrendingUp; color: string; label: string; value: string }) {
  return (
    <LiquidCard style={styles.kpiCard}>
      <IconBubble Icon={Icon} tone={color} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.kpiValue}>
        {value}
      </Text>
    </LiquidCard>
  );
}

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <LiquidCard style={styles.chartCard}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </LiquidCard>
  );
}

function VerticalBar({ color, label, percent, value }: { color: string; label: string; percent: number; value: string }) {
  return (
    <View style={styles.verticalBarItem}>
      <View style={styles.verticalTrack}>
        <View style={[styles.verticalFill, { backgroundColor: color, height: `${Math.max(8, percent * 100)}%` }]} />
      </View>
      <Text numberOfLines={1} style={styles.verticalLabel}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.verticalValue}>
        {value}
      </Text>
    </View>
  );
}

function HorizontalBar({ color, label, percent, value }: { color: string; label: string; percent: number; value: string }) {
  return (
    <View style={styles.sizeRow}>
      <View style={[styles.sizeBadge, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
        <Text style={[styles.sizeLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.sizeBody}>
        <View style={styles.sizeTrack}>
          <View style={[styles.sizeFill, { backgroundColor: color, width: `${Math.max(8, percent * 100)}%` }]} />
        </View>
      </View>
      <Text style={styles.sizeValue}>{value} u.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    gap: 2,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
  },
  kpiLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 10,
    textTransform: "uppercase",
  },
  kpiValue: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  chartCard: {
    padding: 18,
  },
  verticalBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    height: 172,
  },
  verticalBarsSmall: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    height: 142,
  },
  verticalBarItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  verticalTrack: {
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 10,
    height: 112,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 36,
  },
  verticalFill: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: "100%",
  },
  verticalLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 72,
  },
  verticalValue: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: "900",
    maxWidth: 76,
  },
  sizeList: {
    gap: 12,
  },
  sizeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  sizeBadge: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    width: 48,
  },
  sizeLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  sizeBody: {
    flex: 1,
  },
  sizeTrack: {
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  sizeFill: {
    borderRadius: 999,
    height: "100%",
  },
  sizeValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    width: 42,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  subText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "900",
  },
  subCount: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "800",
  },
  topList: {
    gap: 12,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  rank: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "900",
    width: 24,
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  topMeta: {
    color: colors.faint,
    fontSize: 11,
    marginTop: 2,
  },
  topAmount: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
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
  emptyText: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 12,
    textAlign: "center",
  },
});
