import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";
import { TicketPass } from "@/components/TicketPass";
import { Body, Button, Heading, Kicker, Notice, Screen, Sheet } from "@/components/ui";
import { errorMessage, formatDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { getEvent, getTicketsForOrder, subscribeOrder } from "@/services/firestore";
import { cancelPendingOrder, completeDemoOrder } from "@/services/functions";
import type { EventItem, Order, Ticket } from "@/types";

export default function CheckoutStatus() {
  const router = useRouter();
  const { orderId, demo } = useLocalSearchParams<{ orderId: string; demo?: string }>();
  const isDemo = demo === "1";
  const [order, setOrder] = useState<Order | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const startedDemo = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setLoaded(true);
      setError("No booking reference was provided.");
      return undefined;
    }
    return subscribeOrder(
      String(orderId),
      (value) => {
        setOrder(value);
        setLoaded(true);
      },
      (err) => {
        setError(errorMessage(err));
        setLoaded(true);
      },
    );
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    getEvent(order.eventId).then(setEvent).catch((err) => setError(errorMessage(err)));
    if (order.status === "paid") getTicketsForOrder(order.id, order.attendeeId).then(setTickets).catch((err) => setError(errorMessage(err)));
    if (isDemo && order.status === "pending" && !startedDemo.current) {
      startedDemo.current = true;
      completeDemoOrder(order.id).catch((err) => setError(errorMessage(err)));
    }
  }, [order?.id, order?.status, order?.eventId, order?.attendeeId, isDemo]);

  const cancel = () =>
    Alert.alert("Cancel this reservation?", "Your held tickets will be released.", [
      { text: "Keep waiting", style: "cancel" },
      {
        text: "Cancel reservation",
        style: "destructive",
        onPress: async () => {
          if (!order) return;
          setCancelling(true);
          try {
            await cancelPendingOrder(order.id);
            router.replace("/");
          } catch (err) {
            setError(errorMessage(err));
            setCancelling(false);
          }
        },
      },
    ]);

  if (!loaded || (order && order.status === "pending")) {
    return (
      <Screen edges={["bottom"]} contentStyle={{ alignItems: "center", paddingTop: 48, gap: 14 }}>
        <View style={styles.orbit}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
        <Kicker>{isDemo ? "DEMO CHECKOUT" : "CONFIRMING PAYMENT"}</Kicker>
        <Heading size={26}>{isDemo ? "Completing your demo booking…" : "Hang tight. We’re confirming your payment."}</Heading>
        <Body muted style={{ textAlign: "center" }}>
          {isDemo
            ? "This is an emulator-only payment. No money will be charged."
            : "PayMongo usually confirms within a few seconds. If you finished paying, keep this screen open and don’t pay again."}
        </Body>
        {order ? (
          <View style={styles.reference}>
            <Ionicons name="time-outline" size={16} color={colors.ink} />
            <Text style={styles.referenceText}>
              Booking reference: <Text style={{ fontFamily: fonts.bold }}>{order.reference || order.id}</Text>
            </Text>
          </View>
        ) : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        {order && !isDemo ? (
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 10 }}>
            <Button title="Back to events" variant="outline" onPress={() => router.replace("/")} />
            <Button title="Cancel reservation" variant="danger" loading={cancelling} onPress={cancel} />
          </View>
        ) : null}
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen edges={["bottom"]} contentStyle={{ alignItems: "center", paddingTop: 48, gap: 14 }}>
        <Ionicons name="close-circle-outline" size={52} color={colors.danger} />
        <Heading size={24}>We couldn’t find that booking.</Heading>
        <Body muted style={{ textAlign: "center" }}>Check your ticket wallet or contact support if you were charged.</Body>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Open my ticket wallet" onPress={() => router.replace("/tickets")} />
      </Screen>
    );
  }

  if (order.status !== "paid") {
    return (
      <Screen edges={["bottom"]} contentStyle={{ alignItems: "center", paddingTop: 48, gap: 14 }}>
        <Ionicons name="close-circle-outline" size={52} color={colors.danger} />
        <Heading size={24}>This booking is no longer active.</Heading>
        <Body muted style={{ textAlign: "center" }}>
          {order.status === "refund_required"
            ? "The event was cancelled before your payment was confirmed. The organizer will arrange your refund."
            : "The reservation expired or was cancelled. You can return to the event and choose new tickets."}
        </Body>
        <Button title={event ? "Back to the event" : "Discover events"} onPress={() => (event ? router.replace(`/event/${event.id}`) : router.replace("/"))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]} contentStyle={{ gap: 16, paddingTop: 20 }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={styles.success}>
          <Ionicons name="checkmark" size={38} color={colors.inkDark} />
        </View>
        <Kicker>YOU’RE GOING!</Kicker>
        <Heading size={28}>Your good time is booked.</Heading>
        <Body muted style={{ textAlign: "center" }}>
          We’ve confirmed your {order.quantity} ticket{order.quantity === 1 ? "" : "s"} for{" "}
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }}>{event?.title || "your event"}</Text>. Your QR passes are ready below.
        </Body>
      </View>
      {event ? (
        <View style={styles.eventCard}>
          <Text style={styles.eventCat}>{event.category.toUpperCase()}</Text>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {formatDate(event.startAt)} · {event.venueName}, {event.city}
          </Text>
          <Text style={styles.eventRef}>{order.reference}</Text>
        </View>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ gap: 10 }}>
        {tickets.map((ticket) => (
          <Pressable key={ticket.id} onPress={() => setSelected(ticket)} style={styles.ticketRow} accessibilityRole="button">
            <View style={styles.ticketIcon}>
              <Ionicons name="qr-code-outline" size={22} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketCode}>{ticket.code}</Text>
              <Text style={styles.ticketNote}>Tap to view digital pass</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </Pressable>
        ))}
      </View>
      <Button title="Go to my ticket wallet" iconRight="arrow-forward" onPress={() => router.replace("/tickets")} />
      <Button title="Discover more events" variant="outline" onPress={() => router.replace("/")} />
      <Text style={styles.secure}>
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} /> {isDemo ? "Demo booking completed without a real charge." : "Payment confirmed securely by PayMongo."}
      </Text>
      <Sheet visible={Boolean(selected)} title="Your digital ticket" onClose={() => setSelected(null)}>
        {selected ? <TicketPass ticket={selected} event={event} /> : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  orbit: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center" },
  reference: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  referenceText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  success: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  eventCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 4, borderWidth: 1, borderColor: colors.border },
  eventCat: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: "#49703e" },
  eventTitle: { fontFamily: fonts.headingXL, fontSize: 19, color: colors.ink },
  eventMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  eventRef: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: 4 },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  ticketIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center" },
  ticketCode: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1, color: colors.ink },
  ticketNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  secure: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center" },
});
