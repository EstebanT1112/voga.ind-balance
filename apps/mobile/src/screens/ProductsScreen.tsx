import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
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
import { Camera, Edit3, FileText, ImagePlus, Plus, Ruler, Save, Search, Shirt, Tag, X } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import { GlassBadge, LiquidCard } from "../components/Liquid";
import { apiRequest } from "../lib/api";
import { getProductPhotoUrl, uploadProductPhoto } from "../products/productPhotos";
import type {
  CreateProductInput,
  Product,
  ProductCategory,
  ProductStatus,
  ProductsResponse,
  UpdateProductInput,
} from "../products/product.types";
import { colors, formatMoney } from "../theme/liquid";

const categories: Array<{ label: string; value: ProductCategory | "all" }> = [
  { label: "Todas", value: "all" },
  { label: "Superior", value: "upper" },
  { label: "Inferior", value: "lower" },
  { label: "Lenceria", value: "lingerie" },
];

const statusLabels: Record<ProductStatus, string> = {
  available: "Disponible",
  sold: "Vendido",
};

const statusFilters: Array<{ label: string; value: ProductStatus | "all" }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Vendidos", value: "sold" },
];

const categoryLabels: Record<ProductCategory, string> = {
  lingerie: "Lenceria",
  lower: "Inferior",
  upper: "Superior",
};

const initialForm = {
  category: "upper" as ProductCategory,
  description: "",
  name: "",
  purchasePrice: "",
  salePrice: "",
  size: "",
  subcategory: "",
};

