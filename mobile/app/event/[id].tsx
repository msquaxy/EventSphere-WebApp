import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, Loading, Notice } from "@/components/ui";
import { webOrigin } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { coverSource } from "@/lib/covers";
import { errorMessage, formatDate, formatMoney, formatTime, initials, remainingTickets, toDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { getEvent, getOrganizer } from "@/services/firestore";
import { createCheckout } from "@/services/functions";
import type { EventItem, UserProfile } from "@/types";

export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reload whenever the screen is shown (e.g. coming back from checkout) so availability stays current.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEvent(String(id))
        .then(async (result) => {
          if (!active) return;
          setEvent(result);
          if (result?.organizerId) setOrganizer(await getOrganizer(result.organizerId).catch(() => null));
        })
        .catch((err) => active && setError(errorMessage(err)))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [id]),
  );

  const remaining = useMemo(() => (event ? remainingTickets(event) : 0), [event]);
  const start = event ? toDate(event.startAt) : null;
  const isPast = Boolean(start && start < new Date());
  const unavailable = !event || event.status !== "published" || remaining < 1 || isPast;
  const maxQuantity = Math.max(1, Math.min(6, remaining));

  const checkout = async () => {
    if (!event) return;
    setError("");
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      const session = await createCheckout(event.id, quantity);
      if (session.free) {
        router.push({ pathname: "/checkout/[orderId]", params: { orderId: session.orderId } });
      } else if (session.demo) {
        router.push({ pathname: "/checkout/[orderId]", params: { orderId: session.orderId, demo: "1" } });
      } else if (session.checkoutUrl) {
        // PayMongo hosted checkout (GCash, Maya, QR Ph, card). The webhook confirms the booking,
        // and the next screen listens for that change.
        await WebBrowser.openBrowserAsync(session.checkoutUrl);
        router.push({ pathname: "/checkout/[orderId]", params: { orderId: session.orderId } });
      }
    } catch (err) {
      setError(errorMessage(err, "Could not start checkout. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const share = async () => {
    if (!event) return;
    const url = `${webOrigin}/events/${event.id}`;
    try {
      await Share.share({ message: `Join me at ${event.title}\n${url}`, url });
    } catch {
      /* dismissed */
    }
  };

  if (loading) return <Loading label="Opening the event details…" />;
  if (!event) {
    return (
      <SafeAreaView edges={["bottom"]} style={{ flex: 1, padding: 20 }}>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <EmptyState
          icon="alert-circle-outline"
          title="This event isn’t here."
          description="It may have moved, or the link may be incorrect."
          action={<Button title="Discover events" small full={false} onPress={() => router.replace("/")} />}
        />
      </SafeAreaView>
    );
  }

  const label = isPast
    ? "Event has ended"
    : event.status === "cancelled"
      ? "Event cancelled"
      : remaining === 0
        ? "Sold out"
        : event.priceCentavos
          ? "Get tickets"
          : "Reserve free tickets";

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.cover}>
          <Image source={coverSource(event.coverImage)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{event.category}</Text>
          </View>
          <Pressable onPress={share} style={styles.share} accessibilityRole="button" accessibilityLabel="Share event">
            <Ionicons name="share-outline" size={19} color={colors.ink} />
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {event.status === "cancelled" ? (
            <Notice kind="error">The organizer has cancelled this event. Pending ticket reservations will be released automatically.</Notice>
          ) : null}
          <Text style={styles.kicker}>
            {event.city.toUpperCase()} · {event.category.toUpperCase()}
          </Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.summary}>{event.summary}</Text>
          <View style={styles.host}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostInitials}>{initials(organizer?.fullName || event.organizerName)}</Text>
            </View>
            <Text style={styles.hostText}>
              Hosted by <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{organizer?.fullName || event.organizerName || "Independent organizer"}</Text>
            </Text>
          </View>

          <View style={styles.highlights}>
            <Highlight icon="calendar-outline" label="DATE" title={formatDate(event.startAt, { weekday: "long" })} note={`${formatTime(event.startAt)} – ${formatTime(event.endAt)}`} />
            <Highlight icon="location-outline" label="LOCATION" title={event.venueName} note={`${event.address}, ${event.city}`} />
            <Highlight icon="ticket-outline" label="TICKETS" title={event.priceCentavos ? formatMoney(event.priceCentavos) : "Free entry"} note={`${remaining} spots remaining`} />
          </View>

          <Text style={styles.h2}>About this event</Text>
          <Text style={styles.description}>{event.description || "Join us for a welcoming community experience."}</Text>

          <Pressable
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`)}
            style={styles.mapRow}
            accessibilityRole="link"
          >
            <Ionicons name="map-outline" size={20} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>{event.venueName}</Text>
              <Text style={styles.mapNote}>Open in Maps</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Pressable>

          <Text style={styles.h2}>Good to know</Text>
          <Know icon="time-outline" title="Arrive a little early" text="Doors open 30 minutes before the event. Have your QR ticket ready." />
          <Know icon="people-outline" title="All are welcome" text="This is an inclusive, community-focused experience." />
          <Know icon="shield-checkmark-outline" title="Book with confidence" text="Secure checkout through PayMongo. Your unique QR pass appears in your ticket wallet." />

          {user?.id === event.organizerId ? (
            <Button title="Manage this event" variant="outline" icon="create-outline" onPress={() => router.push({ pathname: "/studio/edit", params: { id: event.id } })} />
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bar}>
        {error ? <Notice kind="error">{error}</Notice> : null}
        {!unavailable ? (
          <View style={styles.barRow}>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} style={[styles.stepBtn, quantity <= 1 && { opacity: 0.35 }]} accessibilityLabel="Decrease quantity">
                <Ionicons name="remove" size={18} color={colors.ink} />
              </Pressable>
              <Text style={styles.qty}>{Math.min(quantity, maxQuantity)}</Text>
              <Pressable onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} disabled={quantity >= maxQuantity} style={[styles.stepBtn, quantity >= maxQuantity && { opacity: 0.35 }]} accessibilityLabel="Increase quantity">
                <Ionicons name="add" size={18} color={colors.ink} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.total}>{formatMoney((event.priceCentavos || 0) * Math.min(quantity, maxQuantity))}</Text>
              <Text style={styles.totalNote}>{event.priceCentavos ? "total" : "free"} · {remaining} left</Text>
            </View>
          </View>
        ) : null}
        <Button title={submitting ? "Opening secure checkout…" : label} iconRight={unavailable ? undefined : "arrow-forward"} onPress={checkout} loading={submitting} disabled={unavailable} />
        {!isAuthenticated && !unavailable ? <Text style={styles.loginNote}>You’ll log in or create an account before payment.</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function Highlight({ icon, label, title, note }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; title: string; note: string }) {
  return (
    <View style={styles.highlight}>
      <View style={styles.highlightIcon}>
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.highlightLabel}>{label}</Text>
        <Text style={styles.highlightTitle}>{title}</Text>
        <Text style={styles.highlightNote}>{note}</Text>
      </View>
    </View>
  );
}

function Know({ icon, title, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Ionicons name={icon} size={20} color={colors.ink} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.knowTitle}>{title}</Text>
        <Text style={styles.knowText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 250, backgroundColor: colors.cream },
  badge: { position: "absolute", left: 16, bottom: 16, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  share: { position: "absolute", right: 16, bottom: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  shareText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  content: { padding: 20, gap: 14 },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color: "#49703e" },
  title: { fontFamily: fonts.headingXL, fontSize: 28, lineHeight: 34, color: colors.ink },
  summary: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text },
  host: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  hostInitials: { fontFamily: fonts.headingXL, fontSize: 12, color: colors.inkDark },
  hostText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, flex: 1 },
  highlights: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 16, borderWidth: 1, borderColor: colors.border },
  highlight: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  highlightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center" },
  highlightLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.1, color: colors.muted },
  highlightTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.ink },
  highlightNote: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  h2: { fontFamily: fonts.headingXL, fontSize: 20, color: colors.ink, marginTop: 6 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  mapRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cream },
  mapTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink },
  mapNote: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  knowTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  knowText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  bar: { padding: 16, paddingBottom: 12, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
  barRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.cream, borderRadius: radius.pill, padding: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 28, textAlign: "center", fontFamily: fonts.headingXL, fontSize: 17, color: colors.ink },
  total: { fontFamily: fonts.headingXL, fontSize: 22, color: colors.ink },
  totalNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  loginNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center" },
});
