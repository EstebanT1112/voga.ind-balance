import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
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
import { GlassBadge, LiquidCard, SectionLabel } from "../components/Liquid";
import { apiRequest } from "../lib/api";
import { getProductPhotoUrl } from "../products/productPhotos";
import type { Product, ProductCategory, ProductsResponse } from "../products/product.types";
import type { ApiProfile, UsersResponse } from "../reports/report.types";
import type { Payment, PaymentsResponse } from "../payments/payment.types";
import type { CreateReturnInput, ReturnsResponse, SaleReturn } from "../returns/return.types";
import type { CreateSaleInput, PaymentStatus, Sale, SaleItem, SalesResponse } from "../sales/sale.types";
import { colors, formatMoney } from "../theme/liquid";

type SalesTab = "new" | "history";

const categories: Array<{ label: string; value: ProductCategory | "all" }> = [
  { label: "Todas", value: "all" },
  { label: "Superior", value: "upper" },
  { label: "Inferior", value: "lower" },
  { label: "Lenceria", value: "lingerie" },
];

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
  refundAmount: "",
  reason: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
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

export function SalesScreen() {
  const { session } = useAuth();
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesTab, setSalesTab] = useState<SalesTab>("new");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [sellers, setSellers] = useState<ApiProfile[]>([]);

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
    setFormError(null);

    try {
      const response = await apiRequest<ProductsResponse>("/products?status=available", {
        method: "GET",
        session,
      });

      setAvailableProducts(response.items);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudieron cargar los productos disponibles");
    } finally {
      setProductsLoading(false);
    }
  }, [session]);

  const loadSellers = useCallback(async () => {
    if (!session) {
      return;
    }

    const response = await apiRequest<UsersResponse>("/users?active=true", {
      method: "GET",
      session,
    });
    const activeSellers = response.items.filter((item) => item.role === "seller");

    setSellers(response.items);
    setForm((current) =>
      current.sellerId || activeSellers.length === 0 ? current : { ...current, sellerId: activeSellers[0]!.id },
    );
  }, [session]);

  useEffect(() => {
    loadSales();
    loadAvailableProducts();
    loadSellers();
  }, [loadAvailableProducts, loadSales, loadSellers]);

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

  const resetForm = () => {
    setForm(initialForm);
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
    if (!session) {
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
        sellerId: form.sellerId || undefined,
      };

      await apiRequest<{ item: Sale }>("/sales", {
        body: payload,
        method: "POST",
        session,
      });

      setCartOpen(false);
      resetForm();
      setSalesTab("history");
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
        contentContainerStyle={styles.content}
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
            search={search}
            selectedProductIds={selectedProductIds}
            setCategory={setCategory}
            setSearch={setSearch}
            toggleProduct={toggleProduct}
          />
        ) : (
          <HistoryContent
            errorMessage={errorMessage}
            loading={loading}
            onSalePress={setSelectedSale}
            sales={sales}
            sellers={sellers}
          />
        )}
      </ScrollView>

      {salesTab === "new" && selectedProductIds.length > 0 ? (
        <Pressable onPress={() => setCartOpen(true)} style={({ pressed }) => [styles.cartFab, pressed && styles.pressed]}>
          <ShoppingCart color={colors.white} size={18} strokeWidth={2.5} />
          <Text style={styles.cartFabTotal}>{formatMoney(selectedTotal)}</Text>
          <View style={styles.cartCount}>
            <Text style={styles.cartCountText}>{selectedProductIds.length}</Text>
          </View>
        </Pressable>
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
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={form.buyerFullName}
                />
              </FormField>

              <FormField Icon={Phone} label="Teléfono">
                <TextInput
                  inputMode="tel"
                  onChangeText={(value) => setForm((current) => ({ ...current, buyerPhone: value }))}
                  placeholder="+54 9 11..."
                  placeholderTextColor="rgba(90,60,120,0.36)"
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
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={form.initialPaymentAmount}
                />
              </FormField>

              <View>
                <Text style={styles.formLabel}>Vendedora</Text>
                <View style={styles.sellerPicker}>
                  {sellers
                    .filter((seller) => seller.role === "seller")
                    .map((seller) => {
                      const active = form.sellerId === seller.id;
                      const color = seller.color ?? colors.violet;

                      return (
                        <Pressable
                          key={seller.id}
                          onPress={() => setForm((current) => ({ ...current, sellerId: seller.id }))}
                          style={({ pressed }) => [styles.sellerOption, active && styles.sellerOptionActive, pressed && styles.pressed]}
                        >
                          <Avatar color={color} initials={getInitials(seller.fullName)} size={26} />
                          <Text numberOfLines={1} style={[styles.sellerOptionText, active && styles.sellerOptionTextActive]}>
                            {seller.fullName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  {sellers.filter((seller) => seller.role === "seller").length === 0 ? (
                    <Text style={styles.noSellers}>Sin vendedoras activas.</Text>
                  ) : null}
                </View>
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
  search,
  selectedProductIds,
  setCategory,
  setSearch,
  toggleProduct,
}: {
  category: ProductCategory | "all";
  filteredProducts: Product[];
  formError: string | null;
  productsLoading: boolean;
  search: string;
  selectedProductIds: string[];
  setCategory: (category: ProductCategory | "all") => void;
  setSearch: (search: string) => void;
  toggleProduct: (productId: string) => void;
}) {
  return (
    <>
      <View style={styles.searchBox}>
        <Search color="rgba(155,93,229,0.52)" size={17} strokeWidth={2.2} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Buscar producto..."
          placeholderTextColor="rgba(90,60,120,0.36)"
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

      {productsLoading ? <ActivityIndicator color={colors.violet} /> : null}
      {!productsLoading && filteredProducts.length === 0 ? (
        <LiquidCard style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin productos disponibles</Text>
          <Text style={styles.emptyText}>Los productos disponibles para vender van a aparecer en esta sección.</Text>
        </LiquidCard>
      ) : null}
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    </>
  );
}

function HistoryContent({
  errorMessage,
  loading,
  onSalePress,
  sales,
  sellers,
}: {
  errorMessage: string | null;
  loading: boolean;
  onSalePress: (sale: Sale) => void;
  sales: Sale[];
  sellers: ApiProfile[];
}) {
  return (
    <>
      {errorMessage ? (
        <LiquidCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar las ventas</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </LiquidCard>
      ) : null}

      <View>
        <SectionLabel>Ventas realizadas</SectionLabel>
        <View style={styles.salesList}>
          {sales.map((sale) => {
            const seller = sellers.find((item) => item.id === sale.sellerId);

            return <SaleCard key={sale.id} sale={sale} seller={seller} onPress={() => onSalePress(sale)} />;
          })}
        </View>
        {!loading && sales.length === 0 ? (
          <LiquidCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin ventas registradas</Text>
          </LiquidCard>
        ) : null}
      </View>
    </>
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
        <X color="rgba(90,60,120,0.42)" size={14} strokeWidth={2.5} />
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
    <LiquidCard onPress={onPress} style={styles.saleCard}>
      <View style={[styles.saleStripe, { backgroundColor: sellerColor }]} />
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

function SaleDetail({
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
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [selectedReturnItemIds, setSelectedReturnItemIds] = useState<string[]>([]);

  const selectedReturnTotal = useMemo(
    () => sale.items.filter((item) => selectedReturnItemIds.includes(item.id)).reduce((sum, item) => sum + item.salePrice, 0),
    [sale.items, selectedReturnItemIds],
  );
  const refundedAmount = useMemo(() => returns.reduce((sum, item) => sum + item.refundAmount, 0), [returns]);
  const maxRefundAmount = Math.max(0, sale.paidAmount - refundedAmount);

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

    const defaultIds = returnableItems.map((item) => item.id);
    const defaultRefund = Math.min(
      returnableItems.reduce((sum, item) => sum + item.salePrice, 0),
      maxRefundAmount,
    );

    setSelectedReturnItemIds(defaultIds);
    setReturnForm({ ...initialReturnForm, refundAmount: String(defaultRefund) });
    setReturnError(null);
    setReturnOpen(true);
  };

  const closeReturn = () => {
    if (returnSaving) {
      return;
    }

    setReturnOpen(false);
    setReturnError(null);
    setReturnForm(initialReturnForm);
    setSelectedReturnItemIds([]);
  };

  const toggleReturnItem = (saleItemId: string) => {
    setSelectedReturnItemIds((current) =>
      current.includes(saleItemId) ? current.filter((id) => id !== saleItemId) : [...current, saleItemId],
    );
  };

  const registerReturn = async () => {
    if (!session) {
      return;
    }

    const refundAmount = Number.parseInt(returnForm.refundAmount || "0", 10);

    if (selectedReturnItemIds.length === 0) {
      setReturnError("Selecciona al menos un producto.");
      return;
    }

    if (!Number.isFinite(refundAmount) || refundAmount < 0) {
      setReturnError("El reintegro debe ser un numero valido.");
      return;
    }

    if (refundAmount > selectedReturnTotal) {
      setReturnError("El reintegro no puede superar el valor de los productos seleccionados.");
      return;
    }

    if (refundAmount > maxRefundAmount) {
      setReturnError("El reintegro no puede superar lo cobrado disponible.");
      return;
    }

    setReturnSaving(true);
    setReturnError(null);

    try {
      const payload: CreateReturnInput = {
        refundAmount,
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
      setReturnForm(initialReturnForm);
      setSelectedReturnItemIds([]);
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : "No se pudo registrar la devolucion");
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ChevronRight color={colors.violet} size={17} strokeWidth={2.4} style={styles.backIcon} />
        </Pressable>
        <View>
          <Text style={styles.detailTitle}>Venta #{sale.id.slice(0, 8)}</Text>
          <Text style={styles.detailDate}>{formatDate(sale.saleDate)}</Text>
        </View>
      </View>

      <DetailSection title="Comprador">
        <View style={styles.detailStack}>
          <View style={styles.detailLine}>
            <User color={colors.violet} size={14} strokeWidth={2.4} />
            <Text style={styles.detailStrong}>{sale.buyerFullName}</Text>
          </View>
          <View style={styles.detailLine}>
            <Phone color="rgba(90,60,120,0.45)" size={14} strokeWidth={2.4} />
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
            <GlassBadge label="Sin devolucion" tone="rgba(90,60,120,0.5)" />
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
              <Text style={styles.sheetTitle}>Gestionar devolucion</Text>
              <Pressable onPress={closeReturn} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.paymentSummary}>
                <AmountLine color={colors.foreground} label="Productos seleccionados" value={selectedReturnTotal} />
                <AmountLine color={colors.mint} label="Reintegro disponible" value={maxRefundAmount} />
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

              <FormField Icon={DollarSign} label="Reintegro">
                <TextInput
                  inputMode="numeric"
                  onChangeText={(value) => setReturnForm((current) => ({ ...current, refundAmount: value.replace(/\D/g, "") }))}
                  placeholder="0"
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={returnForm.refundAmount}
                />
              </FormField>

              <FormField Icon={ReceiptText} label="Motivo">
                <TextInput
                  onChangeText={(value) => setReturnForm((current) => ({ ...current, reason: value }))}
                  placeholder="Ej: Producto devuelto"
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={returnForm.reason}
                />
              </FormField>

              {returnError ? <Text style={styles.formError}>{returnError}</Text> : null}

              <Pressable disabled={returnSaving} onPress={registerReturn} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                {returnSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <RotateCcw color={colors.white} size={16} strokeWidth={2.5} />
                    <Text style={styles.confirmButtonText}>Guardar devolucion</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
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
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={paymentForm.amount}
                />
              </FormField>

              <FormField Icon={ReceiptText} label="Nota">
                <TextInput
                  onChangeText={(value) => setPaymentForm((current) => ({ ...current, note: value }))}
                  placeholder="Opcional"
                  placeholderTextColor="rgba(90,60,120,0.36)"
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
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 132,
    paddingHorizontal: 20,
    paddingTop: 16,
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
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(255,255,255,0.72)",
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
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.75)",
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
  filters: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.72)",
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
  productList: {
    gap: 12,
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
    backgroundColor: "rgba(255,255,255,0.55)",
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
  cartFab: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 92,
    flexDirection: "row",
    gap: 9,
    minHeight: 52,
    paddingHorizontal: 18,
    position: "absolute",
    right: 20,
    shadowColor: colors.violet,
    shadowOpacity: 0.5,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cartFabTotal: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  cartCount: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  cartCountText: {
    color: colors.white,
    fontSize: 11,
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
  salesList: {
    gap: 12,
  },
  saleCard: {
    flexDirection: "row",
    padding: 16,
  },
  saleStripe: {
    alignSelf: "stretch",
    backgroundColor: colors.violet,
    borderRadius: 999,
    marginRight: 12,
    width: 4,
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
    backgroundColor: "rgba(20,10,35,0.55)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(255,255,255,0.88)",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: colors.violet,
    shadowOpacity: 0.18,
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
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.78)",
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
    backgroundColor: "rgba(255,255,255,0.46)",
    borderColor: "rgba(255,255,255,0.75)",
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
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  detailContent: {
    gap: 16,
    paddingBottom: 112,
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
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(255,255,255,0.72)",
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
  returnItemOption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.46)",
    borderColor: "rgba(255,255,255,0.75)",
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
