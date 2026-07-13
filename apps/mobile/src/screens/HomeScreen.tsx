import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AlertCircle, CheckCircle2, ChevronRight, DollarSign, Plus, ReceiptText, Settings, ShoppingBag, TrendingUp, Users, WalletCards } from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import {
  EmptyState,
  ErrorState,
  IconBubble,
  InternalHeader,
  LiquidCard,
  ScreenEnter,
  SectionLabel,
  SkeletonBlock,
  SkeletonGroup,
  SuccessToast,
} from "../components/Liquid";
import { apiRequest } from "../lib/api";
import type { Payment, PaymentsResponse } from "../payments/payment.types";
import type { ApiProfile, ReportSummary, UsersResponse } from "../reports/report.types";
import type { Sale, SalesResponse, SellerDashboard } from "../sales/sale.types";
import { colors, employeeColors, formatMoney, ownerColors } from "../theme/liquid";
import { SaleDetail } from "./SalesScreen";

const sellerColors = employeeColors;

function getColorText(color: string): string {
  const normalized = color.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

  return luminance > 165 ? colors.foreground : colors.white;
}
const paymentLabels: Record<Sale["paymentStatus"], string> = {
  overdue: "Vencida",
  paid: "Pagada",
  partial: "Parcial",
  unpaid: "Sin pago",
};

const paymentTones: Record<Sale["paymentStatus"], string> = {
  overdue: colors.red,
  paid: colors.mint,
  partial: colors.coral,
  unpaid: colors.muted,
};

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function monthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

type MonthlySaleBar = {
  amount: number;
  label: string;
};

type ComparisonSaleBar = {
  amount: number;
  color: string;
  id: string;
  label: string;
};

type LedgerView = "collected" | "pending";

