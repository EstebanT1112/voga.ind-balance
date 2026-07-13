import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
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
import {
  CheckCircle2,
  Calendar,
  ChevronRight,
  CreditCard,
  DollarSign,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import {
  ErrorState,
  GlassBadge,
  InternalHeader,
  LiquidCard,
  ScreenEnter,
  SectionLabel,
  SkeletonBlock,
  SkeletonGroup,
  SuccessToast,
} from "../components/Liquid";
import { apiRequest } from "../lib/api";
import { getProductPhotoUrl } from "../products/productPhotos";
import type { Product, ProductCategory, ProductsResponse } from "../products/product.types";
import type { ApiProfile, UsersResponse } from "../reports/report.types";
import type { Payment, PaymentsResponse } from "../payments/payment.types";
import type { CreateReturnInput, ReturnsResponse, SaleReturn } from "../returns/return.types";
import type { CreateSaleInput, PaymentStatus, Sale, SaleItem, SalesResponse } from "../sales/sale.types";
import { colors, formatMoney } from "../theme/liquid";

type SalesTab = "new" | "history";
type ProductSelectionView = "list" | "catalog";
type HistorySearchTarget = "buyer" | "seller" | null;
type CalendarSelectionMode = "single" | "range";

const categories: Array<{ label: string; value: ProductCategory | "all" }> = [
  { label: "Todas", value: "all" },
  { label: "Superior", value: "upper" },
  { label: "Inferior", value: "lower" },
  { label: "Lenceria", value: "lingerie" },
];

const categoryLabels: Record<ProductCategory, string> = {
  lingerie: "Lenceria",
  lower: "Inferior",
  upper: "Superior",
};

const paymentLabels: Record<PaymentStatus, string> = {
  overdue: "Vencida",
  paid: "Pagada",
  partial: "Parcial",
  unpaid: "Pendiente",
};

const paymentTones: Record<PaymentStatus, string> = {
  overdue: colors.red,
  paid: colors.mint,
  partial: colors.coral,
  unpaid: colors.violet,
};

const initialForm = {
  buyerFullName: "",
  buyerPhone: "",
  initialPaymentAmount: "",
  sellerId: "",
};

const initialPaymentForm = {
  amount: "",
  note: "",
};

const initialReturnForm = {
  reason: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatDateForSearch(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return [`${day}/${month}/${year}`, `${year}-${month}-${day}`, `${day}/${month}`, formatDate(value).toLowerCase()].join(" ");
}

function formatCalendarDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear());

  return `${day}/${month}/${year}`;
}

function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);

  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

function parseCalendarRange(value: string): { from: Date; to: Date } | null {
  const match = /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const firstValue = match[1];
  const secondValue = match[2];

  if (!firstValue || !secondValue) {
    return null;
  }

  const firstDate = parseCalendarDate(firstValue);
  const secondDate = parseCalendarDate(secondValue);

  if (!firstDate || !secondDate) {
    return null;
  }

  return firstDate.getTime() <= secondDate.getTime()
    ? { from: firstDate, to: secondDate }
    : { from: secondDate, to: firstDate };
}

