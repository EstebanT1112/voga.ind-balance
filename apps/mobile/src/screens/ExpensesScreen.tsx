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
import {
  Boxes,
  CalendarDays,
  DollarSign,
  Megaphone,
  MoreHorizontal,
  LockKeyhole,
  Package,
  Plus,
  ReceiptText,
  Tag,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useAuth } from "../auth/AuthProvider";
import { ErrorState, GlassBadge, LiquidCard, SectionLabel, SkeletonBlock, SkeletonGroup, SuccessToast } from "../components/Liquid";
import type { CreateExpenseInput, Expense, ExpensesResponse } from "../expenses/expense.types";
import { apiRequest } from "../lib/api";
import { colors, formatMoney } from "../theme/liquid";

const expenseCategories: Array<{ color: string; Icon: LucideIcon; label: string }> = [
  { color: colors.violet, Icon: Package, label: "Productos" },
  { color: colors.rose, Icon: Boxes, label: "Mercaderia" },
  { color: colors.coral, Icon: Truck, label: "Envios" },
  { color: colors.lilac, Icon: ReceiptText, label: "Packaging" },
  { color: colors.mint, Icon: Megaphone, label: "Publicidad" },
  { color: colors.red, Icon: Wrench, label: "Servicios" },
  { color: colors.faint, Icon: MoreHorizontal, label: "Otros" },
];

function getExpenseCategoryConfig(category: string) {
  return expenseCategories.find((item) => item.label === category) ?? expenseCategories[expenseCategories.length - 1]!;
}

function getSoftBackground(color: string): string {
  return color.startsWith("#") ? `${color}18` : "rgba(255,255,255,0.08)";
}

