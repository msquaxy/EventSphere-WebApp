import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SignInPrompt } from "@/components/SignInPrompt";
import { TicketPass } from "@/components/TicketPass";
import { Body, Button, EmptyState, Heading, Kicker, Loading, Notice, Screen, Segmented, Sheet, Stat, StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { coverSource } from "@/lib/covers";
import { errorMessage, formatDate, formatDateTime, formatMoney, toDate } from "@/lib/format";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { getEvent, getTicketsForOrder, subscribeUserOrders } from "@/services/firestore";
import { cancelPendingOrder } from "@/services/functions";
import type { EventItem, Order, Ticket } from "@/types";

interface OrderView {
  order: Order;
  event: EventItem | null;
  tickets: Ticket[];
}
type TicketEntry = Ticket & { event: EventItem | null; order: Order };

export default function Tickets() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [views, setViews] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tickets" | "orders">("tickets");
  const [selected, setSelected] = useState<TicketEntry | null>(null);
  const [busyId, setBusyId] = useState("");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeUserOrders(
      userId,
      (items) => {
        setOrders(items);
        setLoading(false);
      },
      (err) => {
        setError(errorMessage(err));
        setLoading(false);
      },
    );
  }, [userId]);

  useEffect(() => {
    let active = true;
    Promise.all(
      orders.map(async (order) => {
        const [event, tickets] = await Promise.all([
          getEvent(order.eventId),
          order.status === "paid" ? getTicketsForOrder(order.id, order.attendeeId) : Promise.resolve([] as Ticket[]),
        ]);
        return { order, event, tickets };
      }),
    )
      .then((result) => active && setViews(result))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [orders]);

  const entries = useMemo<TicketEntry[]>(
    () => views.flatMap((view) => view.tickets.map((ticket) => ({ ...ticket, event: view.event, order: view.order }))),
    [views],
  );
  const now = new Date();
  const upcoming = entries.filter((t) => t.status !== "checked_in" && (toDate(t.event?.startAt ?? null)?.getTime() ?? 0) >= now.getTime());
  const attended = entries.filter((t) => t.status === "checked_in").length;
  const spent = orders.filter((o) => o.status === "paid").reduce((sum, o) => sum + (o.totalCentavos || 0), 0);

  const cancel = (orderId: string) => {
    Alert.alert("Cancel this reservation?", "Your held tickets will be released.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel reservation",
        style: "destructive",
        onPress: async () => {
          setBusyId(orderId);
          setError("");
          try {
            await cancelPendingOrder(orderId);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  };

  if (authLoading) return <Screen><Loading label="Opening your ticket wallet…" /></Screen>;
  if (!isAuthenticated || !user) {
    return (
      <Screen>
        <View style={{ gap: 6 }}>
          <Kicker>YOUR EVENTSPHERE</Kicker>
          <Heading size={30}>Ticket wallet</Heading>
        </View>
        <SignInPrompt title="Your tickets live here" description="Log in with your EventSphere account to see your tickets and bookings, including ones you booked on the website." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Kicker>YOUR EVENTSPHERE</Kicker>
        <Heading size={30}>Hey {user.fullName.split(" ")[0]}, ready for a good time?</Heading>
        <Body muted>Your tickets, upcoming plans, and all the details — in one place.</Body>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat icon="ticket-outline" label="UPCOMING" value={upcoming.length} />
        <Stat icon="checkmark-circle-outline" label="ATTENDED" value={attended} />
        <Stat icon="calendar-outline" label="BOOKINGS" value={orders.length} />
        <Stat icon="wallet-outline" label="TOTAL SPENT" value={formatMoney(spent)} />
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "tickets", label: "My tickets", count: entries.length },
          { value: "orders", label: "Bookings", count: orders.length },
        ]}
      />
      {loading ? (
        <Loading label="Opening your ticket wallet…" />
      ) : tab === "tickets" ? (
        entries.length ? (
          <View style={{ gap: 14 }}>
            {entries.map((ticket) => (
              <Pressable key={ticket.id} onPress={() => setSelected(ticket)} style={[styles.ticket, shadow]} accessibilityRole="button" accessibilityLabel={`View pass for ${ticket.event?.title ?? "event"}`}>
                <View style={{ height: 110 }}>
                  <Image source={coverSource(ticket.event?.coverImage)} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={{ position: "absolute", left: 12, top: 12 }}>
                    <StatusPill status={ticket.status} />
                  </View>
                </View>
                <View style={{ padding: 16, gap: 6 }}>
                  <Text style={styles.cat}>{ticket.event?.category?.toUpperCase()}</Text>
                  <Text style={styles.title}>{ticket.event?.title || "Event ticket"}</Text>
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={15} color={colors.muted} />
                    <Text style={styles.meta}>{ticket.event ? formatDateTime(ticket.event.startAt) : ""}</Text>
                  </View>
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={15} color={colors.muted} />
                    <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                      {ticket.event?.venueName}, {ticket.event?.city}
                    </Text>
                  </View>
                  <View style={styles.footer}>
                    <Text style={styles.code}>{ticket.code}</Text>
                    <View style={styles.row}>
                      <Ionicons name="qr-code-outline" size={16} color={colors.ink} />
                      <Text style={styles.link}>View pass</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="ticket-outline"
            title="Your next good time starts here"
            description="When you book an event, your digital tickets will appear right here."
            action={<Button title="Explore events" small full={false} onPress={() => router.push("/")} />}
          />
        )
      ) : orders.length ? (
        <View style={{ gap: 12 }}>
          {orders.map((order) => {
            const event = views.find((view) => view.order.id === order.id)?.event;
            return (
              <View key={order.id} style={styles.order}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.orderRef}>{order.reference || order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {event?.title || "Event booking"}
                    </Text>
                  </View>
                  <StatusPill status={order.status} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.meta}>
                    {order.quantity} ticket{order.quantity === 1 ? "" : "s"} · booked {formatDate(order.createdAt)}
                  </Text>
                  <Text style={styles.orderTotal}>{order.totalCentavos ? formatMoney(order.totalCentavos) : "Free"}</Text>
                </View>
                {order.status === "pending" ? (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button title="Check status" variant="outline" small style={{ flex: 1 }} onPress={() => router.push(`/checkout/${order.id}`)} />
                    <Button title="Cancel" variant="danger" small loading={busyId === order.id} style={{ flex: 1 }} onPress={() => cancel(order.id)} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState icon="receipt-outline" title="No bookings yet" description="Your booking history will show up here after your first event." />
      )}
      <Sheet visible={Boolean(selected)} title="Your digital ticket" onClose={() => setSelected(null)}>
        {selected ? <TicketPass ticket={selected} event={selected.event} /> : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticket: { backgroundColor: "#fff", borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  cat: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: "#49703e" },
  title: { fontFamily: fonts.headingXL, fontSize: 18, lineHeight: 23, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  code: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, color: colors.ink },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  order: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  orderRef: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink },
  orderTotal: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink },
});
