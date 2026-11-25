import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { EventCard } from "@/components/EventCard";
import { Body, Button, Chip, ChipGroup, EmptyState, Heading, Kicker, Loading, Notice, Sheet } from "@/components/ui";
import { firebaseReady } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePublishedEvents, useSavedEventIds } from "@/hooks";
import { errorMessage, haversineKm, toDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { addSavedEvent, removeSavedEvent } from "@/services/firestore";

const CATEGORIES = ["All events", "Music", "Food", "Arts", "Markets", "Wellness", "Tech"];
const CITIES = ["All cities", "Manila", "Makati", "Quezon City", "Pasig", "Taguig"];
const DATES = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
] as const;
type DateFilter = (typeof DATES)[number]["value"];
const RADII = [5, 10, 25, 50, 100];

export default function Discover() {
  const router = useRouter();
  const { user } = useAuth();
  const { events, loading, error } = usePublishedEvents();
  const saved = useSavedEventIds();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All events");
  const [city, setCity] = useState("All cities");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [locating, setLocating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const start = toDate(event.startAt);
      if (!start || start < now) return false;
      if (needle && !`${event.title} ${event.description} ${event.venueName} ${event.city} ${event.category}`.toLowerCase().includes(needle)) return false;
      if (category !== "All events" && event.category !== category) return false;
      if (city !== "All cities" && event.city !== city) return false;
      if (dateFilter === "today" && start > endOfToday) return false;
      if (dateFilter === "week" && start > endOfWeek) return false;
      if (dateFilter === "month" && start > endOfMonth) return false;
      if (coordinates && haversineKm(coordinates, event) > radiusKm) return false;
      return true;
    });
  }, [events, query, category, city, dateFilter, coordinates, radiusKm]);

  const activeFilters = (city !== "All cities" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0) + (coordinates ? 1 : 0);

  const toggleSaved = async (eventId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      if (saved.includes(eventId)) await removeSavedEvent(user.id, eventId);
      else await addSavedEvent(user.id, eventId);
    } catch (err) {
      setNotice(errorMessage(err));
    }
  };

  const locate = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("We couldn’t access your location. You can still filter by city.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
      setCity("All cities");
      setNotice("Showing events within your selected radius.");
    } catch {
      setNotice("We couldn’t find your location right now. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const resetFilters = () => {
    setCity("All cities");
    setDateFilter("all");
    setCoordinates(null);
  };

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <View style={{ gap: 6 }}>
        <Kicker>{user ? `HEY ${user.fullName.split(" ")[0].toUpperCase()}` : "YOUR CITY. YOUR PEOPLE."}</Kicker>
        <Heading size={30}>Happening around you</Heading>
        <Body muted>From low-key hangs to can’t-miss nights, there’s something with your name on it.</Body>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search events, venues, or interests"
          placeholderTextColor="#9aa39d"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search events"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        {CATEGORIES.map((name) => (
          <Chip key={name} label={name} selected={category === name} onPress={() => setCategory(name)} />
        ))}
      </ScrollView>
      <View style={styles.filterRow}>
        <Pressable onPress={() => setFiltersOpen(true)} style={[styles.filterButton, activeFilters > 0 && { borderColor: colors.ink }]}>
          <Ionicons name="options-outline" size={17} color={colors.ink} />
          <Text style={styles.filterText}>Filters{activeFilters ? ` · ${activeFilters}` : ""}</Text>
        </Pressable>
        <Text style={styles.count}>
          {filtered.length} event{filtered.length === 1 ? "" : "s"} found
        </Text>
      </View>
      {notice ? (
        <Notice onDismiss={() => setNotice("")}>{notice}</Notice>
      ) : null}
      {!firebaseReady ? <Notice kind="error">Add your Firebase web app settings to .env to load live events.</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => <EventCard event={item} saved={saved.includes(item.id)} onSave={toggleSaved} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <Loading label="Finding good things near you…" />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No events match just yet"
              description="Try a different category, date, or city. Good things are worth the search."
              action={
                <Button
                  title="Clear all filters"
                  variant="outline"
                  small
                  full={false}
                  onPress={() => {
                    setQuery("");
                    setCategory("All events");
                    resetFilters();
                  }}
                />
              }
            />
          )
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <Sheet visible={filtersOpen} title="Filters" onClose={() => setFiltersOpen(false)}>
        <View style={{ gap: 10 }}>
          <Text style={styles.sheetLabel}>City</Text>
          <ChipGroup
            options={CITIES}
            value={city}
            onChange={(value) => {
              setCity(value);
              setCoordinates(null);
            }}
          />
        </View>
        <View style={{ gap: 10 }}>
          <Text style={styles.sheetLabel}>When</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DATES.map((option) => (
              <Chip key={option.value} label={option.label} selected={dateFilter === option.value} onPress={() => setDateFilter(option.value)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Text style={styles.sheetLabel}>Near me</Text>
          <Button
            title={locating ? "Locating…" : coordinates ? `Within ${radiusKm} km of you` : "Use my location"}
            icon="navigate-outline"
            variant={coordinates ? "dark" : "outline"}
            onPress={coordinates ? () => setCoordinates(null) : locate}
            loading={locating}
          />
          {coordinates ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {RADII.map((km) => (
                <Chip key={km} label={`${km} km`} selected={radiusKm === km} onPress={() => setRadiusKm(km)} />
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Reset" variant="outline" onPress={resetFilters} style={{ flex: 1 }} />
          <Button title={`Show ${filtered.length} event${filtered.length === 1 ? "" : "s"}`} onPress={() => setFiltersOpen(false)} style={{ flex: 2 }} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderDark, paddingHorizontal: 16 },
  searchInput: { flex: 1, minHeight: 50, fontFamily: fonts.body, fontSize: 16, color: colors.text },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterButton: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  filterText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  sheetLabel: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink },
});
