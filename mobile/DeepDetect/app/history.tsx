import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { HistoryEntry } from "../types";

const VERDICT_COLORS = {
  AUTHENTIC: "#10B981",
  MANIPULATED: "#EF4444",
  INCONCLUSIVE: "#F59E0B",
};

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem("analysis_history");
    setHistory(raw ? JSON.parse(raw) : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const clearHistory = async () => {
    if (Platform.OS === "web") {
      if (!window.confirm("Delete all scan history?")) return;
      await AsyncStorage.removeItem("analysis_history");
      setHistory([]);
    } else {
      Alert.alert("Clear History", "Delete all scan history?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("analysis_history");
            setHistory([]);
          },
        },
      ]);
    }
  };

  const openEntry = (entry: HistoryEntry) => {
    router.push({
      pathname: "/analysis",
      params: { data: JSON.stringify(entry.result), filename: entry.filename },
    });
  };

  if (history.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base px-6">
        <View
          className="mb-4 h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: "#EEF2FF" }}
        >
          <Ionicons name="albums-outline" size={36} color="#6366F1" />
        </View>
        <Text className="text-base font-semibold text-ink-dark">
          No scans yet
        </Text>
        <Text className="mt-1 text-center text-sm text-ink-muted">
          Your analysis results will appear here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-base">
      {/* Header actions */}
      <View className="flex-row items-center justify-between px-6 py-3">
        <Text className="text-sm text-ink-muted">
          {history.length} scan{history.length !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          className="flex-row items-center"
          onPress={clearHistory}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
          <Text
            className="ml-1 text-sm font-medium"
            style={{ color: "#EF4444" }}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-6 pb-6"
        renderItem={({ item }) => {
          const color = VERDICT_COLORS[item.result.verdict];
          const date = new Date(item.timestamp);
          const timeStr = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <TouchableOpacity
              className="mb-2.5 flex-row items-center rounded-2xl p-4"
              style={{
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
              onPress={() => openEntry(item)}
              activeOpacity={0.7}
            >
              {/* Verdict indicator */}
              <View
                className="mr-3.5 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: color + "15" }}
              >
                <Ionicons
                  name={
                    item.result.verdict === "AUTHENTIC"
                      ? "shield-checkmark"
                      : item.result.verdict === "MANIPULATED"
                      ? "alert-circle"
                      : "help-circle"
                  }
                  size={22}
                  color={color}
                />
              </View>

              {/* Info */}
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold text-ink-dark"
                  numberOfLines={1}
                >
                  {item.filename}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted">{timeStr}</Text>
              </View>

              {/* Confidence */}
              <View className="items-end">
                <Text className="text-base font-bold" style={{ color }}>
                  {Math.round(item.result.confidence * 100)}%
                </Text>
                <Text className="text-xs text-ink-muted">
                  {item.result.verdict.toLowerCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
