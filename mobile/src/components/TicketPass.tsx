import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { StatusPill } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { EventItem, Ticket } from "@/types";

// The QR encodes only the ticket code, exactly like the website, so organizers can scan either one.
export function TicketPass({ ticket, event }: { ticket: Ticket; event?: EventItem | null }) {
  return (
    <View style={styles.pass}>
      <View style={styles.top}>
        <View style={styles.kickerRow}>
          <View style={styles.dot} />
          <Text style={styles.kicker}>EVENTSPHERE DIGITAL PASS</Text>
        </View>
        <Text style={styles.title}>{event?.title || "Your event ticket"}</Text>
        {event ? (
          <>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={15} color="#cfe3d6" />
              <Text style={styles.meta}>
                {formatDate(event.startAt)} · {formatTime(event.startAt)}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={15} color="#cfe3d6" />
              <Text style={styles.meta}>
                {event.venueName}, {event.city}
              </Text>
            </View>
          </>
        ) : null}
        <StatusPill status={ticket.status} label={ticket.status === "checked_in" ? "Checked in" : "Valid ticket"} />
      </View>
      <View style={styles.cut}>
        <View style={[styles.notch, { left: -12 }]} />
        <View style={styles.dash} />
        <View style={[styles.notch, { right: -12 }]} />
      </View>
      <View style={styles.stub}>
        <View style={styles.qrFrame}>
          <QRCode value={ticket.code} size={190} color={colors.ink} backgroundColor="#ffffff" />
        </View>
        <Text style={styles.code}>{ticket.code}</Text>
        <Text style={styles.hint}>Show this QR code at the entrance. Each ticket can be checked in once.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: { backgroundColor: colors.inkDark, borderRadius: radius.xl, overflow: "hidden" },
  top: { padding: 22, gap: 9 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.3, color: colors.lime },
  title: { fontFamily: fonts.headingXL, fontSize: 22, lineHeight: 28, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  meta: { fontFamily: fonts.medium, fontSize: 14, color: "#cfe3d6", flex: 1 },
  cut: { height: 24, justifyContent: "center" },
  notch: { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background },
  dash: { borderTopWidth: 2, borderStyle: "dashed", borderColor: "#3b6155", marginHorizontal: 22 },
  stub: { alignItems: "center", padding: 22, paddingTop: 12, gap: 10, backgroundColor: colors.inkDark },
  qrFrame: { padding: 14, backgroundColor: "#fff", borderRadius: radius.lg },
  code: { fontFamily: fonts.headingXL, fontSize: 18, letterSpacing: 1.5, color: colors.lime },
  hint: { fontFamily: fonts.body, fontSize: 12, color: "#9fbfb0", textAlign: "center" },
});