const initialForm = {
  amount: "",
  category: "Mercaderia",
  description: "",
  note: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function ExpensesScreen() {
  const { session } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successExpense, setSuccessExpense] = useState<Expense | null>(null);

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const topCategory = useMemo(() => {
    const byCategory = new Map<string, number>();

    for (const expense of expenses) {
      byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
    }

    return [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  }, [expenses]);

  const loadExpenses = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<ExpensesResponse>("/expenses", {
        method: "GET",
        session,
      });

      setExpenses(response.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los gastos");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setForm(initialForm);
    setFormError(null);
  };

  const createExpense = async () => {
    if (!session) {
      return;
    }

    const amount = Number.parseInt(form.amount || "0", 10);

    if (!form.description.trim()) {
      setFormError("Completa la descripcion del gasto.");
      return;
    }

    if (!form.category.trim()) {
      setFormError("Selecciona una categoria.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("El monto debe ser mayor a cero.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload: CreateExpenseInput = {
        amount,
        category: form.category.trim(),
        description: form.description.trim(),
        note: form.note.trim() || null,
      };

      const response = await apiRequest<{ item: Expense }>("/expenses", {
        body: payload,
        method: "POST",
        session,
      });

      setExpenses((current) => [response.item, ...current]);
      setModalOpen(false);
      setForm(initialForm);
      setSuccessExpense(response.item);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async () => {
    if (!session || !expenseToDelete) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await apiRequest(`/expenses/${expenseToDelete.id}`, {
        method: "DELETE",
        session,
      });

      setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo borrar el gasto");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} tintColor={colors.violet} onRefresh={loadExpenses} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Gastos</Text>
            <Text style={styles.subtitle}>Costos y egresos del negocio</Text>
          </View>
          <Pressable onPress={() => setModalOpen(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Plus color={colors.white} size={19} strokeWidth={2.5} />
          </Pressable>
        </View>

        {errorMessage && expenses.length === 0 ? (
          <ErrorState
            message={errorMessage}
            onRetry={loadExpenses}
            retrying={loading}
            title="No se pudieron cargar los gastos"
          />
        ) : loading && expenses.length === 0 ? (
          <ExpenseScreenSkeleton />
        ) : (
        <>
        <View style={styles.kpiGrid}>
          <LiquidCard style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total cargado</Text>
            <Text style={styles.kpiValue}>{formatMoney(total)}</Text>
          </LiquidCard>
          <LiquidCard style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Mayor categoria</Text>
            <Text numberOfLines={1} style={styles.kpiValue}>
              {topCategory}
            </Text>
          </LiquidCard>
        </View>

        {errorMessage ? (
          <ErrorState
            message={errorMessage}
            onRetry={loadExpenses}
            retrying={loading}
            title="No se pudieron cargar los gastos"
          />
        ) : null}
        {deleteError ? <Text style={styles.formError}>{deleteError}</Text> : null}

        <View>
          <SectionLabel>Registro</SectionLabel>
          <View style={styles.expenseList}>
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onDelete={expense.isProductExpense ? undefined : () => setExpenseToDelete(expense)}
              />
            ))}
          </View>
          {!loading && !errorMessage && expenses.length === 0 ? (
            <LiquidCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin gastos cargados</Text>
              <Text style={styles.emptyText}>Los gastos que cargues van a impactar en las analiticas.</Text>
            </LiquidCard>
          ) : null}
        </View>
        </>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalOpen} onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo gasto</Text>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <X color={colors.violet} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {expenseCategories.map(({ color, Icon, label }) => {
                  const active = form.category === label;

                  return (
                    <Pressable
                      key={label}
                      onPress={() => setForm((current) => ({ ...current, category: label }))}
                      style={({ pressed }) => [styles.categoryChip, active && styles.categoryChipActive, pressed && styles.pressed]}
                    >
                      <Icon color={active ? colors.white : color} size={15} strokeWidth={2.4} />
                      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <FormField Icon={ReceiptText} label="Descripcion">
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder="Ej: Bolsas para envios"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.description}
                />
              </FormField>

              <FormField Icon={DollarSign} label="Monto">
                <TextInput
                  inputMode="numeric"
                  onChangeText={(value) => setForm((current) => ({ ...current, amount: value.replace(/\D/g, "") }))}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.amount}
                />
              </FormField>

              <FormField Icon={Tag} label="Nota">
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, note: value }))}
                  placeholder="Opcional"
                  placeholderTextColor="rgba(255,255,255,0.36)"
                  style={styles.formInput}
                  value={form.note}
                />
              </FormField>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Pressable disabled={saving} onPress={createExpense} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.confirmButtonText}>Guardar gasto</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={expenseToDelete !== null}
        onRequestClose={() => !deleting && setExpenseToDelete(null)}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => !deleting && setExpenseToDelete(null)} />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Trash2 color={colors.red} size={22} strokeWidth={2.4} />
            </View>
            <Text style={styles.confirmTitle}>Eliminar gasto</Text>
            <Text style={styles.confirmText}>Esta accion no se puede deshacer.</Text>
            {expenseToDelete ? (
              <View style={styles.confirmSummary}>
                <Text numberOfLines={2} style={styles.confirmExpenseName}>{expenseToDelete.description}</Text>
                <Text style={styles.confirmExpenseAmount}>{formatMoney(expenseToDelete.amount)}</Text>
              </View>
            ) : null}
            <View style={styles.confirmActions}>
              <Pressable
                disabled={deleting}
                onPress={() => setExpenseToDelete(null)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={deleting}
                onPress={deleteExpense}
                style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.pressed]}
              >
                {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.deleteConfirmText}>Eliminar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessToast
        detail={successExpense ? `${successExpense.description} - ${formatMoney(successExpense.amount)}` : undefined}
        onHidden={() => setSuccessExpense(null)}
        title="Gasto registrado"
        visible={successExpense !== null}
      />
    </View>
  );
}

