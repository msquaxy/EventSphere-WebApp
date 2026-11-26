import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { formatDate, formatTime } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";

export function DateTimeField({ label, value, onChange }: { label: string; value: Date; onChange: (date: Date) => void }) {
  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      onChange: (event, picked) => {
        if (event.type !== "set" || !picked) return;
        DateTimePickerAndroid.open({
          value: picked,
          mode: "time",
          is24Hour: false,
          onChange: (timeEvent, time) => {
            if (timeEvent.type === "set" && time) onChange(time);
          },
        });
      },
    });
  };

  return (
    <View style={{ gap: 7, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "ios" ? (
        <View style={styles.iosWrap}>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="compact"
            onChange={(_, date) => {
              if (date) onChange(date);
            }}
            accentColor={colors.ink}
          />
        </View>
      ) : (
        <Pressable onPress={openAndroid} style={styles.field} accessibilityRole="button" accessibilityLabel={`Change ${label}`}>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{formatDate(value, { weekday: "short" })}</Text>
            <Text style={styles.time}>{formatTime(value)}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 13, color: "#34443b" },
  iosWrap: { alignItems: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderDark, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.borderDark, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  date: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  time: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
