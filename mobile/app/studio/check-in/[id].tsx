import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Body, Button, Chip, EmptyState, Heading, Kicker, Loading, Notice, Screen, Stat, StatusPill, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { coverSource } from "@/lib/covers";
import { errorMessage, formatDateTime } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { getEvent, getTicketsForEvent, subscribeEventOrders, subscribeOrganizerEvents } from "@/services/firestore";
import { checkInTicket } from "@/services/functions";
import type { CheckInResult, EventItem, Order, Ticket } from "@/types";

type ScanResult = ({ success: true } & CheckInResult) | { success: false; message: string };

export default function CheckIn() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = String(id);
  const { user, isOrganizer } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeOrganizerEvents(userId, setEvents, () => undefined);
  }, [userId]);

  const refreshTickets = useCallback(async (target: string) => {
    setTickets(await getTicketsForEvent(target));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setResult(null);
    setError("");
    setScanning(true);
    getEvent(eventId)
      .then(async (item) => {
        if (!active) return;
        if (!item || item.organizerId !== userId) {
          setError("This event is not available in your organizer studio.");
          return;
        }
        setEvent(item);
        await refreshTickets(item.id);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId, userId, refreshTickets]);

  useEffect(() => subscribeEventOrders(eventId, setOrders, () => undefined), [eventId]);

  const processCode = useCallback(
    async (raw: string) => {
      if (busy.current) return;
      busy.current = true;
      setProcessing(true);
      setError("");
      setResult(null);
      try {
        const response = await checkInTicket(raw.trim());
        setResult({ success: true, ...response });
        setScanning(false);
        await refreshTickets(eventId);
      } catch (err) {
        setResult({ success: false, message: errorMessage(err, "This ticket could not be checked in.") });
        setScanning(false);
      } finally {
        busy.current = false;
        setProcessing(false);
        setManualCode("");
      }
    },
    [eventId, refreshTickets],
  );

  if (!isOrganizer || !user) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="lock-closed-outline" title="Organizer access only" description="Log in with an organizer account to check guests in." />
      </Screen>
    );
  }
  if (loading) return <Loading label="Preparing the check-in desk…" />;

  const paidOrders = orders.filter((order) => order.status === "paid");
  const checkedIn = tickets.filter((ticket) => ticket.status === "checked_in").length;

  return (
    <Screen edges={["bottom"]} contentStyle={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Kicker>GUEST CHECK-IN</Kicker>
        <Heading size={28}>Welcome your people.</Heading>
        <Body muted>Scan a digital ticket or enter its code to mark a guest as arrived.</Body>
      </View>
      {events.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {events.map((item) => (
            <Chip key={item.id} label={item.title} selected={item.id === eventId} onPress={() => router.replace(`/studio/check-in/${item.id}`)} />
          ))}
        </ScrollView>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {event ? (
        <View style={styles.eventBar}>
          <Image source={coverSource(event.coverImage)} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={styles.eventMeta}>
              {formatDateTime(event.startAt)} · {event.venueName}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat icon="people-outline" label="PAID GUESTS" value={paidOrders.reduce((sum, order) => sum + order.quantity, 0)} />
        <Stat icon="checkmark-circle-outline" label="CHECKED IN" value={checkedIn} />
        <Stat icon="ticket-outline" label="WAITING" value={Math.max(0, tickets.length - checkedIn)} />
      </View>

      <View style={styles.panel}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.panelTitle}>Scan a ticket</Text>
          <View style={[styles.status, scanning && { backgroundColor: colors.successSoft }]}>
            <View style={[styles.statusDot, scanning && { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, scanning && { color: colors.success }]}>{scanning ? "Scanner on" : "Paused"}</Text>
          </View>
        </View>
        {!permission ? (
          <Loading label="Checking camera access…" />
        ) : !permission.granted ? (
          <View style={styles.cameraOff}>
            <Ionicons name="camera-outline" size={32} color={colors.ink} />
            <Text style={styles.cameraText}>Allow camera access to scan QR tickets. The camera stays on this device.</Text>
            <Button title="Allow camera" small full={false} onPress={requestPermission} />
          </View>
        ) : (
          <View style={styles.camera}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanning && !processing ? ({ data }) => processCode(data) : undefined}
            />
            <View pointerEvents="none" style={styles.frame} />
            {processing ? (
              <View style={styles.cameraOverlay}>
                <Text style={styles.overlayText}>Checking ticket…</Text>
              </View>
            ) : null}
            {!scanning && !processing ? (
              <View style={styles.cameraOverlay}>
                <Text style={styles.overlayText}>Scanner paused</Text>
              </View>
            ) : null}
          </View>
        )}
        {result ? (
          <View style={[styles.result, { backgroundColor: result.success ? colors.successSoft : colors.dangerSoft }]}>
            <Ionicons name={result.success ? "checkmark-circle" : "close-circle"} size={32} color={result.success ? colors.success : colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: result.success ? colors.success : colors.danger }]}>
                {result.success ? `Welcome, ${result.attendeeName || "guest"}!` : "Ticket not admitted"}
              </Text>
              <Text style={styles.resultText}>{result.success ? `${result.ticket.code} · ${result.eventTitle}` : result.message}</Text>
            </View>
          </View>
        ) : null}
        {!scanning ? (
          <Button
            title="Scan next"
            icon="scan-outline"
            onPress={() => {
              setResult(null);
              setScanning(true);
            }}
          />
        ) : null}
        <View style={{ gap: 8 }}>
          <TextField
            label="Or enter ticket code"
            value={manualCode}
            onChangeText={(value) => setManualCode(value.toUpperCase())}
            placeholder="ES-XXXXXXXXXXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={() => manualCode.trim() && processCode(manualCode)}
            returnKeyType="done"
          />
          <Button title="Check in" iconRight="arrow-forward" disabled={!manualCode.trim() || processing} loading={processing} onPress={() => processCode(manualCode)} />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.panelTitle}>Guest list</Text>
            <Text style={styles.eventMeta}>Confirmed ticket holders</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countText}>{paidOrders.length}</Text>
          </View>
        </View>
        {paidOrders.length ? (
          paidOrders.map((order) => {
            const guestTickets = tickets.filter((ticket) => ticket.orderId === order.id);
            const arrived = guestTickets.length > 0 && guestTickets.every((ticket) => ticket.status === "checked_in");
            return (
              <View key={order.id} style={styles.guest}>
                <View style={[styles.guestAvatar, arrived && { backgroundColor: colors.success }]}>
                  {arrived ? <Ionicons name="checkmark" size={17} color="#fff" /> : <Text style={styles.guestInitial}>{(order.attendeeName || "G").slice(0, 1).toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{order.attendeeName || "EventSphere guest"}</Text>
                  <Text style={styles.eventMeta}>
                    {order.quantity} ticket{order.quantity === 1 ? "" : "s"} · {order.reference}
                  </Text>
                </View>
                <StatusPill status={arrived ? "paid" : "pending"} label={arrived ? "Arrived" : "Expected"} />
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: "center", gap: 8, padding: 18 }}>
            <Ionicons name="qr-code-outline" size={30} color={colors.muted} />
            <Text style={styles.eventMeta}>Confirmed guests will appear here.</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventBar: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.cream },
  eventTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink },
  eventMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  panel: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.border },
  panelTitle: { fontFamily: fonts.headingXL, fontSize: 18, color: colors.ink },
  status: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  statusText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  camera: { height: 300, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  frame: { width: 200, height: 200, borderRadius: 20, borderWidth: 3, borderColor: colors.lime },
  cameraOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(16,46,39,0.62)", alignItems: "center", justifyContent: "center" },
  overlayText: { fontFamily: fonts.headingXL, fontSize: 17, color: "#fff" },
  cameraOff: { alignItems: "center", gap: 10, padding: 22, borderRadius: radius.lg, backgroundColor: colors.cream },
  cameraText: { fontFamily: fonts.body, fontSize: 14, color: colors.text, textAlign: "center" },
  result: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: radius.md },
  resultTitle: { fontFamily: fonts.heading, fontSize: 16 },
  resultText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  count: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countText: { fontFamily: fonts.headingXL, fontSize: 15, color: colors.inkDark },
  guest: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  guestAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center" },
  guestInitial: { fontFamily: fonts.headingXL, fontSize: 15, color: colors.ink },
  guestName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