export function HomeScreen({ onChromeHiddenChange }: { onChromeHiddenChange?: (hidden: boolean) => void } = {}) {
  const { profile, refreshProfile, session, signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthSales, setMonthSales] = useState<Sale[]>([]);
  const [ownerColor, setOwnerColor] = useState(colors.violet);
  const [ownerColorError, setOwnerColorError] = useState<string | null>(null);
  const [ownerColorOpen, setOwnerColorOpen] = useState(false);
  const [ownerColorSaved, setOwnerColorSaved] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [savingOwnerColor, setSavingOwnerColor] = useState(false);
  const [savingSeller, setSavingSeller] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [sellerSuccess, setSellerSuccess] = useState<{ detail: string; title: string } | null>(null);
  const [creatingSeller, setCreatingSeller] = useState(false);
  const [sellerForm, setSellerForm] = useState({ active: true, color: colors.violet, email: "", fullName: "", password: "" });
  const [sellerManagerOpen, setSellerManagerOpen] = useState(false);
  const [sellers, setSellers] = useState<ApiProfile[]>([]);
  const [employeeDetailId, setEmployeeDetailId] = useState<string | null>(null);
  const [ledgerView, setLedgerView] = useState<LedgerView | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<ApiProfile | null>(null);
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
      const [reportResponse, sellersResponse, salesResponse, paymentsResponse] = await Promise.all([
        apiRequest<ReportSummary>(`/reports?${query.toString()}`, { method: "GET", session }),
        apiRequest<UsersResponse>("/users?role=seller", { method: "GET", session }),
        apiRequest<SalesResponse>(`/sales?${query.toString()}`, { method: "GET", session }),
        apiRequest<PaymentsResponse>(`/payments?${query.toString()}`, { method: "GET", session }),
      ]);

      setReport(reportResponse);
      setSellers(sellersResponse.items);
      setMonthSales(salesResponse.items);
      setPayments(paymentsResponse.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, profile?.role, session]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    onChromeHiddenChange?.(selectedSale !== null || employeeDetailId !== null || ledgerView !== null);

    return () => {
      onChromeHiddenChange?.(false);
    };
  }, [employeeDetailId, ledgerView, onChromeHiddenChange, selectedSale]);

  const employeeRows = useMemo(
    () =>
      sellers.map((seller, index) => {
        const commission = report?.commissionsBySeller.find((item) => item.sellerId === seller.id);

        return {
          active: seller.active,
          color: seller.color ?? [colors.violet, colors.rose, colors.coral, colors.mint][index % 4] ?? colors.violet,
          commission: commission?.commissionAmount ?? 0,
          fullName: seller.fullName,
          id: seller.id,
          initials: getInitials(seller.fullName),
          seller,
          sold: commission?.collectedAmount ?? 0,
        };
      }),
    [report?.commissionsBySeller, sellers],
  );

  const monthlyComparisonBars = useMemo<ComparisonSaleBar[]>(() => {
    const totalsBySeller = new Map<string, number>();

    monthSales.forEach((sale) => {
      totalsBySeller.set(sale.sellerId, (totalsBySeller.get(sale.sellerId) ?? 0) + sale.totalAmount);
    });

    const ownerRow = profile
      ? [
          {
            amount: totalsBySeller.get(profile.id) ?? 0,
            color: profile.color ?? colors.violet,
            id: profile.id,
            label: `${profile.fullName.split(" ")[0] || "Dueña"} (yo)`,
          },
        ]
      : [];

    return [
      ...ownerRow,
      ...employeeRows.map((employee) => ({
        amount: totalsBySeller.get(employee.id) ?? 0,
        color: employee.color,
        id: employee.id,
        label: employee.fullName.split(" ")[0] || employee.fullName,
      })),
    ];
  }, [employeeRows, monthSales, profile]);

  const openOwnerColor = () => {
    setOwnerColor(profile?.color ?? colors.violet);
    setOwnerColorError(null);
    setOwnerColorSaved(false);
    setOwnerColorOpen(true);
  };

  const closeOwnerColor = () => {
    if (savingOwnerColor || ownerColorSaved) {
      return;
    }

    setOwnerColorOpen(false);
    setOwnerColorError(null);
  };

  const saveOwnerColor = async () => {
    if (!session || !profile) {
      return;
    }

    setSavingOwnerColor(true);
    setOwnerColorError(null);

    try {
      await apiRequest(`/users/${profile.id}`, {
        body: { color: ownerColor },
        method: "PATCH",
        session,
      });
      await refreshProfile();
      setOwnerColorSaved(true);
    } catch (error) {
      setOwnerColorError(error instanceof Error ? error.message : "No se pudo guardar el color");
    } finally {
      setSavingOwnerColor(false);
    }
  };

  const pendingSales = useMemo(() => monthSales.filter((sale) => sale.pendingAmount > 0), [monthSales]);

  const openSaleById = useCallback(
    async (saleId: string) => {
      if (!session) {
        return;
      }

      setSaleLoading(true);
      setErrorMessage(null);

      try {
        const response = await apiRequest<{ item: Sale }>(`/sales/${saleId}`, { method: "GET", session });
        setSelectedSale(response.item);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo abrir la venta");
      } finally {
        setSaleLoading(false);
      }
    },
    [session],
  );

  const openSeller = (seller: ApiProfile) => {
    setSellerManagerOpen(true);
    setSelectedSeller(seller);
    setSellerForm({
      active: seller.active,
      color: seller.color ?? colors.violet,
      email: "",
      fullName: seller.fullName,
      password: "",
    });
    setSellerError(null);
  };

  const openSellerManager = () => {
    setSellerManagerOpen(true);
    setSelectedSeller(null);
    setCreatingSeller(false);
    setSellerError(null);
  };

  const openCreateSeller = () => {
    setSellerManagerOpen(true);
    setCreatingSeller(true);
    setSelectedSeller(null);
    setSellerForm({
      active: true,
      color: colors.violet,
      email: "",
      fullName: "",
      password: "",
    });
    setSellerError(null);
  };

  const closeSeller = () => {
    if (savingSeller) {
      return;
    }

    setSelectedSeller(null);
    setCreatingSeller(false);
    setSellerManagerOpen(false);
    setSellerError(null);
    setSellerSuccess(null);
  };

  const backToSellerManager = () => {
    if (savingSeller) {
      return;
    }

    setSelectedSeller(null);
    setCreatingSeller(false);
    setSellerError(null);
  };

  const saveSeller = async () => {
    if (!session || (!selectedSeller && !creatingSeller)) {
      return;
    }

    if (!sellerForm.fullName.trim()) {
      setSellerError("Completa el nombre de la empleada.");
      return;
    }

    if (creatingSeller && (!sellerForm.email.trim() || sellerForm.password.length < 6)) {
      setSellerError("Completa email y contraseña inicial de al menos 6 caracteres.");
      return;
    }

    setSavingSeller(true);
    setSellerError(null);
    const wasCreating = creatingSeller;

    try {
      const response = await apiRequest<{ item: ApiProfile }>(creatingSeller ? "/users" : `/users/${selectedSeller!.id}`, {
        body: creatingSeller
          ? {
              active: sellerForm.active,
              color: sellerForm.color,
              email: sellerForm.email.trim(),
              fullName: sellerForm.fullName.trim(),
              password: sellerForm.password,
            }
          : {
              active: sellerForm.active,
              color: sellerForm.color,
              fullName: sellerForm.fullName.trim(),
            },
        method: creatingSeller ? "POST" : "PATCH",
        session,
      });

      setSellers((current) =>
        creatingSeller
          ? [...current, response.item].sort((a, b) => a.fullName.localeCompare(b.fullName))
          : current.map((seller) => (seller.id === response.item.id ? response.item : seller)),
      );
      setSelectedSeller(response.item);
      setCreatingSeller(false);
      setSellerSuccess({
        detail: response.item.fullName,
        title: wasCreating ? "Empleada creada" : "Cambios guardados",
      });
    } catch (error) {
      setSellerError(error instanceof Error ? error.message : "No se pudo guardar la empleada");
    } finally {
      setSavingSeller(false);
    }
  };

  if (profile?.role === "seller") {
    return <SellerHomeScreen profile={profile} session={session} signOut={signOut} />;
  }

  if (!profile) {
    return null;
  }

  const totals = report?.totals;
  const employeeDetailRow = employeeRows.find((item) => item.id === employeeDetailId);

  if (selectedSale) {
    return (
      <SaleDetail
        onBack={() => setSelectedSale(null)}
        onSaleUpdated={(sale) => {
          setSelectedSale(sale);
          setMonthSales((current) => current.map((item) => (item.id === sale.id ? sale : item)));
          loadHome();
        }}
        sale={selectedSale}
        seller={[profile, ...sellers].find((seller) => seller?.id === selectedSale.sellerId)}
        session={session}
      />
    );
  }

  if (ledgerView) {
    return (
      <HomeLedgerScreen
        loading={saleLoading}
        monthLabel={month.label}
        onBack={() => setLedgerView(null)}
        onSalePress={openSaleById}
        payments={payments}
        sales={monthSales}
        sellers={[profile, ...sellers].filter((seller): seller is ApiProfile => Boolean(seller))}
        type={ledgerView}
      />
    );
  }

  if (employeeDetailRow) {
    return (
      <EmployeeDetailScreen
        color={employeeDetailRow.color}
        commission={employeeDetailRow.commission}
        month={month}
        onBack={() => setEmployeeDetailId(null)}
        seller={employeeDetailRow.seller}
        session={session}
        sold={employeeDetailRow.sold}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadHome} />}
      style={styles.homeRoot}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.month}>{month.label}</Text>
          <Text style={styles.title}>Hola, {profile?.fullName ?? "Dueña"}</Text>
          <Text style={styles.subtitle}>Tu resumen del mes</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Elegir mi color"
            accessibilityRole="button"
            onPress={openOwnerColor}
            style={({ pressed }) => [styles.ownerColorButton, { backgroundColor: profile?.color ?? colors.violet }, pressed && styles.pressed]}
          >
            <Text style={[styles.ownerColorInitials, { color: getColorText(profile?.color ?? colors.violet) }]}>
              {getInitials(profile?.fullName ?? "Dueña")}
            </Text>
            <View style={styles.ownerColorSettingsBadge}>
              <Settings color={colors.violet} size={10} strokeWidth={2.8} />
            </View>
          </Pressable>
          <Pressable onPress={signOut} style={styles.logout}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>
      </View>

      {!report && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadHome} retrying={loading} title="No se pudo cargar el resumen" />
      ) : loading && !report ? (
        <HomeLoadingSkeleton />
      ) : (
      <>
      <LiquidCard dark style={[styles.hero, styles.homeDarkCard]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroLabelRow}>
          <IconBubble Icon={DollarSign} tone={colors.violet} />
          <Text style={styles.heroLabel}>Ingreso esperado del mes</Text>
        </View>
        <Text style={styles.heroValue}>{formatMoney(totals?.salesAmount ?? 0)}</Text>

        <View style={styles.heroGrid}>
          <MetricTile
            Icon={CheckCircle2}
            label="Cobrado"
            onPress={() => setLedgerView("collected")}
            tone={colors.mint}
            value={formatMoney(totals?.netCollectedAmount ?? 0)}
          />
          <MetricTile
            Icon={AlertCircle}
            label="Por cobrar"
            onPress={() => setLedgerView("pending")}
            tone={colors.red}
            value={formatMoney(totals?.pendingAmount ?? 0)}
          />
          <MetricTile Icon={ReceiptText} label="Gastado" tone={colors.coral} value={formatMoney(totals?.expensesAmount ?? 0)} />
        </View>
      </LiquidCard>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadHome} retrying={loading} title="No se pudo cargar el resumen" />
      ) : null}

      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.homeSectionLabel}>Empleadas</Text>
          <View style={styles.sectionActions}>
            <Users color="rgba(155,93,229,0.5)" size={15} strokeWidth={2.3} />
            <Pressable onPress={openSellerManager} style={({ pressed }) => [styles.addSellerButton, pressed && styles.pressed]}>
              <Settings color={colors.white} size={15} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>
        <View style={styles.employeeList}>
          {employeeRows.map((item) => (
            <EmployeeCard
              key={item.id}
              active={item.active}
              color={item.color}
              commission={item.commission}
              fullName={item.fullName}
              initials={item.initials}
              onPress={() => setEmployeeDetailId(item.id)}
              sold={item.sold}
            />
          ))}
          {employeeRows.length === 0 ? (
            <LiquidCard dark style={[styles.emptyCard, styles.homeDarkCard]}>
              <Text style={styles.emptyText}>Todavía no hay empleadas configuradas.</Text>
            </LiquidCard>
          ) : null}
        </View>
      </View>

      <OwnerMonthlyComparisonChart data={monthlyComparisonBars} />
      </>
      )}

      <Modal animationType="slide" transparent visible={ownerColorOpen} onRequestClose={closeOwnerColor}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeOwnerColor} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Tu color</Text>
                <Text style={styles.sheetSubtitle}>Identifica tus ventas y registros</Text>
              </View>
              <Pressable onPress={closeOwnerColor} style={styles.closeButton}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>

            <View style={styles.ownerColorContent}>
              <View style={[styles.ownerColorPreview, { backgroundColor: ownerColor }]}>
                <Text style={[styles.ownerColorPreviewText, { color: getColorText(ownerColor) }]}>
                  {getInitials(profile?.fullName ?? "Dueña")}
                </Text>
              </View>

              <View style={styles.colorRow}>
                {ownerColors.map((color) => {
                  const active = ownerColor === color;

                  return (
                    <Pressable
                      accessibilityLabel={`Seleccionar color ${color}`}
                      key={color}
                      onPress={() => setOwnerColor(color)}
                      style={({ pressed }) => [
                        styles.colorSwatch,
                        { backgroundColor: color },
                        active && styles.colorSwatchActive,
                        pressed && styles.pressed,
                      ]}
                    />
                  );
                })}
              </View>

              {ownerColorError ? <Text style={styles.formError}>{ownerColorError}</Text> : null}

              <Pressable
                disabled={savingOwnerColor}
                onPress={saveOwnerColor}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                {savingOwnerColor ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Guardar color</Text>}
              </Pressable>
            </View>
          </View>
          <SuccessToast
            detail="Se aplicará a tus ventas y registros"
            onHidden={() => {
              setOwnerColorSaved(false);
              setOwnerColorOpen(false);
            }}
            title="Color actualizado"
            visible={ownerColorSaved}
          />
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={sellerManagerOpen || selectedSeller !== null || creatingSeller} onRequestClose={closeSeller}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeSeller} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {!creatingSeller && !selectedSeller ? "Gestionar empleadas" : creatingSeller ? "Nueva empleada" : "Empleada"}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {!creatingSeller && !selectedSeller
                    ? "Crea perfiles y edita los existentes"
                    : creatingSeller
                      ? "Crea el acceso para que pueda iniciar sesion"
                      : "Datos visibles en ventas y comisiones"}
                </Text>
              </View>
              <Pressable onPress={closeSeller} style={styles.closeButton}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>

            {!creatingSeller && !selectedSeller ? (
              <View style={styles.formContent}>
                <Pressable onPress={openCreateSeller} style={({ pressed }) => [styles.managerCreateButton, pressed && styles.pressed]}>
                  <Plus color={colors.white} size={17} strokeWidth={2.6} />
                  <Text style={styles.managerCreateText}>Crear empleada</Text>
                </Pressable>

                <View style={styles.managerList}>
                  {sellers.map((seller) => {
                    const color = seller.color ?? colors.violet;

                    return (
                      <Pressable
                        key={seller.id}
                        onPress={() => openSeller(seller)}
                        style={({ pressed }) => [styles.managerItem, !seller.active && styles.managerItemInactive, pressed && styles.pressed]}
                      >
                        <View style={[styles.managerAvatar, { backgroundColor: color }]}>
                          <Text style={styles.avatarText}>{getInitials(seller.fullName)}</Text>
                        </View>
                        <View style={styles.employeeBody}>
                          <Text numberOfLines={1} style={styles.employeeName}>
                            {seller.fullName}
                          </Text>
                          <Text style={styles.employeeSold}>{seller.active ? "Activa" : "Inactiva"}</Text>
                        </View>
                        <ChevronRight color="rgba(155,93,229,0.4)" size={15} strokeWidth={2.4} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
            <View style={styles.formContent}>
              <Pressable onPress={backToSellerManager} style={({ pressed }) => [styles.backToManagerButton, pressed && styles.pressed]}>
                <ChevronRight color={colors.violet} size={14} strokeWidth={2.5} style={styles.backToManagerIcon} />
                <Text style={styles.backToManagerText}>Volver a empleadas</Text>
              </Pressable>

              <View>
                <Text style={styles.formLabel}>Nombre</Text>
                <TextInput
                  onChangeText={(value) => setSellerForm((current) => ({ ...current, fullName: value }))}
                  placeholder="Nombre de la empleada"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={sellerForm.fullName}
                />
              </View>

              {creatingSeller ? (
                <>
                  <View>
                    <Text style={styles.formLabel}>Email</Text>
                    <TextInput
                      autoCapitalize="none"
                      inputMode="email"
                      onChangeText={(value) => setSellerForm((current) => ({ ...current, email: value }))}
                      placeholder="empleada@email.com"
                      placeholderTextColor="rgba(255,255,255,0.36)"
                      style={styles.formInput}
                      value={sellerForm.email}
                    />
                  </View>

                  <View>
                    <Text style={styles.formLabel}>Contraseña inicial</Text>
                    <TextInput
                      onChangeText={(value) => setSellerForm((current) => ({ ...current, password: value }))}
                      placeholder="Minimo 6 caracteres"
                      placeholderTextColor="rgba(255,255,255,0.36)"
                      secureTextEntry
                      style={styles.formInput}
                      value={sellerForm.password}
                    />
                  </View>
                </>
              ) : null}

              <View>
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {sellerColors.map((color) => {
                    const active = sellerForm.color === color;

                    return (
                      <Pressable
                        key={color}
                        onPress={() => setSellerForm((current) => ({ ...current, color }))}
                        style={({ pressed }) => [
                          styles.colorSwatch,
                          { backgroundColor: color },
                          active && styles.colorSwatchActive,
                          pressed && styles.pressed,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={() => setSellerForm((current) => ({ ...current, active: !current.active }))}
                style={({ pressed }) => [styles.activeToggle, sellerForm.active && styles.activeToggleOn, pressed && styles.pressed]}
              >
                <Text style={[styles.activeToggleText, sellerForm.active && styles.activeToggleTextOn]}>
                  {sellerForm.active ? "Activa" : "Inactiva"}
                </Text>
              </Pressable>

              {sellerError ? <Text style={styles.formError}>{sellerError}</Text> : null}

              <Pressable disabled={savingSeller} onPress={saveSeller} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                {savingSeller ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>{creatingSeller ? "Crear empleada" : "Guardar cambios"}</Text>
                )}
              </Pressable>
            </View>
            )}
          </View>
          <SuccessToast
            detail={sellerSuccess?.detail}
            onHidden={() => setSellerSuccess(null)}
            title={sellerSuccess?.title ?? "Cambios guardados"}
            visible={sellerSuccess !== null}
          />
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function SellerHomeScreen({
  profile,
  session,
  signOut,
}: {
  profile: ApiProfile;
  session: ReturnType<typeof useAuth>["session"];
  signOut: () => Promise<void>;
}) {
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const month = currentMonthRange();
  const sellerColor = profile.color ?? colors.violet;

  const loadDashboard = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const monthEnd = new Date(month.to);
      const chartFrom = startOfMonth(new Date(monthEnd.getFullYear(), monthEnd.getMonth() - 5, 1));
      const query = new URLSearchParams({
        chartFrom: chartFrom.toISOString(),
        from: month.from,
        to: month.to,
      });
      const response = await apiRequest<SellerDashboard>(`/sales/dashboard?${query.toString()}`, {
        method: "GET",
        session,
      });

      setDashboard(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar tu resumen");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const monthlyBars = useMemo<MonthlySaleBar[]>(() => {
    const end = startOfMonth(new Date(month.to));
    const amounts = new Map(dashboard?.monthlySales.map((item) => [item.month, item.amount]) ?? []);

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(end.getFullYear(), end.getMonth() - (5 - index), 1);

      return {
        amount: amounts.get(monthKey(date)) ?? 0,
        label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date).replace(".", ""),
      };
    });
  }, [dashboard?.monthlySales, month.to]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} tintColor={sellerColor} onRefresh={loadDashboard} />}
      style={styles.homeRoot}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.month}>{month.label}</Text>
          <Text numberOfLines={1} style={styles.title}>Hola, {profile.fullName}</Text>
          <Text style={styles.subtitle}>Tu resumen del mes</Text>
        </View>
        <Pressable onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadDashboard} retrying={loading} title="No se pudo cargar tu resumen" />
      ) : null}

      {loading && !dashboard ? (
        <SellerHomeLoadingSkeleton />
      ) : dashboard ? (
        <>
          <LiquidCard dark style={[styles.hero, styles.homeDarkCard]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroLabelRow}>
              <IconBubble Icon={TrendingUp} tone={sellerColor} />
              <Text style={styles.heroLabel}>Vendido este mes</Text>
            </View>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.heroValue}>
              {formatMoney(dashboard.totals.soldAmount)}
            </Text>

            <View style={styles.heroGrid}>
              <MetricTile twoColumn Icon={DollarSign} label="Cobrado" tone={colors.mint} value={formatMoney(dashboard.totals.collectedAmount)} />
              <MetricTile twoColumn Icon={WalletCards} label="Pendiente" tone={colors.red} value={formatMoney(dashboard.totals.pendingAmount)} />
              <MetricTile twoColumn Icon={ShoppingBag} label="Ventas" tone={sellerColor} value={String(dashboard.totals.saleCount)} />
              <MetricTile twoColumn Icon={ReceiptText} label="Comisión 15%" tone={colors.coral} value={formatMoney(dashboard.totals.commissionAmount)} />
            </View>
          </LiquidCard>

          <EmployeeMonthlyBarChart color={sellerColor} data={monthlyBars} />
        </>
      ) : null}
    </ScrollView>
  );
}

