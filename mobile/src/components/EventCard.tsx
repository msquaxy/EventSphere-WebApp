import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { coverSource } from "@/lib/covers";
import { dayOfMonth, formatDate, formatMoney, formatTime, monthShort, remainingTickets } from "@/lib/format";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import type { EventItem } from "@/types";

export function EventCard({
  event,
  saved = false,
  onSave,
}: {
  event: EventItem;
  saved?: boolean;
  onSave?: (eventId: string) => void;
}) {
  const router = useRouter();
  const remaining = remainingTickets(event);
  const availability =
    event.status === "cancelled"
      ? "Event cancelled"
      : remaining === 0
        ? "Sold out"
        : remaining <= 10
          ? `Only ${remaining} left`
          : "Tickets available";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${event.title}`}
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [styles.card, shadow, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.media}>
        <Image source={coverSource(event.coverImage)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{event.category}</Text>
        </View>
        {onSave ? (
          <Pressable
            onPress={() => onSave(event.id)}
            hitSlop={8}
            accessibilityLabel={saved ? `Unsave ${event.title}` : `Save ${event.title}`}
            style={[styles.heart, saved && { backgroundColor: colors.coral }]}
          >
            <Ionicons name={saved ? "heart" : "heart-outline"} size={19} color={saved ? "#fff" : colors.ink} />
          </Pressable>
        ) : null}
        <View style={styles.dateTile}>
          <Text style={styles.dateMonth}>{monthShort(event.startAt)}</Text>
          <Text style={styles.dateDay}>{dayOfMonth(event.startAt)}</Text>
        </View>
        {event.status === "cancelled" ? (
          <View style={styles.cancelled}>
            <Text style={styles.cancelledText}>Cancelled</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.meta}>
            {formatDate(event.startAt, { weekday: "short", year: false })} · {formatTime(event.startAt)}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
            {event.venueName}, {event.city}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.price}>{event.priceCentavos ? formatMoney(event.priceCentavos) : "Free"}</Text>
          <Text style={[styles.meta, remaining <= 5 && event.status !== "cancelled" && { color: colors.coral, fontFamily: fonts.bold }]}>
            {availability}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  media: { height: 170, backgroundColor: colors.cream },
  badge: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  heart: { position: "absolute", right: 12, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center" },
  dateTile: { position: "absolute", left: 12, top: 12, minWidth: 48, alignItems: "center", backgroundColor: colors.lime, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 8 },
  dateMonth: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.inkDark },
  dateDay: { fontFamily: fonts.headingXL, fontSize: 20, color: colors.inkDark, lineHeight: 22 },
  cancelled: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(16,46,39,0.55)", alignItems: "center", justifyContent: "center" },
  cancelledText: { fontFamily: fonts.headingXL, fontSize: 20, color: "#fff" },
  body: { padding: 16, gap: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  title: { fontFamily: fonts.headingXL, fontSize: 19, lineHeight: 24, color: colors.ink },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  price: { fontFamily: fonts.headingXL, fontSize: 17, color: colors.ink },
});