function ExpenseScreenSkeleton() {
  return (
    <SkeletonGroup style={styles.expenseSkeleton}>
      <View style={styles.expenseSkeletonKpis}>
        {Array.from({ length: 2 }, (_, index) => (
          <View key={index} style={styles.expenseSkeletonKpi}>
            <SkeletonBlock style={styles.expenseSkeletonLabel} />
            <SkeletonBlock style={styles.expenseSkeletonValue} />
          </View>
        ))}
      </View>

      <SkeletonBlock style={styles.expenseSkeletonSection} />
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.expenseSkeletonCard}>
          <SkeletonBlock style={styles.expenseSkeletonIcon} />
          <View style={styles.expenseSkeletonBody}>
            <SkeletonBlock style={styles.expenseSkeletonTitle} />
            <View style={styles.expenseSkeletonMetaRow}>
              <SkeletonBlock style={styles.expenseSkeletonBadge} />
              <SkeletonBlock style={styles.expenseSkeletonDate} />
            </View>
          </View>
          <View style={styles.expenseSkeletonRight}>
            <SkeletonBlock style={styles.expenseSkeletonAmount} />
            <SkeletonBlock style={styles.expenseSkeletonAction} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function ExpenseCard({ expense, onDelete }: { expense: Expense; onDelete?: () => void }) {
  const { color, Icon } = getExpenseCategoryConfig(expense.category);

  return (
    <LiquidCard style={styles.expenseCard}>
      <View style={[styles.expenseIcon, { backgroundColor: getSoftBackground(color) }]}>
        <Icon color={color} size={18} strokeWidth={2.3} />
      </View>
      <View style={styles.expenseInfo}>
        <Text numberOfLines={1} style={styles.expenseTitle}>
          {expense.description}
        </Text>
        <View style={styles.expenseMeta}>
          <GlassBadge label={expense.category} tone={color} />
          {expense.isProductExpense ? <GlassBadge label="Automatico" tone={colors.violet} /> : null}
          <View style={styles.datePill}>
            <CalendarDays color={colors.faint} size={12} strokeWidth={2.4} />
            <Text style={styles.dateText}>{formatDate(expense.spentAt)}</Text>
          </View>
        </View>
        {expense.note && !expense.isProductExpense ? <Text style={styles.expenseNote}>{expense.note}</Text> : null}
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>{formatMoney(expense.amount)}</Text>
        {onDelete ? (
          <Pressable onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <Trash2 color={colors.red} size={16} strokeWidth={2.3} />
          </Pressable>
        ) : (
          <View style={styles.lockedExpense}>
            <LockKeyhole color={colors.violet} size={15} strokeWidth={2.4} />
          </View>
        )}
      </View>
    </LiquidCard>
  );
}

function FormField({
  children,
  Icon,
  label,
}: {
  children: React.ReactNode;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <View>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Icon color="rgba(155,93,229,0.52)" size={17} strokeWidth={2.2} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: {
    gap: 16,
    paddingBottom: 132,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  addButton: {
    alignItems: "center",
    backgroundColor: colors.violet,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    width: 44,
  },
  kpiGrid: { flexDirection: "row", gap: 12 },
  kpiCard: { flex: 1, padding: 16 },
  kpiLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  kpiValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  expenseSkeleton: {
    gap: 12,
  },
  expenseSkeletonKpis: {
    flexDirection: "row",
    gap: 12,
  },
  expenseSkeletonKpi: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  expenseSkeletonLabel: {
    height: 10,
    width: "62%",
  },
  expenseSkeletonValue: {
    height: 19,
    marginTop: 9,
    width: "82%",
  },
  expenseSkeletonSection: {
    height: 10,
    marginBottom: 1,
    marginTop: 5,
    width: 68,
  },
  expenseSkeletonCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 14,
  },
  expenseSkeletonIcon: {
    borderRadius: 16,
    height: 44,
    width: 44,
  },
  expenseSkeletonBody: {
    flex: 1,
    gap: 9,
  },
  expenseSkeletonTitle: {
    height: 13,
    width: "72%",
  },
  expenseSkeletonMetaRow: {
    flexDirection: "row",
    gap: 7,
  },
  expenseSkeletonBadge: {
    height: 19,
    width: 64,
  },
  expenseSkeletonDate: {
    height: 11,
    marginTop: 4,
    width: 46,
  },
  expenseSkeletonRight: {
    alignItems: "flex-end",
    gap: 9,
  },
  expenseSkeletonAmount: {
    height: 16,
    width: 68,
  },
  expenseSkeletonAction: {
    borderRadius: 999,
    height: 30,
    width: 30,
  },
  expenseList: { gap: 12 },
  expenseCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  expenseIcon: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.09)",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  expenseInfo: { flex: 1 },
  expenseTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  expenseMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  datePill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  dateText: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "900",
  },
  expenseNote: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  expenseRight: {
    alignItems: "flex-end",
    gap: 9,
  },
  expenseAmount: {
    color: colors.red,
    fontSize: 14,
    fontWeight: "900",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.1)",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  lockedExpense: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.1)",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  confirmModalRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  confirmCard: {
    alignItems: "center",
    backgroundColor: "#171717",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 22,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    width: "100%",
  },
  confirmIcon: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.12)",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    marginBottom: 13,
    width: 52,
  },
  confirmTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  confirmText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  confirmSummary: {
    alignItems: "center",
    backgroundColor: "rgba(224,82,113,0.07)",
    borderColor: "rgba(224,82,113,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
    width: "100%",
  },
  confirmExpenseName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  confirmExpenseAmount: {
    color: colors.red,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "rgba(155,93,229,0.09)",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: colors.violet,
    fontSize: 14,
    fontWeight: "900",
  },
  deleteConfirmButton: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  deleteConfirmText: {
    color: colors.white,
    fontSize: 14,
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
  emptyCard: { padding: 18 },
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
  formLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  categoryChipActive: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryTextActive: { color: colors.white },
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
  formInput: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 46,
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
});