function SellerHomeLoadingSkeleton() {
  return (
    <SkeletonGroup style={styles.homeSkeleton}>
      <View style={styles.homeSkeletonHero}>
        <View style={styles.homeSkeletonLabelRow}>
          <SkeletonBlock style={styles.homeSkeletonIcon} />
          <SkeletonBlock style={styles.homeSkeletonLabel} />
        </View>
        <SkeletonBlock style={styles.homeSkeletonTotal} />
        <View style={[styles.homeSkeletonMetrics, styles.sellerSkeletonMetrics]}>
          {Array.from({ length: 4 }, (_, index) => (
            <View key={index} style={[styles.homeSkeletonMetric, styles.sellerSkeletonMetric]}>
              <SkeletonBlock style={styles.homeSkeletonMetricLabel} />
              <SkeletonBlock style={styles.homeSkeletonMetricValue} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.homeSkeletonChart}>
        <SkeletonBlock style={styles.homeSkeletonChartTitle} />
        <View style={styles.homeSkeletonBars}>
          {[0.42, 0.68, 0.54, 0.82, 0.62, 0.9].map((height, index) => (
            <SkeletonBlock key={index} style={[styles.homeSkeletonBar, { height: 104 * height }]} />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

function HomeLoadingSkeleton() {
  return (
    <SkeletonGroup style={styles.homeSkeleton}>
      <View style={styles.homeSkeletonHero}>
        <View style={styles.homeSkeletonLabelRow}>
          <SkeletonBlock style={styles.homeSkeletonIcon} />
          <SkeletonBlock style={styles.homeSkeletonLabel} />
        </View>
        <SkeletonBlock style={styles.homeSkeletonTotal} />
        <View style={styles.homeSkeletonMetrics}>
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={styles.homeSkeletonMetric}>
              <SkeletonBlock style={styles.homeSkeletonMetricLabel} />
              <SkeletonBlock style={styles.homeSkeletonMetricValue} />
            </View>
          ))}
        </View>
      </View>

      <SkeletonBlock style={styles.homeSkeletonSectionTitle} />
      {Array.from({ length: 2 }, (_, index) => (
        <View key={index} style={styles.homeSkeletonEmployee}>
          <SkeletonBlock style={styles.homeSkeletonAvatar} />
          <View style={styles.homeSkeletonEmployeeBody}>
            <SkeletonBlock style={styles.homeSkeletonEmployeeName} />
            <SkeletonBlock style={styles.homeSkeletonEmployeeMeta} />
          </View>
          <SkeletonBlock style={styles.homeSkeletonEmployeeAmount} />
        </View>
      ))}

      <View style={styles.homeSkeletonChart}>
        <SkeletonBlock style={styles.homeSkeletonChartTitle} />
        <View style={styles.homeSkeletonBars}>
          {[0.54, 0.82, 0.66, 0.92].map((height, index) => (
            <SkeletonBlock key={index} style={[styles.homeSkeletonBar, { height: 104 * height }]} />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

function MetricTile({
  Icon,
  label,
  onPress,
  tone,
  twoColumn = false,
  value,
}: {
  Icon: typeof TrendingUp;
  label: string;
  onPress?: () => void;
  tone: string;
  twoColumn?: boolean;
  value: string;
}) {
  const content = (
    <View style={[styles.metricTile, styles.homeMetricTile, twoColumn && styles.sellerMetricTile]}>
      <View style={styles.metricTileHeader}>
        <Icon color={tone} size={13} strokeWidth={2.4} />
        <Text style={styles.homeMetricTileLabel}>{label}</Text>
      </View>
      <Text style={styles.homeMetricTileValue}>{value}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function EmployeeCard({
  active,
  color,
  commission,
  fullName,
  initials,
  onPress,
  sold,
}: {
  active: boolean;
  color: string;
  commission: number;
  fullName: string;
  initials: string;
  onPress: () => void;
  sold: number;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <LiquidCard dark style={[styles.employeeCard, styles.homeDarkCard, !active && styles.employeeCardInactive]}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.employeeBody}>
        <Text numberOfLines={1} style={styles.homeEmployeeName}>
          {fullName}
        </Text>
        <Text style={styles.homeEmployeeSold}>
          {active ? "Vendido" : "Inactiva"}: <Text style={[styles.employeeSoldStrong, { color }]}>{formatMoney(sold)}</Text>
        </Text>
      </View>
      <View style={styles.employeeRight}>
        <Text style={styles.homeEmployeeCommissionLabel}>Comisión 15%</Text>
        <Text style={styles.homeEmployeeCommission}>{formatMoney(commission)}</Text>
      </View>
      <ChevronRight color="rgba(155,93,229,0.4)" size={15} strokeWidth={2.4} />
      </LiquidCard>
    </Pressable>
  );
}

function HomeLedgerScreen({
  loading,
  monthLabel,
  onBack,
  onSalePress,
  payments,
  sales,
  sellers,
  type,
}: {
  loading: boolean;
  monthLabel: string;
  onBack: () => void;
  onSalePress: (saleId: string) => void;
  payments: Payment[];
  sales: Sale[];
  sellers: ApiProfile[];
  type: LedgerView;
}) {
  const pendingSales = useMemo(() => sales.filter((sale) => sale.pendingAmount > 0), [sales]);
  const salesById = useMemo(() => new Map(sales.map((sale) => [sale.id, sale])), [sales]);
  const total = type === "collected" ? payments.reduce((sum, payment) => sum + payment.amount, 0) : pendingSales.reduce((sum, sale) => sum + sale.pendingAmount, 0);
  const title = type === "collected" ? "Pagos cobrados" : "Por cobrar";
  const subtitle = type === "collected" ? "Historial de pagos del mes" : "Ventas con saldo pendiente";

  return (
    <ScreenEnter>
      <ScrollView contentContainerStyle={styles.detailContent}>
      <InternalHeader onBack={onBack} subtitle={monthLabel} title={title} />

      <LiquidCard style={styles.ledgerSummaryCard}>
        <Text style={styles.detailStatusLabel}>{subtitle}</Text>
        <Text style={styles.ledgerSummaryValue}>{formatMoney(total)}</Text>
      </LiquidCard>

      {loading ? <ActivityIndicator color={colors.violet} /> : null}

      <View>
        <SectionLabel>{type === "collected" ? "Pagos" : "Montos pendientes"}</SectionLabel>
        <View style={styles.detailSalesList}>
          {type === "collected"
            ? payments.map((payment) => {
                const sale = salesById.get(payment.saleId);
                const seller = sale ? sellers.find((item) => item.id === sale.sellerId) : undefined;
                const registeredBy = sellers.find((item) => item.id === payment.registeredBy);

                return (
                  <LedgerPaymentRow
                    key={payment.id}
                    onPress={() => onSalePress(payment.saleId)}
                    payment={payment}
                    registeredBy={registeredBy}
                    sale={sale}
                    seller={seller}
                  />
                );
              })
            : pendingSales.map((sale) => {
                const createdBy = sellers.find((item) => item.id === sale.createdBy);

                return <LedgerPendingRow key={sale.id} createdBy={createdBy} onPress={() => onSalePress(sale.id)} sale={sale} />;
              })}

          {!loading && (type === "collected" ? payments.length === 0 : pendingSales.length === 0) ? (
            <EmptyState
              description={type === "collected" ? "Los pagos que registres durante el mes aparecerán acá." : "Todas las ventas del mes están al día."}
              Icon={type === "collected" ? ReceiptText : DollarSign}
              title={type === "collected" ? "Sin pagos registrados" : "No hay montos pendientes"}
            />
          ) : null}
        </View>
      </View>
      </ScrollView>
    </ScreenEnter>
  );
}

function LedgerPaymentRow({
  onPress,
  payment,
  registeredBy,
  sale,
  seller,
}: {
  onPress: () => void;
  payment: Payment;
  registeredBy?: ApiProfile;
  sale?: Sale;
  seller?: ApiProfile;
}) {
  const personColor = registeredBy?.color ?? colors.violet;

  return (
    <LiquidCard onPress={onPress} style={[styles.ledgerRow, { borderColor: personColor }]}>
      <View style={styles.detailSaleBody}>
        <View style={styles.detailSaleHeader}>
          <Text numberOfLines={1} style={styles.detailSaleBuyer}>
            {sale?.buyerFullName ?? `Venta #${payment.saleId.slice(0, 8)}`}
          </Text>
          <Text style={[styles.detailSaleTotal, { color: colors.mint }]}>{formatMoney(payment.amount)}</Text>
        </View>
        <Text style={styles.detailSaleProducts}>{sale?.items.map((item) => item.productName).join(", ") ?? "Tocar para ver la venta"}</Text>
        <View style={styles.detailSaleFooter}>
          <Text style={styles.detailSaleDate}>{formatFullDate(payment.paidAt)}</Text>
          <Text style={styles.ledgerSellerText}>Registrado por {registeredBy?.fullName ?? seller?.fullName ?? "Vendedora"}</Text>
        </View>
      </View>
      <ChevronRight color="rgba(155,93,229,0.35)" size={15} strokeWidth={2.4} />
    </LiquidCard>
  );
}

function LedgerPendingRow({ createdBy, onPress, sale }: { createdBy?: ApiProfile; onPress: () => void; sale: Sale }) {
  const creatorColor = createdBy?.color ?? colors.violet;

  return (
    <LiquidCard onPress={onPress} style={[styles.ledgerRow, { borderColor: creatorColor }]}>
      <View style={styles.detailSaleBody}>
        <View style={styles.detailSaleHeader}>
          <Text numberOfLines={1} style={styles.detailSaleBuyer}>
            {sale.buyerFullName}
          </Text>
          <Text style={[styles.detailSaleTotal, { color: colors.red }]}>{formatMoney(sale.pendingAmount)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.detailSaleProducts}>
          {sale.items.map((item) => item.productName).join(", ")}
        </Text>
        <View style={styles.detailSaleFooter}>
          <Text style={styles.detailSaleDate}>Venta: {formatFullDate(sale.saleDate)}</Text>
          <Text style={styles.ledgerSellerText}>Creada por {createdBy?.fullName ?? "Usuario"}</Text>
        </View>
      </View>
      <ChevronRight color="rgba(155,93,229,0.35)" size={15} strokeWidth={2.4} />
    </LiquidCard>
  );
}

function HomeSaleDetailScreen({ onBack, sale, seller }: { onBack: () => void; sale: Sale; seller?: ApiProfile }) {
  const sellerColor = seller?.color ?? colors.violet;

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.detailBackButton, pressed && styles.pressed]}>
          <ChevronRight color={colors.violet} size={17} strokeWidth={2.6} style={styles.detailBackIcon} />
        </Pressable>
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailTitle}>Venta #{sale.id.slice(0, 8)}</Text>
          <Text style={styles.detailSubtitle}>{formatFullDate(sale.saleDate)}</Text>
        </View>
      </View>

      <LiquidCard style={styles.detailStatusCard}>
        <View style={[styles.detailStatusStripe, { backgroundColor: sellerColor }]} />
        <View style={styles.detailStatusBody}>
          <Text style={styles.detailStatusLabel}>Compradora</Text>
          <Text style={styles.detailStatusValue}>{sale.buyerFullName}</Text>
          <Text style={styles.detailStatusText}>{sale.buyerPhone}</Text>
        </View>
      </LiquidCard>

      <LiquidCard style={styles.saleAmountsCard}>
        <AmountLine color={colors.foreground} label="Total" value={sale.totalAmount} />
        <AmountLine color={colors.mint} label="Cobrado" value={sale.paidAmount} />
        <AmountLine color={colors.red} label="Pendiente" value={sale.pendingAmount} />
      </LiquidCard>

      <View>
        <SectionLabel>Productos</SectionLabel>
        <View style={styles.detailSalesList}>
          {sale.items.map((item) => (
            <LiquidCard key={item.id} style={styles.saleProductRow}>
              <View>
                <Text style={styles.detailSaleBuyer}>{item.productName}</Text>
                <Text style={styles.detailSaleProducts}>Talle {item.productSize}</Text>
              </View>
              <Text style={styles.detailSaleTotal}>{formatMoney(item.salePrice)}</Text>
            </LiquidCard>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function AmountLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.amountLine}>
      <Text style={styles.amountLineLabel}>{label}</Text>
      <Text style={[styles.amountLineValue, { color }]}>{formatMoney(value)}</Text>
    </View>
  );
}

function EmployeeDetailScreen({
  color,
  commission,
  month,
  onBack,
  seller,
  session,
  sold,
}: {
  color: string;
  commission: number;
  month: ReturnType<typeof currentMonthRange>;
  onBack: () => void;
  seller: ApiProfile;
  session: ReturnType<typeof useAuth>["session"];
  sold: number;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthlySales, setMonthlySales] = useState<Sale[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const loadSales = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const query = new URLSearchParams({
        from: month.from,
        sellerId: seller.id,
        to: month.to,
      });
      const chartFrom = startOfMonth(new Date(new Date(month.to).getFullYear(), new Date(month.to).getMonth() - 5, 1));
      const chartQuery = new URLSearchParams({
        from: chartFrom.toISOString(),
        sellerId: seller.id,
        to: month.to,
      });
      const [response, chartResponse] = await Promise.all([
        apiRequest<SalesResponse>(`/sales?${query.toString()}`, { method: "GET", session }),
        apiRequest<SalesResponse>(`/sales?${chartQuery.toString()}`, { method: "GET", session }),
      ]);
      setSales(response.items);
      setMonthlySales(chartResponse.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las ventas");
    } finally {
      setLoading(false);
    }
  }, [month.from, month.to, seller.id, session]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const monthlyBars = useMemo<MonthlySaleBar[]>(() => {
    const end = startOfMonth(new Date(month.to));
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(end.getFullYear(), end.getMonth() - (5 - index), 1);

      return {
        amount: 0,
        key: monthKey(date),
        label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date).replace(".", ""),
      };
    });
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    monthlySales.forEach((sale) => {
      const bucket = byKey.get(monthKey(new Date(sale.saleDate)));

      if (bucket) {
        bucket.amount += sale.totalAmount;
      }
    });

    return buckets.map(({ amount, label }) => ({ amount, label }));
  }, [month.to, monthlySales]);

  return (
    <ScreenEnter>
      <ScrollView
        contentContainerStyle={styles.detailContent}
        refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadSales} />}
      >
      <InternalHeader
        accessory={
          <View style={[styles.detailAvatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{getInitials(seller.fullName)}</Text>
          </View>
        }
        onBack={onBack}
        subtitle={`Ventas de ${month.label}`}
        title={seller.fullName}
      />

      <View style={styles.detailKpiGrid}>
        <DetailMetric label="Total vendido" value={formatMoney(sold)} />
        <DetailMetric label="Comision 15%" value={formatMoney(commission)} valueColor={color} />
      </View>

      <LiquidCard style={styles.detailStatusCard}>
        <View style={[styles.detailStatusStripe, { backgroundColor: color }]} />
        <View style={styles.detailStatusBody}>
          <Text style={styles.detailStatusLabel}>Estado del perfil</Text>
          <Text style={styles.detailStatusValue}>{seller.active ? "Activa" : "Inactiva"}</Text>
          <Text style={styles.detailStatusText}>
            {seller.active ? "Puede registrar ventas y aparece en los selectores." : "No aparece como vendedora activa para nuevas ventas."}
          </Text>
        </View>
      </LiquidCard>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadSales} retrying={loading} title="No se pudo cargar el detalle" />
      ) : null}

      <View>
        <SectionLabel>Ventas realizadas</SectionLabel>
        <View style={styles.detailSalesList}>
          {sales.map((sale) => (
            <EmployeeSaleRow key={sale.id} color={color} sale={sale} />
          ))}
          {!loading && sales.length === 0 ? (
            <EmptyState
              description={`Las ventas de ${seller.fullName} durante ${month.label} aparecerán acá.`}
              Icon={ReceiptText}
              title="Sin ventas este mes"
            />
          ) : null}
        </View>
      </View>

      <EmployeeMonthlyBarChart color={color} data={monthlyBars} />
      </ScrollView>
    </ScreenEnter>
  );
}

function DetailMetric({ label, value, valueColor = colors.foreground }: { label: string; value: string; valueColor?: string }) {
  return (
    <LiquidCard style={styles.detailMetric}>
      <Text style={styles.detailMetricLabel}>{label}</Text>
      <Text style={[styles.detailMetricValue, { color: valueColor }]}>{value}</Text>
    </LiquidCard>
  );
}

function EmployeeSaleRow({ color, sale }: { color: string; sale: Sale }) {
  return (
    <LiquidCard style={styles.detailSaleCard}>
      <View style={[styles.detailSaleStripe, { backgroundColor: color }]} />
      <View style={styles.detailSaleBody}>
        <View style={styles.detailSaleHeader}>
          <Text numberOfLines={1} style={styles.detailSaleBuyer}>
            {sale.buyerFullName}
          </Text>
          <Text style={styles.detailSaleTotal}>{formatMoney(sale.totalAmount)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.detailSaleProducts}>
          {sale.items.map((item) => item.productName).join(", ")}
        </Text>
        <View style={styles.detailSaleFooter}>
          <Text style={styles.detailSaleDate}>{formatDate(sale.saleDate)}</Text>
          <View style={[styles.paymentPill, { borderColor: `${paymentTones[sale.paymentStatus]}55` }]}>
            <Text style={[styles.paymentPillText, { color: paymentTones[sale.paymentStatus] }]}>{paymentLabels[sale.paymentStatus]}</Text>
          </View>
        </View>
      </View>
    </LiquidCard>
  );
}

function EmployeeMonthlyBarChart({ color, data }: { color: string; data: MonthlySaleBar[] }) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <View>
      <SectionLabel>Ventas por mes</SectionLabel>
      <LiquidCard style={styles.monthlyChartCard}>
        <View style={styles.monthlyChart}>
          {data.map((item) => {
            const height = Math.max(8, Math.round((item.amount / maxAmount) * 112));

            return (
              <View key={item.label} style={styles.monthlyBarItem}>
                <Text numberOfLines={1} style={styles.monthlyBarValue}>
                  {item.amount > 0 ? formatMoney(item.amount) : "$0"}
                </Text>
                <View style={styles.monthlyBarTrack}>
                  <View style={[styles.monthlyBarFill, { backgroundColor: color, height }]} />
                </View>
                <Text style={styles.monthlyBarLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </LiquidCard>
    </View>
  );
}

function OwnerMonthlyComparisonChart({ data }: { data: ComparisonSaleBar[] }) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <View>
      <Text style={styles.homeSectionLabel}>Ventas del mes</Text>
      <LiquidCard dark style={[styles.ownerComparisonCard, styles.homeDarkCard]}>
        <View style={styles.ownerComparisonList}>
          {data.map((item) => {
            const height = Math.max(8, Math.round((item.amount / maxAmount) * 122));

            return (
              <View key={item.id} style={styles.ownerComparisonItem}>
                <Text numberOfLines={1} style={styles.homeOwnerComparisonAmount}>
                  {formatMoney(item.amount)}
                </Text>
                <View style={styles.ownerComparisonTrack}>
                  <View style={[styles.ownerComparisonFill, { backgroundColor: item.color, height }]} />
                </View>
                <View style={styles.ownerComparisonName}>
                  <View style={[styles.ownerComparisonDot, { backgroundColor: item.color }]} />
                  <Text numberOfLines={1} style={styles.homeOwnerComparisonLabel}>
                    {item.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </LiquidCard>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  homeRoot: {
    backgroundColor: "#050505",
  },
  homeDarkCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000000",
    shadowOpacity: 0.32,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  ownerColorButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    width: 42,
  },
  ownerColorInitials: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900",
  },
  ownerColorSettingsBadge: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: -4,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 18,
  },
  month: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  subtitle: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 13,
    marginTop: 2,
  },
  logout: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  hero: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
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
    backgroundColor: "rgba(255,255,255,0.07)",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "800",
  },
  heroValue: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 40,
    marginBottom: 20,
  },
  heroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricTile: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    padding: 14,
  },
  metricTileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  metricTileLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricTileValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  homeMetricTile: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  sellerMetricTile: {
    flexBasis: "42%",
  },
  homeMetricTileLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeMetricTileValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  homeSectionLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  loading: {
    alignItems: "center",
    paddingVertical: 12,
  },
  homeSkeleton: {
    gap: 14,
  },
  homeSkeletonHero: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
  },
  homeSkeletonLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  homeSkeletonIcon: {
    borderRadius: 14,
    height: 38,
    width: 38,
  },
  homeSkeletonLabel: {
    height: 11,
    width: 132,
  },
  homeSkeletonTotal: {
    height: 36,
    marginTop: 18,
    width: "58%",
  },
  homeSkeletonMetrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  sellerSkeletonMetrics: {
    flexWrap: "wrap",
  },
  homeSkeletonMetric: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  sellerSkeletonMetric: {
    flexBasis: "42%",
  },
  homeSkeletonMetricLabel: {
    height: 9,
    width: "68%",
  },
  homeSkeletonMetricValue: {
    height: 18,
    marginTop: 10,
    width: "86%",
  },
  homeSkeletonSectionTitle: {
    height: 10,
    marginTop: 4,
    width: 72,
  },
  homeSkeletonEmployee: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  homeSkeletonAvatar: {
    borderRadius: 999,
    height: 46,
    width: 46,
  },
  homeSkeletonEmployeeBody: {
    flex: 1,
    gap: 8,
  },
  homeSkeletonEmployeeName: {
    height: 13,
    width: "62%",
  },
  homeSkeletonEmployeeMeta: {
    height: 10,
    width: "42%",
  },
  homeSkeletonEmployeeAmount: {
    height: 18,
    width: 68,
  },
  homeSkeletonChart: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    height: 210,
    marginTop: 4,
    padding: 18,
  },
  homeSkeletonChartTitle: {
    height: 11,
    width: "44%",
  },
  homeSkeletonBars: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
    paddingTop: 22,
  },
  homeSkeletonBar: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: 20,
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
  sectionActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  addSellerButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    width: 30,
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
  employeeCardInactive: {
    opacity: 0.62,
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
    color: "rgba(255,255,255,0.6)",
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
    color: "rgba(255,255,255,0.5)",
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
  homeEmployeeName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  homeEmployeeSold: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    marginTop: 3,
  },
  homeEmployeeCommissionLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  homeEmployeeCommission: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  ownerComparisonCard: {
    padding: 16,
  },
  ownerComparisonList: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    minHeight: 186,
  },
  ownerComparisonItem: {
    alignItems: "center",
    flex: 1,
    gap: 7,
  },
  ownerComparisonName: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    maxWidth: 64,
  },
  ownerComparisonDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  ownerComparisonLabel: {
    color: "rgba(255,255,255,0.58)",
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  ownerComparisonAmount: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    minHeight: 24,
    textAlign: "center",
  },
  homeOwnerComparisonLabel: {
    color: "rgba(255,255,255,0.64)",
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeOwnerComparisonAmount: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "900",
    minHeight: 24,
    textAlign: "center",
  },
  ownerComparisonTrack: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    height: 128,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 18,
  },
  ownerComparisonFill: {
    borderRadius: 999,
    minHeight: 8,
    opacity: 0.9,
    width: "100%",
  },
  emptyCard: {
    padding: 18,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 13,
    lineHeight: 19,
  },
  detailContent: {
    gap: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  detailBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  detailBackIcon: {
    transform: [{ rotate: "180deg" }],
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  detailSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 2,
  },
  detailAvatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    width: 44,
  },
  detailKpiGrid: {
    flexDirection: "row",
    gap: 12,
  },
  detailMetric: {
    flex: 1,
    padding: 16,
  },
  detailMetricLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  detailMetricValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  detailStatusCard: {
    flexDirection: "row",
    gap: 13,
    padding: 16,
  },
  detailStatusStripe: {
    borderRadius: 999,
    width: 4,
  },
  detailStatusBody: {
    flex: 1,
  },
  detailStatusLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailStatusValue: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  detailStatusText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  detailSalesList: {
    gap: 12,
  },
  ledgerSummaryCard: {
    padding: 18,
  },
  ledgerSummaryValue: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },
  ledgerRow: {
    alignItems: "center",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  ledgerSellerText: {
    color: "rgba(255,255,255,0.52)",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  detailSaleCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  detailSaleStripe: {
    borderRadius: 999,
    width: 4,
  },
  detailSaleBody: {
    flex: 1,
    minWidth: 0,
  },
  detailSaleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  detailSaleBuyer: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  detailSaleTotal: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  detailSaleProducts: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
    marginTop: 5,
  },
  detailSaleFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  detailSaleDate: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  paymentPill: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  paymentPillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  saleAmountsCard: {
    gap: 10,
    padding: 16,
  },
  amountLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLineLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  amountLineValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  saleProductRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  monthlyChartCard: {
    padding: 16,
  },
  monthlyChart: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    minHeight: 170,
  },
  monthlyBarItem: {
    alignItems: "center",
    flex: 1,
    gap: 7,
  },
  monthlyBarValue: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    maxWidth: 50,
    minHeight: 24,
    textAlign: "center",
  },
  monthlyBarTrack: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    height: 118,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 18,
  },
  monthlyBarFill: {
    borderRadius: 999,
    minHeight: 8,
    opacity: 0.9,
    width: "100%",
  },
  monthlyBarLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.72)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.22)",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(155,93,229,0.24)",
    borderRadius: 999,
    height: 4,
    marginBottom: 16,
    width: 42,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.foreground,
    fontSize: 21,
    fontWeight: "900",
  },
  sheetSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.12)",
    borderColor: "rgba(155,93,229,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeText: {
    color: colors.violet,
    fontSize: 13,
    fontWeight: "900",
  },
  formContent: {
    gap: 15,
    paddingBottom: 28,
  },
  ownerColorContent: {
    alignItems: "center",
    gap: 18,
    paddingBottom: 30,
  },
  ownerColorPreview: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    width: 58,
  },
  ownerColorPreviewText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  managerCreateButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 20,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: colors.violet,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
  },
  managerCreateText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  managerList: {
    gap: 10,
  },
  managerItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 58,
    padding: 12,
  },
  managerItemInactive: {
    opacity: 0.62,
  },
  managerAvatar: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  backToManagerButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  backToManagerIcon: {
    transform: [{ rotate: "180deg" }],
  },
  backToManagerText: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900",
  },
  formLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  formInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 48,
    paddingHorizontal: 13,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    width: 34,
  },
  colorSwatchActive: {
    borderColor: colors.foreground,
    transform: [{ scale: 1.08 }],
  },
  activeToggle: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.1)",
    borderColor: "rgba(224,82,113,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  activeToggleOn: {
    backgroundColor: "rgba(52,211,153,0.12)",
    borderColor: "rgba(52,211,153,0.25)",
  },
  activeToggleText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "900",
  },
  activeToggleTextOn: {
    color: colors.mint,
  },
  formError: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 54,
    shadowColor: colors.violet,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
