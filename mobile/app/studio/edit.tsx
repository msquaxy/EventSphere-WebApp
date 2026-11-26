import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DateTimeField } from "@/components/DateTimeField";
import { Body, Button, ChipGroup, EmptyState, Heading, Kicker, Loading, Notice, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { COVER_OPTIONS, coverSource } from "@/lib/covers";
import { errorMessage, localInput, toDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { getEvent, saveEvent } from "@/services/firestore";
import type { EventItem } from "@/types";

const CATEGORIES = ["Music", "Food", "Arts", "Markets", "Wellness", "Tech", "Community"];
const CITIES = ["Manila", "Makati", "Quezon City", "Pasig", "Taguig"];

export default function EventEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = id ? String(id) : null;
  const { user, isOrganizer } = useAuth();

  const defaults = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(21, 0, 0, 0);
    return { start, end };
  }, []);

  const [existing, setExisting] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [saving, setSaving] = useState<"" | "draft" | "published">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Music",
    summary: "",
    description: "",
    venueName: "",
    address: "",
    city: "Manila",
    startAt: defaults.start,
    endAt: defaults.end,
    capacity: "50",
    price: "250",
    lat: "14.5995",
    lng: "120.9842",
    coverImage: "/images/community.jpg",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!eventId || !user) return;
    getEvent(eventId)
      .then((event) => {
        if (!event || event.organizerId !== user.id) {
          setError("This event could not be found or is not yours to edit.");
          return;
        }
        setExisting(event);
        setForm({
          title: event.title || "",
          category: event.category || "Music",
          summary: event.summary || "",
          description: event.description || "",
          venueName: event.venueName || "",
          address: event.address || "",
          city: event.city || "Manila",
          startAt: toDate(event.startAt) || defaults.start,
          endAt: toDate(event.endAt) || defaults.end,
          capacity: String(event.capacity ?? 50),
          price: String((event.priceCentavos || 0) / 100),
          lat: String(event.lat ?? 14.5995),
          lng: String(event.lng ?? 120.9842),
          coverImage: event.coverImage || "/images/community.jpg",
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [eventId, user?.id]);

  const completion = [form.title, form.summary, form.description, form.venueName, form.address].filter((value) => value.trim()).length + 2;

  const validate = (publishing: boolean) => {
    const capacity = Number(form.capacity);
    const price = Number(form.price);
    if (!form.title.trim() || !form.summary.trim() || !form.description.trim()) return "Add a title, short summary, and full event description.";
    if (!form.venueName.trim() || !form.address.trim()) return "Add the venue name and street address.";
    if (form.endAt <= form.startAt) return "The end time must be after the start time.";
    if (!Number.isInteger(capacity) || capacity < 1) return "Capacity must be a whole number of at least 1.";
    if (Number.isNaN(price) || price < 0) return "Ticket price cannot be negative.";
    if (Number.isNaN(Number(form.lat)) || Number.isNaN(Number(form.lng))) return "Enter valid venue coordinates.";
    if (existing && capacity < (existing.soldCount || 0) + (existing.reservedCount || 0)) return "Capacity cannot be lower than tickets already sold or reserved.";
    if (publishing && form.startAt < new Date()) return "Published events need a future start date.";
    return "";
  };

  const submit = async (status: "draft" | "published") => {
    if (!user) return;
    const validation = validate(status === "published");
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(status);
    setError("");
    setNotice("");
    try {
      await saveEvent(eventId, {
        title: form.title.trim(),
        category: form.category,
        summary: form.summary.trim(),
        description: form.description.trim(),
        venueName: form.venueName.trim(),
        address: form.address.trim(),
        city: form.city,
        startAt: form.startAt,
        endAt: form.endAt,
        capacity: Math.round(Number(form.capacity)),
        priceCentavos: Math.round(Number(form.price) * 100),
        lat: Number(form.lat),
        lng: Number(form.lng),
        coverImage: form.coverImage.trim() || "/images/community.jpg",
        status,
        organizerId: user.id,
        organizerName: user.fullName,
        eventStartLabel: localInput(form.startAt),
        // Counters are only set on creation; the server owns them afterwards.
        ...(!eventId && { soldCount: 0, reservedCount: 0 }),
      });
      if (router.canGoBack()) router.back();
      else router.replace("/studio");
    } catch (err) {
      setError(errorMessage(err));
      setSaving("");
    }
  };

  const geocode = async () => {
    if (!form.address.trim()) {
      setError("Enter the street address first.");
      return;
    }
    setLocating(true);
    setError("");
    try {
      const results = await Location.geocodeAsync(`${form.address}, ${form.city}, Philippines`);
      if (!results.length) throw new Error("We could not find that address. Try a nearby landmark or enter coordinates manually.");
      update("lat", String(results[0].latitude));
      update("lng", String(results[0].longitude));
      setNotice("Venue coordinates found.");
    } catch (err) {
      setError(errorMessage(err, "Address search is unavailable right now. You can enter coordinates manually."));
    } finally {
      setLocating(false);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Location permission was not granted.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      update("lat", String(position.coords.latitude));
      update("lng", String(position.coords.longitude));
      setNotice("Using your current location for the venue.");
    } catch (err) {
      setError(errorMessage(err, "Could not get your location."));
    } finally {
      setLocating(false);
    }
  };

  if (!isOrganizer || !user) {
    return (
      <Screen edges={["bottom"]}>
        <EmptyState icon="lock-closed-outline" title="Organizer access only" description="Log in with an organizer account to create events." />
      </Screen>
    );
  }
  if (loading) return <Loading label="Loading your event…" />;
  if (eventId && !existing) {
    return (
      <Screen edges={["bottom"]}>
        <Notice kind="error">{error || "This event could not be found."}</Notice>
        <Button title="Back to studio" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  const cancelled = existing?.status === "cancelled";

  return (
    <Screen keyboard edges={["bottom"]} contentStyle={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Kicker>{eventId ? "EDIT EVENT" : "NEW EVENT"}</Kicker>
        <Heading size={28}>{eventId ? "Polish the details." : "Let’s bring people together."}</Heading>
        <Body muted>{eventId ? "Keep your event page accurate and your guests in the loop." : "Start with the essentials. You can save a draft and come back anytime."}</Body>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressBar, { width: `${Math.min(100, (completion / 7) * 100)}%` }]} />
      </View>
      {cancelled ? <Notice kind="error">This event has been cancelled and can no longer be edited here.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {notice ? <Notice kind="success" onDismiss={() => setNotice("")}>{notice}</Notice> : null}

      <Section title="The basics" note="Give people a reason to stop scrolling.">
        <TextField label="Event title" value={form.title} onChangeText={(v) => update("title", v)} placeholder="e.g. Manila After Dark: Night Market" maxLength={90} />
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Category</Text>
          <ChipGroup options={CATEGORIES} value={form.category} onChange={(v) => update("category", v)} />
        </View>
        <TextField label="Short summary" value={form.summary} onChangeText={(v) => update("summary", v)} placeholder="One or two sentences that capture the vibe." maxLength={180} multiline hint={`${form.summary.length}/180 characters`} />
        <TextField label="Full description" value={form.description} onChangeText={(v) => update("description", v)} placeholder="What will guests experience? Include what to bring, who it’s for, and the schedule." multiline inputStyle={{ minHeight: 140 }} />
      </Section>

      <Section title="When & where" note="Make it easy to plan the perfect night out.">
        <View style={{ gap: 12 }}>
          <DateTimeField label="Starts" value={form.startAt} onChange={(date) => {
            update("startAt", date);
            if (form.endAt <= date) update("endAt", new Date(date.getTime() + 3 * 60 * 60 * 1000));
          }} />
          <DateTimeField label="Ends" value={form.endAt} onChange={(date) => update("endAt", date)} />
        </View>
        <TextField label="Venue name" value={form.venueName} onChangeText={(v) => update("venueName", v)} placeholder="e.g. The Laneway Creative Space" />
        <TextField label="Street address" value={form.address} onChangeText={(v) => update("address", v)} placeholder="Street, barangay, or landmark" />
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>City</Text>
          <ChipGroup options={CITIES} value={form.city} onChange={(v) => update("city", v)} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Find coordinates" icon="search-outline" variant="outline" small loading={locating} onPress={geocode} style={{ flex: 1 }} />
          <Button title="My location" icon="navigate-outline" variant="outline" small disabled={locating} onPress={useMyLocation} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextField label="Latitude" value={form.lat} onChangeText={(v) => update("lat", v)} keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
          <TextField label="Longitude" value={form.lng} onChangeText={(v) => update("lng", v)} keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
        </View>
      </Section>

      <Section title="Tickets & capacity" note="Set your price and keep attendance comfortable.">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextField label="Price (PHP)" value={form.price} onChangeText={(v) => update("price", v)} keyboardType="decimal-pad" hint="0 for a free event" style={{ flex: 1 }} />
          <TextField label="Capacity" value={form.capacity} onChangeText={(v) => update("capacity", v)} keyboardType="number-pad" hint="Maximum guests" style={{ flex: 1 }} />
        </View>
        <Notice>PayMongo securely processes GCash, Maya, QR Ph, and card payments. EventSphere never stores card details.</Notice>
      </Section>

      <Section title="Cover image" note="Make a great first impression.">
        <Image source={coverSource(form.coverImage)} style={styles.preview} contentFit="cover" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {COVER_OPTIONS.map((cover) => {
            const selected = form.coverImage === cover.value;
            return (
              <Pressable key={cover.value} onPress={() => update("coverImage", cover.value)} style={[styles.coverOption, selected && { borderColor: colors.ink }]} accessibilityLabel={cover.label}>
                <Image source={coverSource(cover.value)} style={StyleSheet.absoluteFill} contentFit="cover" />
                {selected ? (
                  <View style={styles.coverCheck}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <TextField label="Or paste an image URL" value={form.coverImage} onChangeText={(v) => update("coverImage", v)} placeholder="https://example.com/cover.jpg" autoCapitalize="none" keyboardType="url" autoCorrect={false} />
      </Section>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Before you publish</Text>
        <Text style={styles.noteText}>Double-check your date, venue, ticket price, and capacity. You can edit these details later.</Text>
      </View>
      <Button title="Save draft" icon="save-outline" variant="outline" loading={saving === "draft"} disabled={Boolean(saving) || cancelled} onPress={() => submit("draft")} />
      <Button
        title={saving === "published" ? "Saving…" : existing?.status === "published" ? "Update event" : "Publish event"}
        icon="paper-plane-outline"
        loading={saving === "published"}
        disabled={Boolean(saving) || cancelled}
        onPress={() => submit("published")}
      />
    </Screen>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ gap: 2 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionNote}>{note}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.cream, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.ink },
  section: { backgroundColor: "#fff", borderRadius: radius.lg, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontFamily: fonts.headingXL, fontSize: 18, color: colors.ink },
  sectionNote: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 13, color: "#34443b" },
  preview: { height: 160, borderRadius: radius.md, backgroundColor: colors.cream },
  coverOption: { width: 76, height: 56, borderRadius: radius.sm, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  coverCheck: { position: "absolute", right: 4, top: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  note: { backgroundColor: colors.limeSoft, borderRadius: radius.md, padding: 14, gap: 3 },
  noteTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  noteText: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
});