export function ProductsScreen() {
  const { profile, session } = useAuth();
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();

      if (category !== "all") {
        params.set("category", category);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const suffix = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest<ProductsResponse>(`/products${suffix}`, {
        method: "GET",
        session,
      });

      setProducts(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el catalogo");
    } finally {
      setLoading(false);
    }
  }, [category, search, session]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totals = useMemo(
    () => ({
      available: products.filter((product) => product.status === "available").length,
      sold: products.filter((product) => product.status === "sold").length,
    }),
    [products],
  );

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => statusFilter === "all" || product.status === statusFilter)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "available" ? -1 : 1;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, statusFilter]);

  const resetForm = () => {
    setForm(initialForm);
    setFormError(null);
    setImageAsset(null);
    setEditingProduct(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setSelectedProduct(null);
    setEditingProduct(product);
    setImageAsset(null);
    setForm({
      category: product.category,
      description: product.description ?? "",
      name: product.name,
      purchasePrice: String(product.purchasePrice ?? 0),
      salePrice: String(product.salePrice),
      size: product.size,
      subcategory: product.subcategory ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setFormOpen(false);
    resetForm();
  };

  const pickImage = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitamos permiso para acceder a la foto del producto.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            base64: true,
            quality: 0.82,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            base64: true,
            mediaTypes: ["images"],
            quality: 0.82,
          });

    if (!result.canceled) {
      setImageAsset(result.assets[0] ?? null);
    }
  };

  const saveProduct = async () => {
    if (!session || !profile) {
      return;
    }

    const purchasePrice = Number.parseInt(form.purchasePrice, 10);
    const salePrice = Number.parseInt(form.salePrice, 10);

    if (!form.name.trim() || !form.size.trim() || !Number.isFinite(purchasePrice) || !Number.isFinite(salePrice)) {
      setFormError("Completá nombre, talle, costo y precio de venta.");
      return;
    }

    if (salePrice < purchasePrice) {
      setFormError("El precio de venta no puede ser menor al costo.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      let photoPath: string | null = editingProduct?.photoPath ?? null;

      if (imageAsset) {
        try {
          photoPath = await uploadProductPhoto(imageAsset, profile.id);
        } catch (error) {
          throw new Error(
            error instanceof Error ? `No se pudo subir la foto: ${error.message}` : "No se pudo subir la foto",
          );
        }
      }

      const payload: CreateProductInput | UpdateProductInput = {
        category: form.category,
        description: form.description.trim() || null,
        name: form.name.trim(),
        photoPath,
        purchasePrice,
        salePrice,
        size: form.size.trim(),
        subcategory: form.subcategory.trim() || null,
      };

      const response = await apiRequest<{ item: Product }>(editingProduct ? `/products/${editingProduct.id}` : "/products", {
        body: payload,
        method: editingProduct ? "PATCH" : "POST",
        session,
      });

      setFormOpen(false);
      setSelectedProduct(response.item);
      resetForm();
      await loadProducts();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadProducts} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Catálogo</Text>
          <Text style={styles.subtitle}>
            {totals.available} disponibles · {totals.sold} vendidos
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Search color="rgba(155,93,229,0.52)" size={17} strokeWidth={2.2} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Buscar producto..."
            placeholderTextColor="rgba(90,60,120,0.36)"
            returnKeyType="search"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {statusFilters.map((item) => {
            const active = item.value === statusFilter;

            return (
              <Pressable
                key={item.value}
                onPress={() => setStatusFilter(item.value)}
                style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {errorMessage ? (
          <LiquidCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>No se pudo cargar el catalogo</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </LiquidCard>
        ) : null}

        <View style={styles.grid}>
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} showCost={profile?.role === "owner"} onPress={() => setSelectedProduct(product)} />
          ))}
          {!loading && visibleProducts.length === 0 ? (
            <LiquidCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin productos</Text>
              <Text style={styles.emptyText}>Cuando cargues productos van a aparecer en esta seccion.</Text>
            </LiquidCard>
          ) : null}
        </View>
      </ScrollView>

      {profile?.role === "owner" ? (
        <Pressable onPress={openCreateForm} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Plus color={colors.white} size={19} strokeWidth={2.5} />
          <Text style={styles.fabText}>Agregar</Text>
        </Pressable>
      ) : null}

      <Modal animationType="slide" transparent visible={formOpen} onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editingProduct ? "Editar producto" : "Nuevo producto"}</Text>
                <Text style={styles.sheetSubtitle}>{editingProduct ? "Actualiza los datos del producto" : "Carga foto, precio y clasificacion"}</Text>
              </View>
              <Pressable onPress={closeForm} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Pressable onPress={() => pickImage("library")} style={({ pressed }) => [styles.photoDrop, pressed && styles.pressed]}>
                {imageAsset ? (
                  <Image source={{ uri: imageAsset.uri }} style={styles.photoPreviewImage} />
                ) : (
                  <>
                    <Camera color="rgba(155,93,229,0.5)" size={22} strokeWidth={2.2} />
                    <Text style={styles.photoDropText}>Agregar foto</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={() => pickImage("camera")} style={({ pressed }) => [styles.cameraLink, pressed && styles.pressed]}>
                <Camera color={colors.violet} size={14} strokeWidth={2.4} />
                <Text style={styles.cameraLinkText}>Usar cámara</Text>
              </Pressable>

              <FormField Icon={Tag} label="Nombre">
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder="Remera básica oversize"
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={styles.formInput}
                  value={form.name}
                />
              </FormField>

              <FormField Icon={Ruler} label="Talle">
                  <TextInput
                    autoCapitalize="characters"
                    onChangeText={(value) => setForm((current) => ({ ...current, size: value }))}
                    placeholder="M, 38, S/M"
                    placeholderTextColor="rgba(90,60,120,0.36)"
                    style={styles.formInput}
                    value={form.size}
                  />
              </FormField>

              <FormField Icon={FileText} label="Descripción">
                <TextInput
                  multiline
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder="Breve descripción..."
                  placeholderTextColor="rgba(90,60,120,0.36)"
                  style={[styles.formInput, styles.textArea]}
                  value={form.description}
                />
              </FormField>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Categoría</Text>
                  <View style={styles.categoryStack}>
                    {categories
                      .filter((item): item is { label: string; value: ProductCategory } => item.value !== "all")
                      .map((item) => {
                        const active = form.category === item.value;

                        return (
                          <Pressable
                            key={item.value}
                            onPress={() => setForm((current) => ({ ...current, category: item.value }))}
                            style={({ pressed }) => [
                              styles.categoryOption,
                              active && styles.categoryOptionActive,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text style={[styles.categoryOptionText, active && styles.categoryOptionTextActive]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
                <FormField label="Subclasificación" style={styles.formHalf}>
                  <TextInput
                    onChangeText={(value) => setForm((current) => ({ ...current, subcategory: value }))}
                    placeholder="Remera"
                    placeholderTextColor="rgba(90,60,120,0.36)"
                    style={styles.formInput}
                    value={form.subcategory}
                  />
                </FormField>
              </View>

              <View style={styles.formRow}>
                <FormField label="Precio compra" style={styles.formHalf}>
                  <View style={styles.moneyInputWrap}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      inputMode="numeric"
                      onChangeText={(value) => setForm((current) => ({ ...current, purchasePrice: value.replace(/\D/g, "") }))}
                      placeholder="0"
                      placeholderTextColor="rgba(90,60,120,0.36)"
                      style={styles.moneyInput}
                      value={form.purchasePrice}
                    />
                  </View>
                </FormField>
                <FormField label="Precio venta" style={styles.formHalf}>
                  <View style={styles.moneyInputWrap}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      inputMode="numeric"
                      onChangeText={(value) => setForm((current) => ({ ...current, salePrice: value.replace(/\D/g, "") }))}
                      placeholder="0"
                      placeholderTextColor="rgba(90,60,120,0.36)"
                      style={styles.moneyInput}
                      value={form.salePrice}
                    />
                  </View>
                </FormField>
              </View>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Pressable disabled={saving} onPress={saveProduct} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Save color={colors.white} size={17} strokeWidth={2.4} />
                    <Text style={styles.saveButtonText}>{editingProduct ? "Guardar cambios" : "Guardar producto"}</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent visible={selectedProduct !== null} onRequestClose={() => setSelectedProduct(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedProduct(null)} />
          {selectedProduct ? (
            <ProductDetailSheet
              product={selectedProduct}
              showCost={profile?.role === "owner"}
              onClose={() => setSelectedProduct(null)}
              onEdit={selectedProduct.status === "available" && profile?.role === "owner" ? () => openEditForm(selectedProduct) : undefined}
            />
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FormField({
  children,
  Icon,
  label,
  style,
}: {
  children: ReactNode;
  Icon?: LucideIcon;
  label: string;
  style?: object;
}) {
  return (
    <View style={[styles.formField, style]}>
      <Text style={styles.formLabel}>{label}</Text>
      {Icon ? (
        <View style={styles.inputWrap}>
          <Icon color="rgba(155,93,229,0.5)" size={14} strokeWidth={2.4} />
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function ProductPhoto({ photoPath, style }: { photoPath: string | null; style: object }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!photoPath) {
      setPhotoUrl(null);
      return;
    }

    getProductPhotoUrl(photoPath)
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
  }, [photoPath]);

  return photoUrl ? (
    <Image source={{ uri: photoUrl }} style={style} />
  ) : (
    <View style={[style, styles.imagePlaceholder]}>
      <Shirt color="rgba(155,93,229,0.44)" size={30} strokeWidth={1.8} />
    </View>
  );
}

function ProductCard({
  onPress,
  product,
  showCost,
}: {
  onPress: () => void;
  product: Product;
  showCost: boolean;
}) {
  const sold = product.status === "sold";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.productPressable, pressed && styles.pressed]}>
      <LiquidCard style={[styles.productCard, sold && styles.soldCard]}>
      <View style={styles.imageWrap}>
        <ProductPhoto photoPath={product.photoPath} style={styles.image} />
        {sold ? (
          <View style={styles.soldOverlay}>
            <GlassBadge label="Vendido" tone={colors.violet} />
          </View>
        ) : null}
      </View>

      <View style={styles.productBody}>
        <Text numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <View style={styles.badges}>
          <GlassBadge label={categoryLabels[product.category]} tone={colors.violet} />
          <GlassBadge label={`T: ${product.size}`} tone={colors.rose} />
        </View>
        {product.subcategory ? (
          <View style={styles.subcategory}>
            <Tag color="rgba(90,60,120,0.45)" size={12} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.subcategoryText}>
              {product.subcategory}
            </Text>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          {showCost ? (
            <View>
              <Text style={styles.priceLabel}>Costo</Text>
              <Text style={styles.costValue}>{formatMoney(product.purchasePrice ?? 0)}</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>{statusLabels[product.status]}</Text>
          )}
          <View style={styles.salePriceBox}>
            <Text style={styles.priceLabel}>Venta</Text>
            <Text style={styles.saleValue}>{formatMoney(product.salePrice)}</Text>
          </View>
        </View>
      </View>
      </LiquidCard>
    </Pressable>
  );
}

function ProductDetailSheet({
  onClose,
  onEdit,
  product,
  showCost,
}: {
  onClose: () => void;
  onEdit?: () => void;
  product: Product;
  showCost: boolean;
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.sheetTitle}>{product.name}</Text>
          <Text style={styles.sheetSubtitle}>{statusLabels[product.status]}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X color={colors.violet} size={18} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailImageWrap}>
          <ProductPhoto photoPath={product.photoPath} style={styles.detailImage} />
        </View>

        <View style={styles.badges}>
          <GlassBadge label={categoryLabels[product.category]} tone={colors.violet} />
          <GlassBadge label={`T: ${product.size}`} tone={colors.rose} />
          {product.subcategory ? <GlassBadge label={product.subcategory} tone={colors.coral} /> : null}
        </View>

        {product.description ? <Text style={styles.detailDescription}>{product.description}</Text> : null}

        <View style={styles.detailPriceGrid}>
          {showCost ? (
            <View style={styles.detailPriceCard}>
              <Text style={styles.priceLabel}>Compra</Text>
              <Text style={styles.detailPriceValue}>{formatMoney(product.purchasePrice ?? 0)}</Text>
            </View>
          ) : null}
          <View style={styles.detailPriceCard}>
            <Text style={styles.priceLabel}>Venta</Text>
            <Text style={styles.detailPriceValue}>{formatMoney(product.salePrice)}</Text>
          </View>
        </View>

        {onEdit ? (
          <Pressable onPress={onEdit} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Edit3 color={colors.white} size={16} strokeWidth={2.5} />
            <Text style={styles.editButtonText}>Editar producto</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 126,
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
    marginTop: 2,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.36)",
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 15,
    shadowColor: colors.violet,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    borderColor: "rgba(255,255,255,0.42)",
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: "100%",
  },
  productPressable: {
    width: "47.9%",
  },
  soldCard: {
    opacity: 0.72,
  },
  imageWrap: {
    height: 120,
    overflow: "hidden",
  },
  image: {
    backgroundColor: "rgba(155,93,229,0.08)",
    height: "100%",
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.08)",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  soldOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.25)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  productBody: {
    padding: 12,
  },
  productName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    minHeight: 34,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  subcategory: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  subcategoryText: {
    color: colors.faint,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  priceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  costValue: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  salePriceBox: {
    alignItems: "flex-end",
  },
  saleValue: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  statusText: {
    color: colors.muted,
    fontSize: 11,
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
    marginTop: 4,
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 92,
    flexDirection: "row",
    gap: 7,
    minHeight: 50,
    paddingHorizontal: 18,
    position: "absolute",
    right: 20,
    shadowColor: colors.violet,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  fabText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(20,10,35,0.52)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.88)",
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
  formContent: {
    gap: 15,
    paddingBottom: 28,
  },
  photoDrop: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.06)",
    borderColor: "rgba(155,93,229,0.25)",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    gap: 8,
    height: 112,
    justifyContent: "center",
    overflow: "hidden",
  },
  photoPreviewImage: {
    height: "100%",
    width: "100%",
  },
  photoDropText: {
    color: "rgba(90,60,120,0.5)",
    fontSize: 12,
    fontWeight: "800",
  },
  cameraLink: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  cameraLinkText: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: "900",
  },
  formField: {
    gap: 7,
  },
  formLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
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
  formInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 46,
  },
  textArea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  categoryStack: {
    gap: 8,
  },
  categoryOption: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  categoryOptionActive: {
    backgroundColor: colors.violet,
  },
  categoryOptionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  categoryOptionTextActive: {
    color: colors.white,
  },
  moneyInputWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  currencyPrefix: {
    color: "rgba(155,93,229,0.6)",
    fontSize: 12,
    fontWeight: "900",
  },
  moneyInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    minHeight: 46,
  },
  formError: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 21,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  detailContent: {
    gap: 16,
    paddingBottom: 30,
  },
  detailImageWrap: {
    borderRadius: 24,
    height: 260,
    overflow: "hidden",
  },
  detailImage: {
    backgroundColor: "rgba(155,93,229,0.08)",
    height: "100%",
    width: "100%",
  },
  detailDescription: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  detailPriceGrid: {
    flexDirection: "row",
    gap: 12,
  },
  detailPriceCard: {
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  detailPriceValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 20,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
});
