import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, shadow } from "./theme";

export function Card({ children, tone = "white" }: PropsWithChildren<{ tone?: "white" | "mint" | "peach" | "lavender" }>) {
  const backgroundColor = { white: colors.card, mint: colors.mint, peach: colors.peachSoft, lavender: colors.lavender }[tone];
  return <View style={[styles.card, { backgroundColor }]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Pill({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={label} accessibilityState={onPress ? { selected: active } : undefined} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, quiet = false }: { label: string; onPress: () => void; quiet?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.button, quiet && styles.buttonQuiet]}>
      <Text style={[styles.buttonText, quiet && styles.buttonQuietText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, marginBottom: 14, ...shadow },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  sectionAction: { color: colors.sageDark, fontSize: 13, fontWeight: "600" },
  pill: { borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, marginRight: 8 },
  pillActive: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  pillText: { color: colors.inkSoft, fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "white" },
  button: { backgroundColor: colors.sageDark, minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonQuiet: { backgroundColor: colors.mint },
  buttonText: { color: "white", fontSize: 15, fontWeight: "700" },
  buttonQuietText: { color: colors.sageDark }
});
