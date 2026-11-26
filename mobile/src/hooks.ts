import { useEffect, useState } from "react";
import { firebaseReady } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/format";
import { subscribePublishedEvents, subscribeSavedEvents } from "@/services/firestore";
import type { EventItem } from "@/types";

export function usePublishedEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(firebaseReady);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseReady) return undefined;
    return subscribePublishedEvents(
      (items) => {
        setEvents(items);
        setError("");
        setLoading(false);
      },
      (err) => {
        setError(errorMessage(err, "Could not load events."));
        setLoading(false);
      },
    );
  }, []);

  return { events, loading, error };
}

export function useSavedEventIds() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      return undefined;
    }
    return subscribeSavedEvents(user.id, setSaved, () => undefined);
  }, [user]);

  return saved;
}
