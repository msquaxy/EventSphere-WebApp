import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { initials } from "@/lib/format";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/* ------------------------------------------------------------------ Screen */

export function Screen({
  children,
  scroll = true,
  edges = ["top"],
  keyboard = false,
  contentStyle,
  refreshControl,
  background = colors.background,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  background?: string;
}) {
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[styles.screenContent, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ Text */

export function Kicker({ children }: { children: ReactNode }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Heading({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return <Text style={[styles.heading, { fontSize: size, lineHeight: size * 1.18 }]}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "dark" | "lime" | "outline" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "dark",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  small = false,
  full = true,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    dark: { bg: colors.ink, fg: "#fff", border: colors.ink },
    lime: { bg: colors.lime, fg: colors.inkDark, border: colors.lime },
    outline: { bg: "transparent", fg: colors.ink, border: colors.borderDark },
    ghost: { bg: "transparent", fg: colors.ink, border: "transparent" },
    danger: { bg: "transparent", fg: colors.danger, border: "#e4b5ae" },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        !full && { alignSelf: "flex-start" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={small ? 15 : 18} color={palette.fg} />
      ) : null}
      <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
      {iconRight && !loading ? <Ionicons name={iconRight} size={small ? 15 : 18} color={palette.fg} /> : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Inputs */

export function TextField({
  label,
  icon,
  error,
  hint,
  secure = false,
  style,
  inputStyle,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string;
  hint?: string;
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: "#6a8c3b" },
          error ? { borderColor: colors.danger } : null,
          props.multiline && { alignItems: "flex-start" },
          props.editable === false && { backgroundColor: colors.cream },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={props.multiline ? { marginTop: 13 } : undefined} /> : null}
        <TextInput
          placeholderTextColor="#9aa39d"
          {...props}
          secureTextEntry={secure ? hidden : props.secureTextEntry}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }, inputStyle as never]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((value) => !value)} hitSlop={10} accessibilityLabel={hidden ? "Show password" : "Hide password"}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? "#fff" : colors.ink} /> : null}
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <Chip key={option} label={option} selected={value === option} onPress={() => onChange(option)} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ Feedback */

const pillColors: Record<string, { bg: string; fg: string; label?: string }> = {
  valid: { bg: colors.successSoft, fg: colors.success, label: "Ready to go" },
  paid: { bg: colors.successSoft, fg: colors.success },
  published: { bg: colors.successSoft, fg: colors.success },
  active: { bg: colors.successSoft, fg: colors.success },
  pending: { bg: colors.warnSoft, fg: colors.warn },
  draft: { bg: colors.warnSoft, fg: colors.warn },
  checked_in: { bg: colors.infoSoft, fg: colors.ink, label: "Checked in" },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger },
  expired: { bg: colors.dangerSoft, fg: colors.danger },
  refund_required: { bg: colors.dangerSoft, fg: colors.danger, label: "Refund due" },
  suspended: { bg: colors.dangerSoft, fg: colors.danger },
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const palette = pillColors[status] || { bg: colors.infoSoft, fg: colors.ink };
  const text = label || palette.label || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

export function Notice({
  kind = "info",
  children,
  onDismiss,
}: {
  kind?: "info" | "error" | "success";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const palette = {
    info: { bg: colors.infoSoft, fg: colors.ink, icon: "information-circle-outline" as IconName },
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: "alert-circle-outline" as IconName },
    success: { bg: colors.successSoft, fg: colors.success, icon: "checkmark-circle-outline" as IconName },
  }[kind];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={19} color={palette.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{children}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color={palette.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.ink} />
      <Text style={[styles.body, { color: colors.muted, marginTop: 14, textAlign: "center" }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "sparkles-outline",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.ink} />
      </View>
      <Text style={[styles.heading, { fontSize: 19, textAlign: "center" }]}>{title}</Text>
      {description ? <Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{description}</Text> : null}
      {action}
    </View>
  );
}

export function Stat({ icon, label, value, note }: { icon: IconName; label: string; value: string | number; note?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 64 }: { name?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.headingXL, fontSize: size * 0.34, color: colors.inkDark }}>{initials(name)}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && { color: "#fff" }]}>
              {option.label}
              {option.count !== undefined ? `  ${option.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Sheet */

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.heading, { fontSize: 19 }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: 20, paddingBottom: 40, gap: 16 },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color: "#49703e" },
  heading: { fontFamily: fonts.headingXL, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonSmall: { minHeight: 38, paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.sm },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: "#34443b" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: 10 },
  fieldError: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bold, fontSize: 11 },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.md, alignItems: "flex-start" },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, minHeight: 240 },
  empty: { alignItems: "center", gap: 10, padding: 28, borderRadius: radius.lg, backgroundColor: colors.cream, marginTop: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  stat: { flex: 1, minWidth: "46%", backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 4, borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.muted },
  statValue: { fontFamily: fonts.headingXL, fontSize: 24, color: colors.ink },
  statNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  segmented: { flexDirection: "row", backgroundColor: colors.cream, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.ink },
  segmentText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(16,46,39,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" },
  sheetHandle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.borderDark, marginTop: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14 },
});

export { shadow };
