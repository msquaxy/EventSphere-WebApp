import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button, EmptyState } from "@/components/ui";

export function SignInPrompt({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  return (
    <View style={{ paddingTop: 24 }}>
      <EmptyState
        icon="lock-closed-outline"
        title={title}
        description={description}
        action={
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 8 }}>
            <Button title="Log in" onPress={() => router.push("/login")} />
            <Button title="Create an account" variant="outline" onPress={() => router.push("/register")} />
          </View>
        }
      />
    </View>
  );
}
