import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Avatar, Body, Button, ChipGroup, Heading, Kicker, Loading, Notice, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/format";
import type { UserProfile } from "@/types";
import { colors, fonts, radius } from "@/lib/theme";

const CITIES = ["Manila", "Makati", "Quezon City", "Pasig", "Taguig", "Other"];

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <Screen><Loading /></Screen>;
  if (!isAuthenticated || !user) {
    return (
      <Screen>
        <View style={{ gap: 6 }}>
          <Kicker>YOUR ACCOUNT</Kicker>
          <Heading size={30}>Welcome to EventSphere</Heading>
        </View>
        <SignInPrompt title="Log in to your account" description="Use the same email and password as the website. Your tickets and saved events come with you." />
      </Screen>
    );
  }

  return <ProfileForm key={user.id} profile={user} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const { updateUser, resetPassword, logout, isOrganizer, isAdmin } = useAuth();
  const [form, setForm] = useState({ fullName: profile.fullName || "", city: profile.city || "Manila", phone: profile.phone || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const save = async () => {
    setError("");
    setNotice("");
    if (form.fullName.trim().length < 2) return setError("Enter your full name.");
    setSaving(true);
    try {
      await updateUser({ ...form, fullName: form.fullName.trim() });
      setNotice("Your profile is up to date.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    setError("");
    setNotice("");
    try {
      await resetPassword(profile.email);
      setNotice(`A password reset link is on its way to ${profile.email}.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const signOut = () =>
    Alert.alert("Log out?", "You can log back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);

  return (
    <Screen keyboard>
      <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
        <Avatar name={profile.fullName} size={84} />
        <Text style={{ fontFamily: fonts.headingXL, fontSize: 22, color: colors.ink }}>{profile.fullName}</Text>
        <Body muted>{profile.email}</Body>
        <View style={{ backgroundColor: colors.limeSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.ink }}>
            {isAdmin ? "Administrator" : isOrganizer ? "Event organizer" : "Event explorer"}
          </Text>
        </View>
      </View>
      {isAdmin ? <Notice>The admin console (members, events and bookings) is available on the EventSphere website.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {notice ? <Notice kind="success">{notice}</Notice> : null}
      <Heading size={20}>Profile details</Heading>
      <TextField label="Full name" icon="person-outline" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} autoComplete="name" />
      <TextField label="Email address" icon="mail-outline" value={profile.email} editable={false} hint="Managed by Firebase" />
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: "#34443b" }}>City</Text>
        <ChipGroup options={CITIES} value={form.city} onChange={(city) => setForm({ ...form, city })} />
      </View>
      <TextField label="Phone number" icon="call-outline" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} placeholder="Optional" keyboardType="phone-pad" />
      <Button title={saving ? "Saving…" : "Save changes"} icon="save-outline" onPress={save} loading={saving} />
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
      <Heading size={20}>Password & security</Heading>
      <Body muted>Send a secure reset link to {profile.email}.</Body>
      <Button title="Reset password" variant="outline" icon="lock-closed-outline" onPress={sendReset} />
      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}
