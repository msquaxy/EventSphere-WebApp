import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { EventCard } from "@/components/EventCard";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Body, Button, EmptyState, Heading, Kicker, Loading, Notice, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { usePublishedEvents, useSavedEventIds } from "@/hooks";
import { errorMessage } from "@/lib/format";
import { colors } from "@/lib/theme";
import { removeSavedEvent } from "@/services/firestore";

export default function Saved() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { events, loading } = usePublishedEvents();
  const savedIds = useSavedEventIds();
  const [error, setError] = useState("");

  const items = useMemo(() => events.filter((event) => savedIds.includes(event.id)), [events, savedIds]);

  if (authLoading) return <Screen><Loading label="Opening your saved events…" /></Screen>;
  if (!isAuthenticated || !user) {
    return (
      <Screen>
        <View style={{ gap: 6 }}>
          <Kicker>SAVED</Kicker>
          <Heading size={30}>Your shortlist</Heading>
        </View>
        <SignInPrompt title="Keep the good ones" description="Log in to save events and find them here on every device, including the website." />
      </Screen>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            saved
            onSave={async (eventId) => {
              try {
                await removeSavedEvent(user.id, eventId);
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          />
        )}
        ListHeaderComponent={
          <View style={{ gap: 8, paddingBottom: 6 }}>
            <Kicker>SAVED</Kicker>
            <Heading size={30}>Your shortlist</Heading>
            <Body muted>Events you’ve saved on the app or the website.</Body>
            {error ? <Notice kind="error">{error}</Notice> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="Nothing saved yet"
              description="Tap the heart on an event to keep it here."
              action={<Button title="Explore events" small full={false} onPress={() => router.push("/")} />}
            />
          )
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
