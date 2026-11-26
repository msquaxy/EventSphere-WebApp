import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Body, Button, EmptyState, Heading, Kicker, Loading, Notice, Screen, Stat, StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { coverSource } from "@/lib/covers";
import { errorMessage, formatDate, formatMoney, toDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { getOrdersForEvents, subscribeOrganizerEvents } from "@/services/firestore";
import type { EventItem, Order } from "@/types";

export default function Studio() {
  const router = useRouter();
  const { user, isOrganizer, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeOrganizerEvents(
      userId,
      (items) => {
        setEvents(items);
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
    getOrdersForEvents(events.map((event) => event.id))
      .then((items) => active && setOrders(items))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [events]);

  const paid = useMemo(() => orders.filter((order) => order.status === "paid"), [orders]);
  const revenue = paid.reduce((sum, order) => sum + (order.totalCentavos || 0), 0);
  const ticketsSold = paid.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const chart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - (6 - index));
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const value = paid
          .filter((order) => {
            const date = toDate(order.paidAt);
            return date !== null && date >= day && date < next;
          })
          .reduce((sum, order) => sum + order.totalCentavos, 0);
        return { label: ["S", "M", "T", "W", "T", "F", "S"][day.getDay()], value };
      }),
    [paid],
  );
  const maxChart = Math.max(...chart.map((item) => item.value), 1);

  if (authLoading || loading) return <Screen><Loading label="Opening your organizer studio…" /></Screen>;
  if (!isOrganizer || !user) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Organizer access only" description="Create an organizer account on the website or app to host events." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Kicker>ORGANIZER STUDIO</Kicker>
        <Heading size={30}>Make good things happen.</Heading>
        <Body muted>Welcome back, {user.fullName.split(" ")[0]}. Here’s how your events are doing.</Body>
      </View>
      <Button title="Create event" icon="add" onPress={() => router.push("/studio/edit")} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat icon="cash-outline" label="GROSS REVENUE" value={formatMoney(revenue)} note="From confirmed sales" />
        <Stat icon="ticket-outline" label="TICKETS SOLD" value={ticketsSold} note="Across all events" />
        <Stat icon="calendar-outline" label="YOUR EVENTS" value={events.length} note={`${events.filter((e) => e.status === "published").length} published`} />
        <Stat icon="trending-up-outline" label="AVG. TICKET" value={formatMoney(ticketsSold ? Math.round(revenue / ticketsSold) : 0)} note="Per confirmed ticket" />
      </View>
      {events.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="Let’s make your first event happen"
          description="Create an event page, set your ticket price, and share it with your community. We’ll handle the booking and QR tickets."
        />
      ) : (
        <>
          <View style={styles.panel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={styles.panelTitle}>Sales this week</Text>
                <Text style={styles.panelNote}>Confirmed ticket revenue</Text>
              </View>
              <Text style={styles.panelTitle}>{formatMoney(chart.reduce((sum, day) => sum + day.value, 0))}</Text>
            </View>
            <View style={styles.chart}>
              {chart.map((day, index) => (
                <View key={index} style={styles.chartCol}>
                  <View style={styles.chartTrack}>
                    <View style={[styles.chartBar, { height: `${Math.max(4, (day.value / maxChart) * 100)}%` }]} />
                  </View>
                  <Text style={styles.chartLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.panelTitle}>Your events</Text>
          {events.map((event) => {
            const eventRevenue = paid.filter((order) => order.eventId === event.id).reduce((sum, order) => sum + order.totalCentavos, 0);
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Image source={coverSource(event.coverImage)} style={styles.thumb} contentFit="cover" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <Text style={styles.panelNote}>
                      {formatDate(event.startAt)} · {event.city}
                    </Text>
                    <StatusPill status={event.status} />
                  </View>
                </View>
                <View style={styles.eventNumbers}>
                  <Text style={styles.panelNote}>
                    <Text style={styles.strong}>{event.soldCount || 0}</Text> / {event.capacity} sold
                  </Text>
                  <Text style={styles.strong}>{formatMoney(eventRevenue)}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Action icon="eye-outline" label="View" onPress={() => router.push(`/event/${event.id}`)} />
                  <Action icon="qr-code-outline" label="Check in" onPress={() => router.push(`/studio/check-in/${event.id}`)} />
                  <Action icon="create-outline" label="Edit" onPress={() => router.push({ pathname: "/studio/edit", params: { id: event.id } })} />
                </View>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function Action({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={colors.ink} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 18, gap: 16, borderWidth: 1, borderColor: colors.border },
  panelTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.ink },
  panelNote: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  chart: { flexDirection: "row", gap: 8, height: 110 },
  chartCol: { flex: 1, alignItems: "center", gap: 6 },
  chartTrack: { flex: 1, width: "100%", justifyContent: "flex-end", backgroundColor: colors.cream, borderRadius: 8, overflow: "hidden" },
  chartBar: { width: "100%", backgroundColor: colors.ink, borderRadius: 8 },
  chartLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  eventRow: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 74, height: 74, borderRadius: radius.md, backgroundColor: colors.cream },
  eventTitle: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 21, color: colors.ink },
  eventNumbers: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  strong: { fontFamily: fonts.bold, color: colors.ink },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.cream },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
