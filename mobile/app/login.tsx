import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Body, Button, Heading, Kicker, Notice, Screen, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { colors, fonts } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { login, resetPassword, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(message || "");

  const finish = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const submit = async () => {
    setError("");
    setNotice("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setSubmitting(true);
    try {
      await login(email, password);
      finish();
    } catch (err) {
      setError(errorMessage(err, "Could not log in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const forgot = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Enter your email above, then tap “Forgot password?” again.");
    try {
      await resetPassword(email);
      setNotice("A password reset link is on its way to your inbox.");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Screen keyboard edges={["bottom"]} contentStyle={{ gap: 18, paddingTop: 12 }}>
      <View style={{ gap: 8 }}>
        <Kicker>WELCOME BACK</Kicker>
        <Heading size={30}>Good to see you again.</Heading>
        <Body muted>Log in with the same account you use on the EventSphere website.</Body>
      </View>
      {!firebaseReady ? (
        <Notice kind="error">Firebase isn’t configured. Copy .env.example to .env and add your Firebase web app settings.</Notice>
      ) : null}
      {notice ? <Notice kind="success">{notice}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <TextField
        label="Email address"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={firebaseReady}
      />
      <TextField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        editable={firebaseReady}
        onSubmitEditing={submit}
        returnKeyType="go"
      />
      <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: "flex-end" }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>Forgot password?</Text>
      </Pressable>
      <Button title={submitting ? "Logging in…" : "Log in"} iconRight="arrow-forward" onPress={submit} loading={submitting} disabled={!firebaseReady} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>New here?</Text>
        <Pressable onPress={() => router.replace("/register")}>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>Create an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
