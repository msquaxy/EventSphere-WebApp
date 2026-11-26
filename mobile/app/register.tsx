import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Body, Button, Heading, Kicker, Notice, Screen, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { Role } from "@/types";

export default function Register() {
  const router = useRouter();
  const { register, firebaseReady } = useAuth();
  const [role, setRole] = useState<Extract<Role, "attendee" | "organizer">>("attendee");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setError("");
    if (form.fullName.trim().length < 2) return setError("Enter your full name.");
    if (!form.email.trim()) return setError("Enter your email address.");
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    if (form.password !== form.confirm) return setError("Your passwords do not match.");
    setSubmitting(true);
    try {
      await register({ fullName: form.fullName, email: form.email, password: form.password, role });
      router.replace({ pathname: "/login", params: { message: "Your account is ready. Log in to start exploring." } });
    } catch (err) {
      setError(errorMessage(err, "Could not create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboard edges={["bottom"]} contentStyle={{ gap: 16, paddingTop: 12 }}>
      <View style={{ gap: 8 }}>
        <Kicker>COME ON IN</Kicker>
        <Heading size={30}>Make room for good times.</Heading>
        <Body muted>Create your free EventSphere account in a minute. It works on the website too.</Body>
      </View>
      {!firebaseReady ? <Notice kind="error">Firebase isn’t configured. Add your settings to .env first.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <RoleCard icon="ticket-outline" title="I’m here to explore" note="Find events and book tickets" selected={role === "attendee"} onPress={() => setRole("attendee")} />
        <RoleCard icon="calendar-outline" title="I want to host" note="Create and manage events" selected={role === "organizer"} onPress={() => setRole("organizer")} />
      </View>
      <TextField label="Full name" icon="person-outline" value={form.fullName} onChangeText={set("fullName")} placeholder="Your full name" autoComplete="name" editable={firebaseReady} />
      <TextField
        label="Email address"
        icon="mail-outline"
        value={form.email}
        onChangeText={set("email")}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={firebaseReady}
      />
      <TextField label="Password" icon="lock-closed-outline" value={form.password} onChangeText={set("password")} placeholder="8+ characters" secure autoCapitalize="none" editable={firebaseReady} />
      <TextField label="Confirm password" icon="lock-closed-outline" value={form.confirm} onChangeText={set("confirm")} placeholder="Repeat password" secure autoCapitalize="none" editable={firebaseReady} />
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
        By creating an account you agree to the community guidelines and terms of service.
      </Text>
      <Button
        title={submitting ? "Creating your account…" : role === "organizer" ? "Create organizer account" : "Create my account"}
        iconRight="arrow-forward"
        onPress={submit}
        loading={submitting}
        disabled={!firebaseReady}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>Already have an account?</Text>
        <Pressable onPress={() => router.replace("/login")}>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function RoleCard({
  icon,
  title,
  note,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  note: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.role, selected && styles.roleSelected]}>
      <View style={[styles.roleIcon, selected && { backgroundColor: colors.lime }]}>
        <Ionicons name={icon} size={19} color={colors.ink} />
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleNote}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  role: { flex: 1, gap: 6, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  roleSelected: { borderColor: colors.ink, backgroundColor: colors.limeSoft },
  roleIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontFamily: fonts.heading, fontSize: 14, color: colors.ink },
  roleNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