function getDayTimestamp(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function getCalendarDays(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAfterDay(a: Date, b: Date): boolean {
  const left = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const right = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();

  return left > right;
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDaysFromToday(value: string): number {
  const start = new Date(value);
  const today = new Date();
  const diff = today.getTime() - start.getTime();

  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function SalesScreen({ onChromeHiddenChange }: { onChromeHiddenChange?: (hidden: boolean) => void } = {}) {
  const { profile, session } = useAuth();
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productSelectionView, setProductSelectionView] = useState<ProductSelectionView>("catalog");
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesTab, setSalesTab] = useState<SalesTab>("new");
  const [saving, setSaving] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historySearchTarget, setHistorySearchTarget] = useState<HistorySearchTarget>(null);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [sellers, setSellers] = useState<ApiProfile[]>([]);
  const successFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.86)).current;
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSales = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<SalesResponse>("/sales", {
        method: "GET",
        session,
      });

      setSales(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las ventas");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const loadAvailableProducts = useCallback(async () => {
    if (!session) {
      return;
    }

    setProductsLoading(true);
    setProductsError(null);

    try {
      const response = await apiRequest<ProductsResponse>("/products?status=available", {
        method: "GET",
        session,
      });

      setAvailableProducts(response.items);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "No se pudieron cargar los productos disponibles");
    } finally {
      setProductsLoading(false);
    }
  }, [session]);

  const loadSellers = useCallback(async () => {
    if (!session || !profile) {
      return;
    }

    if (profile.role === "seller") {
      setSellers([profile]);
      setForm((current) => ({ ...current, sellerId: profile.id }));
      return;
    }

    const response = await apiRequest<UsersResponse>("/users", {
      method: "GET",
      session,
    });
    const profiles = [profile, ...response.items.filter((item) => item.id !== profile.id)];

    setSellers(profiles);
    setForm((current) => (current.sellerId ? current : { ...current, sellerId: profile.id }));
  }, [profile, session]);

  useEffect(() => {
    loadSales();
    loadAvailableProducts();
    loadSellers();
  }, [loadAvailableProducts, loadSales, loadSellers]);

  useEffect(() => {
    onChromeHiddenChange?.(selectedSale !== null);

    return () => {
      onChromeHiddenChange?.(false);
    };
  }, [onChromeHiddenChange, selectedSale]);

  useEffect(() => {
    if (!createdSale) {
      return;
    }

    successFade.setValue(0);
    successScale.setValue(0.86);

    Animated.parallel([
      Animated.timing(successFade, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        damping: 12,
        mass: 0.75,
        stiffness: 150,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    successTimeout.current = setTimeout(() => {
      Animated.timing(successFade, {
        duration: 260,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(() => setCreatedSale(null));
    }, 1550);

    return () => {
      if (successTimeout.current) {
        clearTimeout(successTimeout.current);
        successTimeout.current = null;
      }
    };
  }, [createdSale, successFade, successScale]);

  const selectedProducts = useMemo(
    () => availableProducts.filter((product) => selectedProductIds.includes(product.id)),
    [availableProducts, selectedProductIds],
  );

  const selectedTotal = useMemo(
    () => selectedProducts.reduce((sum, product) => sum + product.salePrice, 0),
    [selectedProducts],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return availableProducts.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.size, product.subcategory ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, category, search]);

  const filteredSales = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLowerCase();
    const selectedRange = parseCalendarRange(historySearch);

    if (!normalizedSearch) {
      return sales;
    }

    return sales.filter((sale) => {
      if (selectedRange) {
        const saleDay = getDayTimestamp(new Date(sale.saleDate));
        return saleDay >= getDayTimestamp(selectedRange.from) && saleDay <= getDayTimestamp(selectedRange.to);
      }

      const seller = sellers.find((item) => item.id === sale.sellerId);
      const searchValues =
        historySearchTarget === "buyer"
          ? [sale.buyerFullName]
          : historySearchTarget === "seller"
            ? [seller?.fullName ?? ""]
            : [sale.buyerFullName, seller?.fullName ?? ""];
      const matchesSearch = !normalizedSearch || searchValues.some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesDate = formatDateForSearch(sale.saleDate).includes(normalizedSearch);

      return matchesSearch || matchesDate;
    });
  }, [historySearch, historySearchTarget, sales, sellers]);

  const resetForm = () => {
    setForm({ ...initialForm, sellerId: profile?.id ?? "" });
    setFormError(null);
    setSelectedProductIds([]);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  };

  const closeCart = () => {
    if (saving) {
      return;
    }

    setCartOpen(false);
  };

  const createSale = async () => {
    if (!session || !profile) {
      return;
    }

    const initialPaymentAmount = Number.parseInt(form.initialPaymentAmount || "0", 10);

    if (!form.buyerFullName.trim() || !form.buyerPhone.trim()) {
      setFormError("Completá nombre y teléfono de la compradora.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setFormError("Seleccioná al menos un producto.");
      return;
    }

    if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount < 0) {
      setFormError("El monto entregado debe ser un número válido.");
      return;
    }

    if (initialPaymentAmount > selectedTotal) {
      setFormError("El monto entregado no puede superar el total de la venta.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload: CreateSaleInput = {
        buyerFullName: form.buyerFullName.trim(),
        buyerPhone: form.buyerPhone.trim(),
        initialPaymentAmount,
        productIds: selectedProductIds,
        sellerId: profile.role === "owner" ? form.sellerId || undefined : undefined,
      };

      const response = await apiRequest<{ item: Sale }>("/sales", {
        body: payload,
        method: "POST",
        session,
      });

      setCartOpen(false);
      resetForm();
      setSalesTab("history");
      setSales((current) => [response.item, ...current.filter((sale) => sale.id !== response.item.id)]);
      setCreatedSale(response.item);
      await Promise.all([loadSales(), loadAvailableProducts()]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la venta");
    } finally {
      setSaving(false);
    }
  };

  if (selectedSale) {
    return (
      <SaleDetail
        sale={selectedSale}
        seller={sellers.find((seller) => seller.id === selectedSale.sellerId)}
        session={session}
        onBack={() => setSelectedSale(null)}
        onSaleUpdated={(sale) => {
          setSelectedSale(sale);
          setSales((current) => current.map((item) => (item.id === sale.id ? sale : item)));
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, salesTab === "new" && styles.contentWithSummary]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={salesTab === "history" ? loading : productsLoading}
            tintColor={colors.violet}
            onRefresh={salesTab === "history" ? loadSales : loadAvailableProducts}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ventas</Text>
          <View style={styles.segmented}>
            {[
              { label: "Nueva venta", value: "new" as const },
              { label: "Registro", value: "history" as const },
            ].map((item) => {
              const active = salesTab === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setSalesTab(item.value)}
                  style={({ pressed }) => [styles.segmentButton, active && styles.segmentButtonActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {salesTab === "new" ? (
          <NewSaleContent
            category={category}
            filteredProducts={filteredProducts}
            formError={formError}
            productsLoading={productsLoading}
            productsError={productsError}
            productSelectionView={productSelectionView}
            search={search}
            selectedProductIds={selectedProductIds}
            setCategory={setCategory}
            setProductSelectionView={setProductSelectionView}
            setSearch={setSearch}
            toggleProduct={toggleProduct}
            onRetry={loadAvailableProducts}
          />
        ) : (
          <HistoryContent
            errorMessage={errorMessage}
            filteredCount={filteredSales.length}
            historySearch={historySearch}
            historySearchTarget={historySearchTarget}
            loading={loading}
            onRetry={loadSales}
            onSalePress={setSelectedSale}
            sales={filteredSales}
            setHistorySearch={setHistorySearch}
            setHistorySearchTarget={setHistorySearchTarget}
            sellers={sellers}
            totalCount={sales.length}
          />
        )}
      </ScrollView>

      {salesTab === "new" ? (
        <View style={styles.saleSummaryDock}>
          <View style={styles.saleSummaryMetric}>
            <Text style={styles.saleSummaryLabel}>Productos</Text>
            <Text style={styles.saleSummaryCount}>{selectedProductIds.length}</Text>
          </View>
          <View style={styles.saleSummaryDivider} />
          <View style={styles.saleSummaryTotalWrap}>
            <Text style={styles.saleSummaryLabel}>Total</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.saleSummaryTotal}>
              {formatMoney(selectedTotal)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Revisar venta"
            accessibilityRole="button"
            disabled={selectedProductIds.length === 0}
            onPress={() => setCartOpen(true)}
            style={({ pressed }) => [
              styles.saleSummaryButton,
              selectedProductIds.length === 0 && styles.saleSummaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <ShoppingCart color={colors.white} size={19} strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : null}

      <Modal animationType="slide" transparent visible={cartOpen} onRequestClose={closeCart}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeCart} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Crear venta</Text>
              <Pressable onPress={closeCart} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.cartItems}>
                {selectedProducts.map((product) => (
                  <CartItem key={product.id} product={product} onRemove={() => toggleProduct(product.id)} />
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatMoney(selectedTotal)}</Text>
              </View>

              <FormField Icon={User} label="Nombre y apellido">
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, buyerFullName: value }))}
                  placeholder="Ej: Camila Suarez"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.buyerFullName}
                />
              </FormField>

              <FormField Icon={Phone} label="Teléfono">
                <TextInput
                  inputMode="tel"
                  onChangeText={(value) => setForm((current) => ({ ...current, buyerPhone: value }))}
                  placeholder="+54 9 11..."
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.buyerPhone}
                />
              </FormField>

              <FormField Icon={DollarSign} label="Monto entregado">
                <TextInput
                  inputMode="numeric"
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, initialPaymentAmount: value.replace(/\D/g, "") }))
                  }
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.initialPaymentAmount}
                />
              </FormField>

              <View>
                <Text style={styles.formLabel}>{profile?.role === "owner" ? "Vendedora" : "Venta registrada por"}</Text>
                {profile?.role === "owner" ? (
                  <View style={styles.sellerPicker}>
                    {sellers
                      .filter((seller) => seller.active && (seller.role === "seller" || seller.id === profile.id))
                      .map((seller) => {
                        const active = form.sellerId === seller.id;

                        return (
                          <Pressable
                            key={seller.id}
                            onPress={() => setForm((current) => ({ ...current, sellerId: seller.id }))}
                            style={({ pressed }) => [styles.sellerOption, active && styles.sellerOptionActive, pressed && styles.pressed]}
                          >
                            <Avatar color={seller.color ?? colors.violet} initials={getInitials(seller.fullName)} size={26} />
                            <Text numberOfLines={1} style={[styles.sellerOptionText, active && styles.sellerOptionTextActive]}>
                              {seller.id === profile.id ? `${seller.fullName} (yo)` : seller.fullName}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                ) : profile ? (
                  <View style={[styles.sellerOption, styles.sellerOptionActive]}>
                    <Avatar color={profile.color ?? colors.violet} initials={getInitials(profile.fullName)} size={26} />
                    <Text numberOfLines={1} style={[styles.sellerOptionText, styles.sellerOptionTextActive]}>
                      {profile.fullName}
                    </Text>
                  </View>
                ) : null}
              </View>

              {form.initialPaymentAmount !== "" ? (
                <View style={styles.statusPreview}>
                  <Text style={styles.statusPreviewText}>Estado:</Text>
                  <GlassBadge
                    label={paymentLabels[getPreviewPaymentStatus(selectedTotal, Number.parseInt(form.initialPaymentAmount || "0", 10))]}
                    tone={paymentTones[getPreviewPaymentStatus(selectedTotal, Number.parseInt(form.initialPaymentAmount || "0", 10))]}
                  />
                </View>
              ) : null}

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Pressable disabled={saving} onPress={createSale} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar venta</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {createdSale ? (
        <Animated.View pointerEvents="none" style={[styles.creationOverlay, { opacity: successFade }]}>
          <Animated.View style={[styles.creationToast, { transform: [{ scale: successScale }] }]}>
            <View style={styles.creationIconWrap}>
              <CheckCircle2 color={colors.white} size={34} strokeWidth={2.6} />
            </View>
            <Text style={styles.creationTitle}>Venta registrada</Text>
            <Text style={styles.creationAmount}>{formatMoney(createdSale.totalAmount)}</Text>
            <View
              style={[
                styles.creationStatus,
                { backgroundColor: `${paymentTones[createdSale.paymentStatus]}18` },
              ]}
            >
              <Text style={[styles.creationStatusText, { color: paymentTones[createdSale.paymentStatus] }]}>
                {paymentLabels[createdSale.paymentStatus]}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function getPreviewPaymentStatus(total: number, paid: number): PaymentStatus {
  if (paid >= total) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "unpaid";
}

function NewSaleContent({
  category,
  filteredProducts,
  formError,
  productsLoading,
  productsError,
  productSelectionView,
  search,
  selectedProductIds,
  setCategory,
  setProductSelectionView,
  setSearch,
  toggleProduct,
  onRetry,
}: {
  category: ProductCategory | "all";
  filteredProducts: Product[];
  formError: string | null;
  productsLoading: boolean;
  productsError: string | null;
  productSelectionView: ProductSelectionView;
  search: string;
  selectedProductIds: string[];
  setCategory: (category: ProductCategory | "all") => void;
  setProductSelectionView: (view: ProductSelectionView) => void;
  setSearch: (search: string) => void;
  toggleProduct: (productId: string) => void;
  onRetry: () => void;
}) {
  return (
    <>
      <View style={styles.searchBox}>
        <Search color="rgba(155,93,229,0.52)" size={17} strokeWidth={2.2} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Buscar producto..."
          placeholderTextColor="rgba(255,255,255,0.36)"
          style={styles.searchInput}
          value={search}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {categories.map((item) => {
          const active = item.value === category;

          return (
            <Pressable
              key={item.value}
              onPress={() => setCategory(item.value)}
              style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.viewToggle}>
        {[
          { label: "Catalogo", value: "catalog" as const },
          { label: "Lista", value: "list" as const },
        ].map((item) => {
          const active = item.value === productSelectionView;

          return (
            <Pressable
              key={item.value}
              onPress={() => setProductSelectionView(item.value)}
              style={({ pressed }) => [styles.viewToggleButton, active && styles.viewToggleButtonActive, pressed && styles.pressed]}
            >
              <Text style={[styles.viewToggleText, active && styles.viewToggleTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {productsLoading && filteredProducts.length === 0 ? (
        <ProductSelectionSkeleton view={productSelectionView} />
      ) : productSelectionView === "list" ? (
        <View style={styles.productList}>
          {filteredProducts.map((product) => (
            <ProductOption
              key={product.id}
              product={product}
              selected={selectedProductIds.includes(product.id)}
              onPress={() => toggleProduct(product.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.catalogProductGrid}>
          {filteredProducts.map((product) => (
            <CatalogProductOption
              key={product.id}
              product={product}
              selected={selectedProductIds.includes(product.id)}
              onPress={() => toggleProduct(product.id)}
            />
          ))}
        </View>
      )}

      {!productsLoading && !productsError && filteredProducts.length === 0 ? (
        <LiquidCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin productos disponibles</Text>
          <Text style={styles.emptyText}>Los productos disponibles para vender van a aparecer en esta sección.</Text>
        </LiquidCard>
      ) : null}
      {productsError ? (
        <ErrorState
          message={productsError}
          onRetry={onRetry}
          retrying={productsLoading}
          title="No se pudieron cargar los productos"
        />
      ) : null}
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    </>
  );
}

function HistoryContent({
  errorMessage,
  filteredCount,
  historySearch,
  historySearchTarget,
  loading,
  onRetry,
  onSalePress,
  sales,
  setHistorySearch,
  setHistorySearchTarget,
  sellers,
  totalCount,
}: {
  errorMessage: string | null;
  filteredCount: number;
  historySearch: string;
  historySearchTarget: HistorySearchTarget;
  loading: boolean;
  onRetry: () => void;
  onSalePress: (sale: Sale) => void;
  sales: Sale[];
  setHistorySearch: (search: string) => void;
  setHistorySearchTarget: (target: HistorySearchTarget) => void;
  sellers: ApiProfile[];
  totalCount: number;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarSelectionMode>("single");
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const today = useMemo(() => new Date(), []);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(visibleMonth);
  const canGoNextMonth =
    visibleMonth.getFullYear() < today.getFullYear() ||
    (visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() < today.getMonth());

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const openCalendar = () => {
    const currentRange = parseCalendarRange(historySearch);
    const currentDate = parseCalendarDate(historySearch);

    if (currentRange) {
      setCalendarMode("range");
      setRangeStart(currentRange.from);
      setRangeEnd(currentRange.to);
      setVisibleMonth(new Date(currentRange.to.getFullYear(), currentRange.to.getMonth(), 1));
    } else {
      setCalendarMode("single");
      setRangeStart(currentDate);
      setRangeEnd(null);

      if (currentDate) {
        setVisibleMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      }
    }

    setCalendarOpen(true);
  };

  const selectCalendarDate = (date: Date) => {
    if (calendarMode === "single") {
      setHistorySearch(formatCalendarDate(date));
      setRangeStart(date);
      setRangeEnd(null);
      setCalendarOpen(false);
      return;
    }

    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    if (isAfterDay(rangeStart, date)) {
      setRangeStart(date);
      setRangeEnd(rangeStart);
    } else {
      setRangeEnd(date);
    }
  };

  const applyCalendarRange = () => {
    if (!rangeStart || !rangeEnd) {
      return;
    }

    setHistorySearch(`${formatCalendarDate(rangeStart)} - ${formatCalendarDate(rangeEnd)}`);
    setCalendarOpen(false);
  };

  return (
    <>
      <View style={styles.searchBox}>
        <Search color="rgba(155,93,229,0.52)" size={17} strokeWidth={2.2} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setHistorySearch}
          placeholder={
            historySearchTarget === "buyer"
              ? "Buscar compradora o fecha..."
              : historySearchTarget === "seller"
                ? "Buscar vendedora o fecha..."
                : "Buscar nombre o fecha..."
          }
          placeholderTextColor="rgba(255,255,255,0.36)"
          style={styles.searchInput}
          value={historySearch}
        />
        <Pressable onPress={openCalendar} style={({ pressed }) => [styles.calendarTrigger, pressed && styles.pressed]}>
          <Calendar color={colors.violet} size={17} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.historyChecks}>
        {[
          { label: "Compradora", value: "buyer" as const },
          { label: "Vendedora", value: "seller" as const },
        ].map((item) => {
          const active = historySearchTarget === item.value;

          return (
            <Pressable
              key={item.value}
              onPress={() => setHistorySearchTarget(active ? null : item.value)}
              style={({ pressed }) => [styles.historyCheck, active && styles.historyCheckActive, pressed && styles.pressed]}
            >
              <View style={[styles.historyCheckIcon, active && styles.historyCheckIconActive]}>
                {active ? <CheckCircle2 color={colors.white} size={14} strokeWidth={2.6} /> : null}
              </View>
              <Text style={[styles.historyCheckText, active && styles.historyCheckTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal animationType="slide" transparent visible={calendarOpen} onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)} />
          <View style={styles.calendarSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.calendarModeSelector}>
              {[
                { label: "Una fecha", value: "single" as const },
                { label: "Rango", value: "range" as const },
              ].map((item) => {
                const active = calendarMode === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setCalendarMode(item.value);
                      setRangeEnd(null);
                    }}
                    style={({ pressed }) => [styles.calendarModeButton, active && styles.calendarModeButtonActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.calendarModeText, active && styles.calendarModeTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}>
                <ChevronRight color={colors.violet} size={17} strokeWidth={2.6} style={styles.calendarPrevIcon} />
              </Pressable>
              <Text style={styles.calendarTitle}>{monthLabel}</Text>
              <Pressable
                disabled={!canGoNextMonth}
                onPress={() => changeMonth(1)}
                style={({ pressed }) => [styles.calendarNavButton, !canGoNextMonth && styles.calendarNavButtonDisabled, pressed && styles.pressed]}
              >
                <ChevronRight color={colors.violet} size={17} strokeWidth={2.6} />
              </Pressable>
            </View>

            <View style={styles.calendarWeekRow}>
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.calendarWeekText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date) => {
                const inMonth = date.getMonth() === visibleMonth.getMonth();
                const selected =
                  (rangeStart !== null && isSameDay(date, rangeStart)) ||
                  (rangeEnd !== null && isSameDay(date, rangeEnd));
                const withinRange =
                  calendarMode === "range" &&
                  rangeStart !== null &&
                  rangeEnd !== null &&
                  getDayTimestamp(date) > getDayTimestamp(rangeStart) &&
                  getDayTimestamp(date) < getDayTimestamp(rangeEnd);
                const currentDay = isSameDay(date, today);
                const futureDay = isAfterDay(date, today);

                return (
                  <Pressable
                    key={date.toISOString()}
                    disabled={futureDay}
                    onPress={() => selectCalendarDate(date)}
                    style={({ pressed }) => [
                      styles.calendarDay,
                      !inMonth && styles.calendarDayOutside,
                      futureDay && styles.calendarDayDisabled,
                      currentDay && styles.calendarDayToday,
                      withinRange && styles.calendarDayWithinRange,
                      selected && styles.calendarDaySelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !inMonth && styles.calendarDayTextOutside,
                        futureDay && styles.calendarDayTextDisabled,
                        currentDay && styles.calendarDayTextToday,
                        selected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {calendarMode === "range" ? (
              <View style={styles.calendarRangeSummary}>
                <View style={styles.calendarRangeValue}>
                  <Text style={styles.calendarRangeLabel}>Desde</Text>
                  <Text style={styles.calendarRangeDate}>{rangeStart ? formatCalendarDate(rangeStart) : "Seleccionar"}</Text>
                </View>
                <ChevronRight color="rgba(155,93,229,0.42)" size={16} strokeWidth={2.4} />
                <View style={styles.calendarRangeValue}>
                  <Text style={styles.calendarRangeLabel}>Hasta</Text>
                  <Text style={styles.calendarRangeDate}>{rangeEnd ? formatCalendarDate(rangeEnd) : "Seleccionar"}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.calendarFooter}>
              <Pressable
                onPress={() => {
                  setHistorySearch("");
                  setCalendarOpen(false);
                }}
                style={({ pressed }) => [styles.calendarClearButton, pressed && styles.pressed]}
              >
                <Text style={styles.calendarClearText}>Limpiar fecha</Text>
              </Pressable>
              {calendarMode === "range" ? (
                <Pressable
                  disabled={!rangeStart || !rangeEnd}
                  onPress={applyCalendarRange}
                  style={({ pressed }) => [
                    styles.calendarApplyButton,
                    (!rangeStart || !rangeEnd) && styles.calendarApplyButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.calendarApplyText}>Aplicar rango</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} retrying={loading} title="No se pudieron cargar las ventas" />
      ) : null}

      <View>
        <SectionLabel>Ventas realizadas</SectionLabel>
        <View style={styles.salesList}>
          {loading && totalCount === 0 ? <SalesHistorySkeleton /> : null}
          {sales.map((sale) => {
            const seller = sellers.find((item) => item.id === sale.sellerId);

            return <SaleCard key={sale.id} sale={sale} seller={seller} onPress={() => onSalePress(sale)} />;
          })}
        </View>
        {!loading && !errorMessage && filteredCount === 0 ? (
          <LiquidCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{totalCount === 0 ? "Sin ventas registradas" : "Sin resultados"}</Text>
            {totalCount > 0 ? <Text style={styles.emptyText}>Proba cambiar el nombre, el criterio o la fecha de venta.</Text> : null}
          </LiquidCard>
        ) : null}
      </View>
    </>
  );
}

function ProductSelectionSkeleton({ view }: { view: ProductSelectionView }) {
  if (view === "list") {
    return (
      <SkeletonGroup style={styles.productList}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.listSkeletonCard}>
            <SkeletonBlock style={styles.listSkeletonImage} />
            <View style={styles.listSkeletonBody}>
              <SkeletonBlock style={styles.listSkeletonTitle} />
              <SkeletonBlock style={styles.listSkeletonMeta} />
            </View>
            <SkeletonBlock style={styles.listSkeletonPrice} />
          </View>
        ))}
      </SkeletonGroup>
    );
  }

  return (
    <SkeletonGroup style={styles.catalogProductGrid}>
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.catalogSkeletonCard}>
          <SkeletonBlock style={styles.catalogSkeletonImage} />
          <View style={styles.catalogSkeletonBody}>
            <SkeletonBlock style={styles.catalogSkeletonTitle} />
            <View style={styles.catalogSkeletonBadges}>
              <SkeletonBlock style={styles.catalogSkeletonBadgeWide} />
              <SkeletonBlock style={styles.catalogSkeletonBadge} />
            </View>
            <SkeletonBlock style={styles.catalogSkeletonMeta} />
            <SkeletonBlock style={styles.catalogSkeletonPrice} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function SalesHistorySkeleton() {
  return (
    <SkeletonGroup style={styles.salesSkeletonList}>
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} style={styles.saleSkeletonCard}>
          <View style={styles.saleSkeletonHeader}>
            <SkeletonBlock style={styles.saleSkeletonAvatar} />
            <View style={styles.saleSkeletonMain}>
              <SkeletonBlock style={styles.saleSkeletonTitle} />
              <SkeletonBlock style={styles.saleSkeletonMeta} />
            </View>
            <SkeletonBlock style={styles.saleSkeletonAmount} />
          </View>
          <SkeletonBlock style={styles.saleSkeletonLine} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function Avatar({ color, initials, size }: { color: string; initials: string; size: number }) {
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: color,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.max(10, size * 0.32) }]}>{initials}</Text>
    </View>
  );
}

function ProductOption({ onPress, product, selected }: { onPress: () => void; product: Product; selected: boolean }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!product.photoPath) {
      setPhotoUrl(null);
      return;
    }

    getProductPhotoUrl(product.photoPath)
      .then((url) => {
        if (mounted) {
          setPhotoUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setPhotoUrl(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [product.photoPath]);

  return (
    <LiquidCard onPress={onPress} style={styles.productCard}>
      <View style={styles.productContent}>
        <View style={styles.productThumb}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.productImage} />
          ) : (
            <Shirt color="rgba(155,93,229,0.44)" size={26} strokeWidth={1.8} />
          )}
        </View>
        <View style={styles.productInfo}>
          <Text numberOfLines={1} style={styles.productName}>
            {product.name}
          </Text>
          <View style={styles.productBadges}>
            <GlassBadge label={product.subcategory ?? "Producto"} tone={colors.violet} />
            <GlassBadge label={`T: ${product.size}`} tone={colors.rose} />
          </View>
        </View>
        <View style={styles.productRight}>
          <Text style={styles.productPrice}>{formatMoney(product.salePrice)}</Text>
          <View style={[styles.addBubble, selected && styles.addBubbleActive]}>
            {selected ? (
              <CheckCircle2 color={colors.white} size={16} strokeWidth={2.5} />
            ) : (
              <Plus color={colors.violet} size={15} strokeWidth={2.5} />
            )}
          </View>
        </View>
      </View>
    </LiquidCard>
  );
}

function CatalogProductOption({ onPress, product, selected }: { onPress: () => void; product: Product; selected: boolean }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!product.photoPath) {
      setPhotoUrl(null);
      return;
    }

    getProductPhotoUrl(product.photoPath)
      .then((url) => {
        if (mounted) {
          setPhotoUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setPhotoUrl(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [product.photoPath]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.catalogProductPressable, pressed && styles.pressed]}>
      <LiquidCard style={[styles.catalogProductCard, selected && styles.catalogProductCardSelected]}>
        <View style={styles.catalogImageWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.catalogImagePlaceholder}>
              <Shirt color="rgba(155,93,229,0.44)" size={30} strokeWidth={1.8} />
            </View>
          )}
          <View style={[styles.catalogSelectBubble, selected && styles.catalogSelectBubbleActive]}>
            {selected ? (
              <CheckCircle2 color={colors.white} size={16} strokeWidth={2.5} />
            ) : (
              <Plus color={colors.violet} size={15} strokeWidth={2.5} />
            )}
          </View>
        </View>

        <View style={styles.catalogProductBody}>
          <Text numberOfLines={2} style={styles.catalogProductName}>
            {product.name}
          </Text>
          <View style={styles.catalogBadges}>
            <GlassBadge label={categoryLabels[product.category]} tone={colors.violet} />
            <GlassBadge label={`T: ${product.size}`} tone={colors.rose} />
          </View>
          <Text numberOfLines={1} style={styles.catalogSubcategory}>
            {product.subcategory ?? " "}
          </Text>
          <View style={styles.catalogPriceRow}>
            <Text style={styles.catalogPriceLabel}>Venta</Text>
            <Text style={styles.catalogPriceValue}>{formatMoney(product.salePrice)}</Text>
          </View>
        </View>
      </LiquidCard>
    </Pressable>
  );
}

function CartItem({ onRemove, product }: { onRemove: () => void; product: Product }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!product.photoPath) {
      setPhotoUrl(null);
      return;
    }

    getProductPhotoUrl(product.photoPath)
      .then((url) => {
        if (mounted) {
          setPhotoUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setPhotoUrl(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [product.photoPath]);

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartThumb}>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.productImage} /> : <Shirt color="rgba(155,93,229,0.4)" size={20} />}
      </View>
      <View style={styles.cartInfo}>
        <Text numberOfLines={1} style={styles.cartName}>
          {product.name}
        </Text>
        <Text style={styles.cartMeta}>T: {product.size}</Text>
      </View>
      <Text style={styles.cartPrice}>{formatMoney(product.salePrice)}</Text>
      <Pressable onPress={onRemove} style={styles.removeButton}>
        <X color="rgba(255,255,255,0.42)" size={14} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function FormField({
  children,
  Icon,
  label,
}: {
  children: ReactNode;
  Icon: typeof User;
  label: string;
}) {
  return (
    <View>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Icon color="rgba(155,93,229,0.52)" size={14} strokeWidth={2.4} />
        {children}
      </View>
    </View>
  );
}

function SaleCard({ onPress, sale, seller }: { onPress: () => void; sale: Sale; seller?: ApiProfile }) {
  const sellerColor = seller?.color ?? colors.violet;

  return (
    <LiquidCard onPress={onPress} style={[styles.saleCard, { borderColor: sellerColor }]}>
      <View style={styles.saleBody}>
        <View style={styles.saleHeader}>
          <Text numberOfLines={1} style={styles.buyerName}>
            {sale.buyerFullName}
          </Text>
          <Text style={styles.saleTotal}>{formatMoney(sale.totalAmount)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.saleProducts}>
          {sale.items.map((item) => item.productName).join(", ")}
        </Text>
        <View style={styles.saleFooter}>
          <View style={styles.sellerMini}>
            <Avatar color={sellerColor} initials={getInitials(seller?.fullName ?? "V")} size={20} />
            <Text numberOfLines={1} style={styles.sellerMiniText}>
              {(seller?.fullName ?? "Vendedora").split(" ")[0]}
            </Text>
          </View>
          <GlassBadge label={paymentLabels[sale.paymentStatus]} tone={paymentTones[sale.paymentStatus]} />
          <ChevronRight color="rgba(155,93,229,0.35)" size={15} strokeWidth={2.4} />
        </View>
      </View>
    </LiquidCard>
  );
}

export function SaleDetail({
  onBack,
  onSaleUpdated,
  sale,
  seller,
  session,
}: {
  onBack: () => void;
  onSaleUpdated: (sale: Sale) => void;
  sale: Sale;
  seller?: ApiProfile;
  session: ReturnType<typeof useAuth>["session"];
}) {
  const sellerColor = seller?.color ?? colors.violet;
  const age = getDaysFromToday(sale.saleDate);
  const inReturnWindow = new Date(sale.returnDeadline).getTime() >= Date.now();
  const returnableItems = useMemo(() => sale.items.filter((item) => item.status === "sold"), [sale.items]);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [returnForm, setReturnForm] = useState(initialReturnForm);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnConfirming, setReturnConfirming] = useState(false);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [selectedReturnItemIds, setSelectedReturnItemIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<{ detail: string; title: string } | null>(null);

  const selectedReturnTotal = useMemo(
    () => sale.items.filter((item) => selectedReturnItemIds.includes(item.id)).reduce((sum, item) => sum + item.salePrice, 0),
    [sale.items, selectedReturnItemIds],
  );
  const returnDebtReduction = Math.min(selectedReturnTotal, sale.pendingAmount);
  const returnRefundAmount = Math.min(Math.max(0, selectedReturnTotal - sale.pendingAmount), sale.paidAmount);

  const loadPayments = useCallback(async () => {
    if (!session) {
      return;
    }

    setPaymentsLoading(true);

    try {
      const response = await apiRequest<PaymentsResponse>(`/payments?saleId=${sale.id}`, {
        method: "GET",
        session,
      });

      setPayments(response.items);
    } finally {
      setPaymentsLoading(false);
    }
  }, [sale.id, session]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const loadReturns = useCallback(async () => {
    if (!session) {
      return;
    }

    setReturnsLoading(true);

    try {
      const response = await apiRequest<ReturnsResponse>(`/returns?saleId=${sale.id}`, {
        method: "GET",
        session,
      });

      setReturns(response.items);
    } finally {
      setReturnsLoading(false);
    }
  }, [sale.id, session]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const closePayment = () => {
    if (paymentSaving) {
      return;
    }

    setPaymentOpen(false);
    setPaymentError(null);
    setPaymentForm(initialPaymentForm);
  };

  const registerPayment = async () => {
    if (!session) {
      return;
    }

    const amount = Number.parseInt(paymentForm.amount || "0", 10);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresá un monto válido.");
      return;
    }

    if (amount > sale.pendingAmount) {
      setPaymentError("El pago no puede superar el saldo pendiente.");
      return;
    }

    setPaymentSaving(true);
    setPaymentError(null);

    try {
      await apiRequest("/payments", {
        body: {
          amount,
          note: paymentForm.note.trim() || null,
          saleId: sale.id,
        },
        method: "POST",
        session,
      });

      const response = await apiRequest<{ item: Sale }>(`/sales/${sale.id}`, {
        method: "GET",
        session,
      });

      await loadPayments();
      onSaleUpdated(response.item);
      setPaymentOpen(false);
      setPaymentForm(initialPaymentForm);
      setSuccessMessage({ detail: formatMoney(amount), title: "Pago registrado" });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "No se pudo registrar el pago");
    } finally {
      setPaymentSaving(false);
    }
  };

  const openReturnSheet = () => {
    if (returnableItems.length === 0 || !inReturnWindow) {
      return;
    }

    setSelectedReturnItemIds([]);
    setReturnForm(initialReturnForm);
    setReturnError(null);
    setReturnConfirming(false);
    setReturnOpen(true);
  };

  const closeReturn = () => {
    if (returnSaving) {
      return;
    }

    setReturnOpen(false);
    setReturnConfirming(false);
    setReturnError(null);
    setReturnForm(initialReturnForm);
    setSelectedReturnItemIds([]);
  };

  const toggleReturnItem = (saleItemId: string) => {
    setSelectedReturnItemIds((current) =>
      current.includes(saleItemId) ? current.filter((id) => id !== saleItemId) : [...current, saleItemId],
    );
  };

  const validateReturn = (): boolean => {
    if (selectedReturnItemIds.length === 0) {
      setReturnError("Selecciona al menos un producto.");
      return false;
    }

    return true;
  };

  const requestReturnConfirmation = () => {
    if (!validateReturn()) {
      return;
    }

    setReturnError(null);
    setReturnConfirming(true);
  };

  const registerReturn = async () => {
    if (!session) {
      return;
    }

    if (!validateReturn()) {
      setReturnConfirming(false);
      return;
    }

    setReturnSaving(true);
    setReturnError(null);

    try {
      const payload: CreateReturnInput = {
        reason: returnForm.reason.trim() || null,
        saleId: sale.id,
        saleItemIds: selectedReturnItemIds,
      };

      await apiRequest("/returns", {
        body: payload,
        method: "POST",
        session,
      });

      const response = await apiRequest<{ item: Sale }>(`/sales/${sale.id}`, {
        method: "GET",
        session,
      });

      await Promise.all([loadReturns(), loadPayments()]);
      onSaleUpdated(response.item);
      setReturnOpen(false);
      setReturnConfirming(false);
      setReturnForm(initialReturnForm);
      setSelectedReturnItemIds([]);
      setSuccessMessage({
        detail: `Deuda: ${formatMoney(returnDebtReduction)} - Reintegro: ${formatMoney(returnRefundAmount)}`,
        title: "Devolucion registrada",
      });
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : "No se pudo registrar la devolucion");
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <ScreenEnter>
      <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.detailContent}>
      <InternalHeader onBack={onBack} subtitle={formatDate(sale.saleDate)} title={`Venta #${sale.id.slice(0, 8)}`} />

      <DetailSection title="Comprador">
        <View style={styles.detailStack}>
          <View style={styles.detailLine}>
            <User color={colors.violet} size={14} strokeWidth={2.4} />
            <Text style={styles.detailStrong}>{sale.buyerFullName}</Text>
          </View>
          <View style={styles.detailLine}>
            <Phone color="rgba(255,255,255,0.45)" size={14} strokeWidth={2.4} />
            <Text style={styles.detailMuted}>{sale.buyerPhone}</Text>
          </View>
        </View>
      </DetailSection>

      <DetailSection title="Vendedora">
        <View style={styles.detailLine}>
          <Avatar color={sellerColor} initials={getInitials(seller?.fullName ?? "SA")} size={36} />
          <Text style={styles.detailStrong}>{seller?.fullName ?? "Sin vendedora asignada"}</Text>
        </View>
      </DetailSection>

      <DetailSection title="Estado de pago">
        <View style={styles.detailStack}>
          <AmountLine color={colors.foreground} label="Total" value={sale.totalAmount} />
          <AmountLine color={colors.mint} label="Cobrado" value={sale.paidAmount} />
          <AmountLine color={colors.red} label="Pendiente" value={sale.pendingAmount} />
          <View style={styles.badgeRow}>
            <GlassBadge label={paymentLabels[sale.paymentStatus]} tone={paymentTones[sale.paymentStatus]} />
            {sale.paymentStatus === "overdue" ? <GlassBadge label="Vencida +30d" tone={colors.red} /> : null}
          </View>
          {sale.pendingAmount > 0 ? (
            <Pressable onPress={() => setPaymentOpen(true)} style={({ pressed }) => [styles.paymentButton, pressed && styles.pressed]}>
              <CreditCard color={colors.white} size={15} strokeWidth={2.4} />
              <Text style={styles.paymentButtonText}>Registrar pago</Text>
            </Pressable>
          ) : null}
        </View>
      </DetailSection>

      <DetailSection title="Pagos">
        <View style={styles.detailStack}>
          {paymentsLoading ? <ActivityIndicator color={colors.violet} /> : null}
          {!paymentsLoading && payments.length === 0 ? <Text style={styles.detailMuted}>Todavia no hay pagos registrados.</Text> : null}
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </View>
      </DetailSection>

      <DetailSection title="Productos">
        <View style={styles.detailStack}>
          {sale.items.map((item) => (
            <SaleDetailProductRow key={item.id} item={item} session={session} />
          ))}
        </View>
      </DetailSection>

      <DetailSection title="Devolucion">
        <View style={styles.returnRow}>
          <Text style={styles.detailMuted}>{inReturnWindow ? `Dentro del plazo (${age}d)` : `Fuera de plazo (${age}d)`}</Text>
          {inReturnWindow ? (
            <Pressable onPress={openReturnSheet} style={({ pressed }) => [styles.returnButton, pressed && styles.pressed]}>
              <RotateCcw color={colors.white} size={13} strokeWidth={2.5} />
              <Text style={styles.returnButtonText}>Gestionar</Text>
            </Pressable>
          ) : (
            <GlassBadge label="Sin devolucion" tone="rgba(255,255,255,0.5)" />
          )}
        </View>
      </DetailSection>

      <DetailSection title="Registro de devoluciones">
        <View style={styles.detailStack}>
          {returnsLoading ? <ActivityIndicator color={colors.violet} /> : null}
          {!returnsLoading && returns.length === 0 ? <Text style={styles.detailMuted}>Todavia no hay devoluciones registradas.</Text> : null}
          {returns.map((item) => (
            <ReturnRow key={item.id} saleReturn={item} saleItems={sale.items} />
          ))}
        </View>
      </DetailSection>

      <Modal animationType="slide" transparent visible={returnOpen} onRequestClose={closeReturn}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeReturn} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{returnConfirming ? "Confirmar devolucion" : "Gestionar devolucion"}</Text>
              <Pressable onPress={closeReturn} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            {returnConfirming ? (
              <ScrollView contentContainerStyle={styles.returnConfirmation}>
                <View style={styles.returnWarningIcon}>
                  <RotateCcw color={colors.red} size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.returnConfirmationTitle}>Revisa los productos</Text>
                <Text style={styles.returnConfirmationText}>Al confirmar, volveran a quedar disponibles en el catalogo.</Text>

                <View style={styles.returnConfirmationItems}>
                  {sale.items
                    .filter((item) => selectedReturnItemIds.includes(item.id))
                    .map((item) => (
                      <View key={item.id} style={styles.returnConfirmationItem}>
                        <View style={styles.detailProductInfo}>
                          <Text numberOfLines={1} style={styles.detailProductName}>{item.productName}</Text>
                          <Text style={styles.detailMuted}>Talle {item.productSize}</Text>
                        </View>
                        <Text style={styles.detailProductPrice}>{formatMoney(item.salePrice)}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.returnConfirmationTotals}>
                  <View style={styles.returnConfirmationTotal}>
                    <Text style={styles.detailMuted}>Se descuenta de la deuda</Text>
                    <Text style={[styles.returnConfirmationAmount, { color: colors.violet }]}>
                      {formatMoney(returnDebtReduction)}
                    </Text>
                  </View>
                  <View style={styles.returnConfirmationTotal}>
                    <Text style={styles.detailMuted}>Dinero a devolver</Text>
                    <Text style={styles.returnConfirmationAmount}>
                      {formatMoney(returnRefundAmount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.returnConfirmationActions}>
                  <Pressable
                    disabled={returnSaving}
                    onPress={() => setReturnConfirming(false)}
                    style={({ pressed }) => [styles.returnCancelButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.returnCancelText}>Volver</Text>
                  </Pressable>
                  <Pressable
                    disabled={returnSaving}
                    onPress={registerReturn}
                    style={({ pressed }) => [styles.returnConfirmButton, pressed && styles.pressed]}
                  >
                    {returnSaving ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.returnConfirmText}>Confirmar</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.paymentSummary}>
                <AmountLine color={colors.foreground} label="Productos seleccionados" value={selectedReturnTotal} />
                <AmountLine color={colors.violet} label="Se descuenta de la deuda" value={returnDebtReduction} />
                <AmountLine color={colors.red} label="Dinero a devolver" value={returnRefundAmount} />
              </View>

              <View style={styles.returnItems}>
                {returnableItems.map((item) => {
                  const active = selectedReturnItemIds.includes(item.id);

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleReturnItem(item.id)}
                      style={({ pressed }) => [styles.returnItemOption, active && styles.returnItemOptionActive, pressed && styles.pressed]}
                    >
                      <View style={[styles.returnCheck, active && styles.returnCheckActive]}>
                        {active ? <CheckCircle2 color={colors.white} size={16} strokeWidth={2.5} /> : null}
                      </View>
                      <View style={styles.detailProductInfo}>
                        <Text numberOfLines={1} style={styles.detailProductName}>
                          {item.productName}
                        </Text>
                        <Text style={styles.detailMuted}>Talle {item.productSize}</Text>
                      </View>
                      <Text style={styles.detailProductPrice}>{formatMoney(item.salePrice)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <FormField Icon={ReceiptText} label="Motivo">
                <TextInput
                  onChangeText={(value) => setReturnForm((current) => ({ ...current, reason: value }))}
                  placeholder="Ej: Producto devuelto"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={returnForm.reason}
                />
              </FormField>

              {returnError ? <Text style={styles.formError}>{returnError}</Text> : null}

              <Pressable onPress={requestReturnConfirmation} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                <>
                  <RotateCcw color={colors.white} size={16} strokeWidth={2.5} />
                  <Text style={styles.confirmButtonText}>Revisar devolucion</Text>
                </>
              </Pressable>
            </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent visible={paymentOpen} onRequestClose={closePayment}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closePayment} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Registrar pago</Text>
              <Pressable onPress={closePayment} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.formContent}>
              <View style={styles.paymentSummary}>
                <AmountLine color={colors.foreground} label="Total" value={sale.totalAmount} />
                <AmountLine color={colors.mint} label="Cobrado" value={sale.paidAmount} />
                <AmountLine color={colors.red} label="Pendiente" value={sale.pendingAmount} />
              </View>

              <FormField Icon={DollarSign} label="Monto">
                <TextInput
                  inputMode="numeric"
                  onChangeText={(value) => setPaymentForm((current) => ({ ...current, amount: value.replace(/\D/g, "") }))}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={paymentForm.amount}
                />
              </FormField>

              <FormField Icon={ReceiptText} label="Nota">
                <TextInput
                  onChangeText={(value) => setPaymentForm((current) => ({ ...current, note: value }))}
                  placeholder="Opcional"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={paymentForm.note}
                />
              </FormField>

              {paymentError ? <Text style={styles.formError}>{paymentError}</Text> : null}

              <Pressable disabled={paymentSaving} onPress={registerPayment} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                {paymentSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Guardar pago</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>

      <SuccessToast
        detail={successMessage?.detail}
        onHidden={() => setSuccessMessage(null)}
        title={successMessage?.title ?? "Operacion registrada"}
        visible={successMessage !== null}
      />
      </View>
    </ScreenEnter>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentIcon}>
        <CreditCard color={colors.violet} size={15} strokeWidth={2.4} />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentKind}>{payment.kind === "initial" ? "Pago inicial" : "Pago posterior"}</Text>
        <Text style={styles.paymentDate}>{formatFullDate(payment.paidAt)}</Text>
        {payment.note ? <Text style={styles.paymentNote}>{payment.note}</Text> : null}
      </View>
      <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
    </View>
  );
}

function ReturnRow({ saleItems, saleReturn }: { saleItems: SaleItem[]; saleReturn: SaleReturn }) {
  const returnedNames = saleReturn.items
    .map((item) => saleItems.find((saleItem) => saleItem.id === item.saleItemId)?.productName)
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.paymentRow}>
      <View style={styles.returnIcon}>
        <RotateCcw color={colors.red} size={15} strokeWidth={2.4} />
      </View>
      <View style={styles.paymentInfo}>
        <Text numberOfLines={1} style={styles.paymentKind}>
          {returnedNames || "Productos devueltos"}
        </Text>
        <Text style={styles.paymentDate}>{formatFullDate(saleReturn.returnedAt)}</Text>
        {saleReturn.reason ? <Text style={styles.paymentNote}>{saleReturn.reason}</Text> : null}
      </View>
      <Text style={styles.returnAmount}>-{formatMoney(saleReturn.refundAmount)}</Text>
    </View>
  );
}

function SaleDetailProductRow({ item, session }: { item: SaleItem; session: ReturnType<typeof useAuth>["session"] }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPhoto() {
      if (!session) {
        return;
      }

      try {
        const response = await apiRequest<{ item: Product }>(`/products/${item.productId}`, {
          method: "GET",
          session,
        });

        if (!response.item.photoPath) {
          return;
        }

        const url = await getProductPhotoUrl(response.item.photoPath);

        if (active) {
          setPhotoUrl(url);
        }
      } catch {
        if (active) {
          setPhotoUrl(null);
        }
      }
    }

    loadPhoto();

    return () => {
      active = false;
    };
  }, [item.productId, session]);

  return (
    <View style={styles.detailProductRow}>
      <View style={styles.detailProductThumb}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.productImage} />
        ) : (
          <Shirt color="rgba(155,93,229,0.42)" size={18} strokeWidth={1.8} />
        )}
      </View>
      <View style={styles.detailProductInfo}>
        <Text numberOfLines={1} style={styles.detailProductName}>
          {item.productName}
        </Text>
        <Text style={styles.detailMuted}>
          {item.status === "returned" ? "Devuelto" : "Talle " + item.productSize}
        </Text>
      </View>
      <Text style={[styles.detailProductPrice, item.status === "returned" && styles.detailProductReturnedPrice]}>
        {formatMoney(item.salePrice)}
      </Text>
    </View>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <LiquidCard style={styles.detailCard}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </LiquidCard>
  );
}

function AmountLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.amountLine}>
      <Text style={styles.detailMuted}>{label}</Text>
      <Text style={[styles.amountLineValue, { color }]}>{formatMoney(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 132,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contentWithSummary: {
    paddingBottom: 190,
  },
  header: {
    gap: 16,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  segmented: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 6,
    shadowColor: colors.violet,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: colors.violet,
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  segmentText: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: colors.white,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  searchInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 46,
  },
  calendarTrigger: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.1)",
    borderColor: "rgba(155,93,229,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  calendarSheet: {
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.22)",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 20,
  },
  calendarModeSelector: {
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    marginBottom: 14,
    padding: 4,
  },
  calendarModeButton: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
  },
  calendarModeButtonActive: {
    backgroundColor: colors.violet,
  },
  calendarModeText: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: "900",
  },
  calendarModeTextActive: {
    color: colors.white,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarNavButton: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.1)",
    borderColor: "rgba(155,93,229,0.18)",
    borderRadius: 15,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  calendarNavButtonDisabled: {
    opacity: 0.32,
  },
  calendarPrevIcon: {
    transform: [{ rotate: "180deg" }],
  },
  calendarTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarWeekText: {
    color: "rgba(255,255,255,0.58)",
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  calendarDay: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: "14.2857%",
  },
  calendarDayOutside: {
    opacity: 0.48,
  },
  calendarDayDisabled: {
    opacity: 0.22,
  },
  calendarDayToday: {
    backgroundColor: "rgba(155,93,229,0.1)",
  },
  calendarDayWithinRange: {
    backgroundColor: "rgba(155,93,229,0.16)",
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: colors.violet,
  },
  calendarDayText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  calendarDayTextOutside: {
    color: "rgba(255,255,255,0.54)",
  },
  calendarDayTextDisabled: {
    color: "rgba(255,255,255,0.26)",
  },
  calendarDayTextToday: {
    color: colors.violet,
  },
  calendarDayTextSelected: {
    color: colors.white,
  },
  calendarFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
  },
  calendarClearButton: {
    backgroundColor: "rgba(155,93,229,0.1)",
    borderColor: "rgba(155,93,229,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  calendarClearText: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900",
  },
  calendarApplyButton: {
    backgroundColor: colors.violet,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  calendarApplyButtonDisabled: {
    opacity: 0.35,
  },
  calendarApplyText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  calendarRangeSummary: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.07)",
    borderColor: "rgba(155,93,229,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  calendarRangeValue: {
    flex: 1,
  },
  calendarRangeLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  calendarRangeDate: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  historyChecks: {
    flexDirection: "row",
    gap: 10,
  },
  historyCheck: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  historyCheckActive: {
    backgroundColor: "rgba(155,93,229,0.14)",
    borderColor: "rgba(155,93,229,0.28)",
  },
  historyCheckIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(155,93,229,0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  historyCheckIconActive: {
    backgroundColor: colors.violet,
    borderColor: "rgba(255,255,255,0.14)",
  },
  historyCheckText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  historyCheckTextActive: {
    color: colors.violet,
  },
  filters: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: colors.violet,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: colors.white,
  },
  viewToggle: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  viewToggleButton: {
    alignItems: "center",
    borderRadius: 14,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.violet,
    shadowColor: colors.violet,
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  viewToggleText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  viewToggleTextActive: {
    color: colors.white,
  },
  productList: {
    gap: 12,
  },
  catalogProductGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  catalogSkeletonCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    height: 278,
    overflow: "hidden",
    width: "47.9%",
  },
  catalogSkeletonImage: {
    borderRadius: 0,
    borderWidth: 0,
    height: 120,
    width: "100%",
  },
  catalogSkeletonBody: {
    flex: 1,
    padding: 12,
  },
  catalogSkeletonTitle: {
    height: 14,
    width: "78%",
  },
  catalogSkeletonBadges: {
    flexDirection: "row",
    gap: 5,
    marginTop: 14,
  },
  catalogSkeletonBadgeWide: {
    height: 20,
    width: 62,
  },
  catalogSkeletonBadge: {
    height: 20,
    width: 42,
  },
  catalogSkeletonMeta: {
    height: 10,
    marginTop: 13,
    width: "52%",
  },
  catalogSkeletonPrice: {
    alignSelf: "flex-end",
    height: 20,
    marginTop: "auto",
    width: 68,
  },
  listSkeletonCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    padding: 14,
  },
  listSkeletonImage: {
    height: 56,
    width: 56,
  },
  listSkeletonBody: {
    flex: 1,
    gap: 9,
  },
  listSkeletonTitle: {
    height: 13,
    width: "72%",
  },
  listSkeletonMeta: {
    height: 18,
    width: "56%",
  },
  listSkeletonPrice: {
    height: 18,
    width: 62,
  },
  salesSkeletonList: {
    gap: 12,
  },
  saleSkeletonCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  saleSkeletonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  saleSkeletonAvatar: {
    borderRadius: 999,
    height: 42,
    width: 42,
  },
  saleSkeletonMain: {
    flex: 1,
    gap: 8,
  },
  saleSkeletonTitle: {
    height: 13,
    width: "66%",
  },
  saleSkeletonMeta: {
    height: 10,
    width: "42%",
  },
  saleSkeletonAmount: {
    height: 18,
    width: 68,
  },
  saleSkeletonLine: {
    height: 10,
    width: "58%",
  },
  catalogProductPressable: {
    width: "47.9%",
  },
  catalogProductCard: {
    height: 278,
    overflow: "hidden",
    width: "100%",
  },
  catalogProductCardSelected: {
    borderColor: "rgba(155,93,229,0.42)",
  },
  catalogImageWrap: {
    height: 120,
    overflow: "hidden",
  },
  catalogImagePlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  catalogSelectBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(155,93,229,0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 9,
    top: 9,
    width: 30,
  },
  catalogSelectBubbleActive: {
    backgroundColor: colors.violet,
    borderColor: "rgba(255,255,255,0.14)",
  },
  catalogProductBody: {
    flex: 1,
    padding: 12,
  },
  catalogProductName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    minHeight: 34,
  },
  catalogBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  catalogSubcategory: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    minHeight: 14,
  },
  catalogPriceRow: {
    alignItems: "flex-end",
    marginTop: "auto",
    paddingTop: 12,
  },
  catalogPriceLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  catalogPriceValue: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  productCard: {
    padding: 14,
  },
  productContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  productThumb: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 18,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  productImage: {
    height: "100%",
    width: "100%",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  productBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 7,
  },
  productRight: {
    alignItems: "center",
    gap: 8,
  },
  productPrice: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  addBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(155,93,229,0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  addBubbleActive: {
    backgroundColor: colors.violet,
  },
  saleSummaryDock: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 24,
    borderWidth: 1,
    bottom: 92,
    flexDirection: "row",
    left: 20,
    minHeight: 66,
    paddingHorizontal: 16,
    position: "absolute",
    right: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  saleSummaryMetric: {
    alignItems: "center",
    minWidth: 56,
  },
  saleSummaryLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  saleSummaryCount: {
    color: colors.foreground,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },
  saleSummaryDivider: {
    backgroundColor: "rgba(155,93,229,0.14)",
    height: 34,
    marginHorizontal: 14,
    width: 1,
  },
  saleSummaryTotalWrap: {
    flex: 1,
  },
  saleSummaryTotal: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  saleSummaryButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 17,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    width: 48,
  },
  saleSummaryButtonDisabled: {
    backgroundColor: "rgba(155,93,229,0.28)",
    shadowOpacity: 0,
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
  salesList: {
    gap: 12,
  },
  saleCard: {
    borderWidth: 1.5,
    padding: 16,
  },
  saleBody: {
    flex: 1,
  },
  saleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  buyerName: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  saleTotal: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  saleProducts: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
  },
  saleFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  datePill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  dateText: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "900",
  },
  sellerMini: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  sellerMiniText: {
    color: colors.faint,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "900",
  },
  emptyCard: {
    padding: 18,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
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
  formContent: {
    gap: 15,
    paddingBottom: 28,
  },
  cartItems: {
    gap: 9,
  },
  cartItem: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.06)",
    borderColor: "rgba(155,93,229,0.1)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  cartThumb: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  cartMeta: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  cartPrice: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  removeButton: {
    padding: 4,
  },
  totalRow: {
    alignItems: "center",
    borderColor: "rgba(155,93,229,0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 14,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  totalValue: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  formLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  sellerPicker: {
    gap: 8,
  },
  sellerOption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  sellerOptionActive: {
    backgroundColor: "rgba(155,93,229,0.12)",
    borderColor: "rgba(155,93,229,0.24)",
  },
  sellerOptionText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  sellerOptionTextActive: {
    color: colors.foreground,
  },
  noSellers: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: "800",
  },
  formInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 46,
  },
  statusPreview: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.07)",
    borderColor: "rgba(155,93,229,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusPreviewText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  formError: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 20,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    shadowColor: colors.violet,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  creationOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.68)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 32,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 40,
  },
  creationToast: {
    alignItems: "center",
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    width: "100%",
  },
  creationIconWrap: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 2,
    height: 66,
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: colors.mint,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    width: 66,
  },
  creationTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
  },
  creationAmount: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
  },
  creationStatus: {
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  creationStatusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  detailContent: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detailHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  backIcon: {
    transform: [{ rotate: "180deg" }],
  },
  detailTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  detailDate: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  detailCard: {
    padding: 16,
  },
  detailStack: {
    gap: 10,
  },
  detailLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  detailStrong: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  detailMuted: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  amountLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLineValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 2,
  },
  paymentButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.violet,
    borderRadius: 16,
    flexDirection: "row",
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 14,
    shadowColor: colors.violet,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  paymentButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },
  paymentSummary: {
    backgroundColor: "rgba(155,93,229,0.07)",
    borderColor: "rgba(155,93,229,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  paymentRow: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.06)",
    borderColor: "rgba(155,93,229,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.11)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  returnIcon: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.12)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentKind: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  paymentDate: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  paymentNote: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  paymentAmount: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: "900",
  },
  returnAmount: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "900",
  },
  returnItems: {
    gap: 8,
  },
  returnConfirmation: {
    alignItems: "center",
    gap: 13,
    paddingBottom: 28,
  },
  returnWarningIcon: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.12)",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  returnConfirmationTitle: {
    color: colors.foreground,
    fontSize: 19,
    fontWeight: "900",
  },
  returnConfirmationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    maxWidth: 300,
    textAlign: "center",
  },
  returnConfirmationItems: {
    gap: 8,
    width: "100%",
  },
  returnConfirmationItem: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.06)",
    borderColor: "rgba(224,82,113,0.12)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    padding: 12,
  },
  returnConfirmationTotal: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.07)",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    width: "100%",
  },
  returnConfirmationTotals: {
    gap: 8,
    width: "100%",
  },
  returnConfirmationAmount: {
    color: colors.red,
    fontSize: 19,
    fontWeight: "900",
  },
  returnConfirmationActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  returnCancelButton: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.09)",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  returnCancelText: {
    color: colors.violet,
    fontSize: 14,
    fontWeight: "900",
  },
  returnConfirmButton: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  returnConfirmText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  returnItemOption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    padding: 12,
  },
  returnItemOptionActive: {
    backgroundColor: "rgba(155,93,229,0.1)",
    borderColor: "rgba(155,93,229,0.22)",
  },
  returnCheck: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderColor: "rgba(155,93,229,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  returnCheckActive: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  detailProductRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  detailProductThumb: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  detailProductInfo: {
    flex: 1,
  },
  detailProductName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  detailProductPrice: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  detailProductReturnedPrice: {
    color: colors.red,
    textDecorationLine: "line-through",
  },
  returnRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  returnButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
  },
  returnButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
});
