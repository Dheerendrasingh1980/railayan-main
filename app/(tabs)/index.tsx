import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as SQLite from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, FlatList, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const STORAGE_KEY = "railayan_pnr_list";
const RAPIDAPI_KEY = "d99e338eb6mshbeaa0e430c17cd2p1a2481jsn7e407c501775";

// ============================================================
// DB HELPER — SQLite open karo
// ============================================================
let dbInstance = null;

const getDB = async () => {
  if (dbInstance) return dbInstance;
  try {
    const dbName = "railayan.db";
    const dbPath = FileSystem.documentDirectory + "SQLite/" + dbName;

    const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory + "SQLite/");
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "SQLite/", { intermediates: true });
    }

    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfo.exists) {
      await FileSystem.downloadAsync(
        "https://raw.githubusercontent.com/railayanapp/railayan-data/main/railayan.db",
        dbPath
      );
    }

    dbInstance = await SQLite.openDatabaseAsync(dbName);
    return dbInstance;
  } catch (e) {
    console.log("DB Error:", e);
    return null;
  }
};

const getTrainScheduleFromDB = async (trainNumber) => {
  try {
    const db = await getDB();
    if (!db) return null;

    const train = await db.getFirstAsync(
      "SELECT * FROM trains WHERE number = ?",
      [trainNumber]
    );

    if (!train) return null;

    const stations = await db.getAllAsync(
      "SELECT * FROM stations WHERE train_number = ? ORDER BY day ASC, stop_number ASC",
      [trainNumber]
    );

    return { train, stations: stations || [] };
  } catch (e) {
    console.log("Schedule error:", e);
    return null;
  }
};

// ============================================================
// RUNNING TRAIN ANIMATION
// ============================================================
const RunningTrain = () => {
  const trainAnim = useRef(new Animated.Value(SCREEN_WIDTH + 60)).current;
  useEffect(() => {
    const runTrain = Animated.loop(
      Animated.sequence([
        Animated.timing(trainAnim, { toValue: -SCREEN_WIDTH - 60, duration: 14000, useNativeDriver: true }),
        Animated.timing(trainAnim, { toValue: SCREEN_WIDTH + 60, duration: 0, useNativeDriver: true }),
      ])
    );
    runTrain.start();
    return () => runTrain.stop();
  }, []);
  return (
    <View style={{ height: 40, overflow: "hidden", justifyContent: "center" }}>
      <Animated.Text style={{ fontSize: 28, transform: [{ translateX: trainAnim }] }}>{"🚂💨"}</Animated.Text>
    </View>
  );
};

// ============================================================
// SPEEDOMETER SCREEN
// ============================================================
const SpeedometerScreen = ({ onBack }) => {
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const locationSub = useRef(null);
  const needleAnim = useRef(new Animated.Value(0)).current;
  const trainAnim = useRef(new Animated.Value(SCREEN_WIDTH + 60)).current;
  const speedHistory = useRef([]);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const lastPos = useRef(null);
  const lastSpeedCategory = useRef("");
  const [voiceOn, setVoiceOn] = useState(true);

  const speak = (text) => {
    if (!voiceOn) return;
    Speech.stop();
    Speech.speak(text, { language: "hi-IN", pitch: 2.0, rate: 1.1 });
  };

  const getFunFact = (s) => {
    if (s < 20) return "Train abhi ruki hui hai. Chai peete hain! Ha ha ha!";
    if (s < 50) return "Train start ho gayi! Chalo chalo!";
    if (s < 80) return "Wah! Train running hai! Full speed ahead!";
    return "Train flying hai! Rocket ban gayi! Ha ha ha!";
  };

  const getSpeedCategoryKey = (s) => {
    if (s < 20) return "stop";
    if (s < 50) return "start";
    if (s < 80) return "running";
    return "flying";
  };

  const getSpeedCategory = (s) => {
    if (s < 20) return { label: "Train Stop 🛑", color: "#888" };
    if (s < 50) return { label: "Train Start 🚃", color: "#4CAF50" };
    if (s < 80) return { label: "Train Running 🚄", color: "#FFC107" };
    return { label: "Train Flying 🚀😄", color: "#FF6200" };
  };

  useEffect(() => {
    const duration = speed > 5 ? Math.max(1000, 8000 - speed * 50) : 14000;
    const runTrain = Animated.loop(
      Animated.sequence([
        Animated.timing(trainAnim, { toValue: -SCREEN_WIDTH - 60, duration, useNativeDriver: true }),
        Animated.timing(trainAnim, { toValue: SCREEN_WIDTH + 60, duration: 0, useNativeDriver: true }),
      ])
    );
    runTrain.start();
    return () => runTrain.stop();
  }, [speed > 0 ? Math.floor(speed / 20) : 0]);

  const startGPS = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        setErrorMsg("GPS permission nahi mili!\nSettings mein jaake allow karo.");
        setStatus("error");
        return;
      }
      setStatus("running");
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const spd = loc.coords.speed != null ? Math.max(0, loc.coords.speed * 3.6) : 0;
          const rounded = Math.round(spd);
          setSpeed(rounded);
          setMaxSpeed(prev => Math.max(prev, rounded));
          speedHistory.current.push(rounded);
          if (speedHistory.current.length > 60) speedHistory.current.shift();
          const avg = speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length;
          setAvgSpeed(Math.round(avg));
          const newCat = getSpeedCategoryKey(rounded);
          if (newCat !== lastSpeedCategory.current) {
            lastSpeedCategory.current = newCat;
            speak(getFunFact(rounded));
          }
          if (lastPos.current) {
            const dx = loc.coords.longitude - lastPos.current.longitude;
            const dy = loc.coords.latitude - lastPos.current.latitude;
            const R = 6371000;
            const lat1 = lastPos.current.latitude * Math.PI / 180;
            const lat2 = loc.coords.latitude * Math.PI / 180;
            const dLat = dy * Math.PI / 180;
            const dLon = dx * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            if (d < 500) setDistance(prev => prev + d / 1000);
          }
          lastPos.current = loc.coords;
          Animated.spring(needleAnim, { toValue: Math.min(rounded, 160), useNativeDriver: false, tension: 40, friction: 8 }).start();
        }
      );
    } catch (e) {
      setErrorMsg("GPS error! Phone restart karo.");
      setStatus("error");
    }
  };

  const stopGPS = () => {
    if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; }
    Speech.stop();
    setStatus("idle");
  };

  useEffect(() => { return () => { if (locationSub.current) locationSub.current.remove(); Speech.stop(); }; }, []);

  const cat = getSpeedCategory(speed);
  const needleDeg = needleAnim.interpolate({ inputRange: [0, 160], outputRange: ["-120deg", "120deg"] });
  const dialSize = SCREEN_WIDTH * 0.75;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { stopGPS(); onBack(); }}>
          <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>{"⚡ GPS Speedometer"}</Text>
      </View>
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", height: 44, overflow: "hidden", justifyContent: "center", marginBottom: 8 }}>
          <Animated.Text style={{ fontSize: 32, transform: [{ translateX: trainAnim }] }}>
            {speed >= 80 ? "🚄💨💨" : speed >= 50 ? "🚂💨" : "🚂"}
          </Animated.Text>
        </View>
        <View style={{ width: dialSize, height: dialSize, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <View style={{ position: "absolute", width: dialSize, height: dialSize, borderRadius: dialSize / 2, borderWidth: 8, borderColor: "#222", backgroundColor: "#111" }} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const segSpeed = i * 20;
            const segColor = segSpeed < 60 ? "#4CAF50" : segSpeed < 100 ? "#FFC107" : "#FF6200";
            const rotate = (-120 + i * 30) + "deg";
            return (
              <View key={i} style={{ position: "absolute", width: dialSize - 16, height: dialSize - 16, borderRadius: (dialSize - 16) / 2, borderWidth: 6, borderColor: speed > segSpeed ? segColor : "#2a2a2a", borderTopColor: "transparent", borderLeftColor: "transparent", transform: [{ rotate }] }} />
            );
          })}
          <Animated.View style={{ position: "absolute", width: 4, height: dialSize / 2 - 40, backgroundColor: "#FF6200", borderRadius: 2, bottom: "50%", transform: [{ rotate: needleDeg }, { translateY: -(dialSize / 4 - 20) }], transformOrigin: "bottom" }} />
          <View style={{ position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#FF6200" }} />
          <Text style={{ fontSize: speed >= 100 ? 64 : 72, fontWeight: "bold", color: "white", marginTop: 20 }}>{speed}</Text>
          <Text style={{ fontSize: 18, color: "#888", marginTop: -8 }}>{"km/h"}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: cat.color, marginBottom: 20, textAlign: "center" }}>{cat.label}</Text>
        <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, marginRight: 8, alignItems: "center" }}>
            <Text style={{ color: "#888", fontSize: 12 }}>{"Max Speed"}</Text>
            <Text style={{ color: "#FF6200", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{maxSpeed}</Text>
            <Text style={{ color: "#666", fontSize: 11 }}>{"km/h"}</Text>
          </View>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, marginRight: 8, alignItems: "center" }}>
            <Text style={{ color: "#888", fontSize: 12 }}>{"Avg Speed"}</Text>
            <Text style={{ color: "#4CAF50", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{avgSpeed}</Text>
            <Text style={{ color: "#666", fontSize: 11 }}>{"km/h"}</Text>
          </View>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#888", fontSize: 12 }}>{"Distance"}</Text>
            <Text style={{ color: "#2196F3", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{distance.toFixed(1)}</Text>
            <Text style={{ color: "#666", fontSize: 11 }}>{"km"}</Text>
          </View>
        </View>
        {status === "error" && (
          <View style={{ backgroundColor: "#b71c1c", borderRadius: 12, padding: 14, width: "100%", marginBottom: 16 }}>
            <Text style={{ color: "white", textAlign: "center" }}>{errorMsg}</Text>
          </View>
        )}
        {status === "idle" || status === "error" ? (
          <TouchableOpacity onPress={startGPS} style={{ backgroundColor: "#FF6200", borderRadius: 50, paddingVertical: 18, paddingHorizontal: 60, marginBottom: 16 }}>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{"🚀 On GPS"}</Text>
          </TouchableOpacity>
        ) : status === "loading" ? (
          <View style={{ backgroundColor: "#333", borderRadius: 50, paddingVertical: 18, paddingHorizontal: 60, marginBottom: 16 }}>
            <Text style={{ color: "white", fontSize: 18 }}>{"📡 GPS Searching..."}</Text>
          </View>
        ) : (
          <View style={{ width: "100%", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#4CAF50", marginRight: 8 }} />
              <Text style={{ color: "#4CAF50", fontSize: 14 }}>{"GPS Active — Live tracking on!"}</Text>
            </View>
            <TouchableOpacity onPress={stopGPS} style={{ backgroundColor: "#b71c1c", borderRadius: 50, paddingVertical: 16, paddingHorizontal: 50, marginBottom: 16 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{"🛑 Off GPS"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMaxSpeed(0); setDistance(0); speedHistory.current = []; setAvgSpeed(0); lastPos.current = null; }} style={{ backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 30 }}>
              <Text style={{ color: "#888", fontSize: 14 }}>{"🔄 Reset"}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, width: "100%", marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ color: "#FF6200", fontSize: 12 }}>{"💡 Fun Fact"}</Text>
            <TouchableOpacity onPress={() => { setVoiceOn(!voiceOn); if (voiceOn) Speech.stop(); }} style={{ backgroundColor: voiceOn ? "#FF6200" : "#333", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "white", fontSize: 12 }}>{voiceOn ? "🔊 Voice On" : "🔇 Voice Off"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#888", fontSize: 13 }}>{getFunFact(speed)}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================
// ROUTE SCREEN — Station Timeline (Image 2 jaisi!)
// ============================================================
const RouteScreen = ({ onBack, initialTrainNumber }) => {
  const [searchQuery, setSearchQuery] = useState(initialTrainNumber || "");
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDB().then((db) => {
      if (db) { setDbReady(true); }
      else setError("Database load nahi hua!");
    });
  }, []);

  useEffect(() => {
    if (initialTrainNumber && dbReady) {
      loadSchedule(initialTrainNumber);
    }
  }, [dbReady]);

  const loadSchedule = async (num) => {
    const trimmed = (num || searchQuery).trim();
    if (!trimmed) { setError("Train number daalo!"); return; }
    setLoading(true);
    setError("");
    setScheduleData(null);
    try {
      const result = await getTrainScheduleFromDB(trimmed);
      if (result && result.stations.length > 0) {
        setScheduleData(result);
      } else {
        setError("Train nahi mili! Train number check karo.");
      }
    } catch (e) {
      setError("Error aaya! Try karo.");
    }
    setLoading(false);
  };

  const formatTime = (time) => {
    if (!time || time === "None") return "---";
    return time.substring(0, 5);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {scheduleData ? (
            <>
              <Text style={{ fontSize: 15, fontWeight: "bold", color: "white" }} numberOfLines={1}>
                {scheduleData.train.number + " - " + scheduleData.train.name}
              </Text>
              <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>
                {scheduleData.train.from_stn + " → " + scheduleData.train.to_stn}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🗺️ Train Route"}</Text>
          )}
        </View>
      </View>

      {/* Search box */}
      <View style={{ padding: 12, backgroundColor: "#111" }}>
        <View style={{ flexDirection: "row", backgroundColor: "#2a2a2a", borderRadius: 12, alignItems: "center", paddingHorizontal: 15 }}>
          <TextInput
            style={{ flex: 1, color: "white", paddingVertical: 12, fontSize: 16, letterSpacing: 2 }}
            placeholder="Train number daalo (e.g. 12476)"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={5}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => loadSchedule(searchQuery)}
          />
          <TouchableOpacity
            onPress={() => loadSchedule(searchQuery)}
            style={{ backgroundColor: "#FF6200", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{loading ? "..." : "Search"}</Text>
          </TouchableOpacity>
        </View>
        {!dbReady && !error && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator size="small" color="#FF6200" />
            <Text style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{"Database load ho raha hai..."}</Text>
          </View>
        )}
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#FF6200" />
          <Text style={{ color: "#FF6200", fontSize: 15, marginTop: 16 }}>{"🔍 Train dhundh raha hoon..."}</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>{"😕"}</Text>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" }}>{error}</Text>
          <Text style={{ color: "#888", fontSize: 13, marginTop: 8, textAlign: "center" }}>{"Example: 12476, 12301, 22439"}</Text>
        </View>
      )}

      {/* Station Timeline — Image 2 jaisi! */}
      {scheduleData && !loading && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }}>
          {/* Train info card */}
          <View style={{ marginHorizontal: 16, backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Total Distance"}</Text>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.train.distance + " km"}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Stations"}</Text>
                <Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.stations.length}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Type"}</Text>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.train.type || "---"}</Text>
              </View>
            </View>
          </View>

          {/* Station rows */}
          {scheduleData.stations.map((stn, index) => {
            const isFirst = index === 0;
            const isLast = index === scheduleData.stations.length - 1;
            const dayChanged = index > 0 && stn.day !== scheduleData.stations[index - 1].day;

            return (
              <View key={index}>
                {/* Day divider */}
                {dayChanged && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 8 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#333" }} />
                    <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginHorizontal: 8 }}>
                      <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>{"Day " + stn.day}</Text>
                    </View>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#333" }} />
                  </View>
                )}

                <View style={{ flexDirection: "row", paddingHorizontal: 16, minHeight: 68 }}>
                  {/* Left — Arrival time */}
                  <View style={{ width: 65, alignItems: "flex-end", paddingRight: 10, paddingTop: 8 }}>
                    <Text style={{ color: isFirst || isLast ? "#FF6200" : "#bbb", fontSize: 13, fontWeight: isFirst || isLast ? "bold" : "normal" }}>
                      {isFirst ? formatTime(stn.departure) : formatTime(stn.arrival)}
                    </Text>
                  </View>

                  {/* Center — blue line + dot */}
                  <View style={{ alignItems: "center", width: 32 }}>
                    {/* Top line */}
                    {!isFirst && <View style={{ width: 2, height: 16, backgroundColor: "#4a90d9" }} />}
                    {isFirst && <View style={{ height: 16 }} />}

                    {/* Dot */}
                    {isFirst ? (
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 15 }}>{"🚂"}</Text>
                      </View>
                    ) : isLast ? (
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 15 }}>{"🏁"}</Text>
                      </View>
                    ) : (
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#4a90d9", borderWidth: 2, borderColor: "#1a1a1a" }} />
                    )}

                    {/* Bottom line */}
                    {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: "#4a90d9", minHeight: 28 }} />}
                  </View>

                  {/* Right — Station info */}
                  <View style={{ flex: 1, paddingLeft: 12, paddingTop: 6, paddingBottom: 12 }}>
                    <Text style={{ color: isFirst || isLast ? "white" : "#ddd", fontSize: isFirst || isLast ? 16 : 14, fontWeight: isFirst || isLast ? "bold" : "normal" }}>
                      {stn.station_name}
                    </Text>
                    <Text style={{ color: "#555", fontSize: 11, marginTop: 1 }}>{"[" + stn.station_code + "]"}</Text>
                    {/* Departure time — middle stations */}
                    {!isFirst && !isLast && stn.departure !== "None" && stn.departure !== stn.arrival && (
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Dep: " + formatTime(stn.departure)}</Text>
                    )}
                    {/* Last station arrival */}
                    {isLast && (
                      <Text style={{ color: "#FF6200", fontSize: 12, marginTop: 2, fontWeight: "bold" }}>{"Arr: " + formatTime(stn.arrival)}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Empty state */}
      {!scheduleData && !loading && !error && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>{"🗺️"}</Text>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center" }}>{"Train ka route dekhein!"}</Text>
          <Text style={{ color: "#888", fontSize: 14, marginTop: 8, textAlign: "center" }}>{"Upar train number daalein\naur saare stations dekhein!"}</Text>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, marginTop: 20, width: "100%" }}>
            <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>{"Examples:"}</Text>
            {["12476 — Hapa SF Express", "12301 — Howrah Rajdhani", "12951 — Mumbai Rajdhani"].map((ex, i) => (
              <TouchableOpacity key={i} onPress={() => { const num = ex.split(" ")[0]; setSearchQuery(num); loadSchedule(num); }}
                style={{ paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: "#333" }}>
                <Text style={{ color: "#aaa", fontSize: 13 }}>{"🚂 " + ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================
// TRAIN SEARCH SCREEN — Station se Station ke beech trains
// ============================================================
const TrainSearchScreen = ({ onBack, onGoToRoute, onGoToLive, savedState, onSaveState }) => {
  const [fromQuery, setFromQuery] = useState(savedState?.tsFromQuery || "");
  const [toQuery, setToQuery] = useState(savedState?.tsToQuery || "");
  const [fromStation, setFromStation] = useState(savedState?.tsFromStation || null);
  const [toStation, setToStation] = useState(savedState?.tsToStation || null);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [trains, setTrains] = useState(savedState?.tsTrains || []);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(savedState?.tsTrains?.length > 0);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDB().then((db) => { if (db) setDbReady(true); });
  }, []);

  const searchStations = async (text, type) => {
    if (type === "from") { setFromQuery(text); setFromStation(null); }
    else { setToQuery(text); setToStation(null); }
    if (!text || text.trim().length < 2) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const db = await getDB();
      if (!db) return;
      const results = await db.getAllAsync(
  `SELECT DISTINCT station_code, station_name FROM stations 
   WHERE station_code = ? OR UPPER(station_name) LIKE ? 
   GROUP BY station_code 
   ORDER BY CASE WHEN station_code = ? THEN 0 ELSE 1 END, station_name 
   LIMIT 8`,
  [text.trim().toUpperCase(), "%" + text.trim().toUpperCase() + "%", text.trim().toUpperCase()]
);
console.log("Search results:", results);
console.log("Search text:", text.trim().toUpperCase());
      if (type === "from") setFromSuggestions(results || []);
      else setToSuggestions(results || []);
    } catch (e) { console.log("Station search error:", e); }
  };

  const selectStation = (station, type) => {
    if (type === "from") {
      setFromStation(station);
      setFromQuery(station.station_name + " (" + station.station_code + ")");
      setFromSuggestions([]);
    } else {
      setToStation(station);
      setToQuery(station.station_name + " (" + station.station_code + ")");
      setToSuggestions([]);
    }
    setActiveInput(null);
  };

  const swapStations = () => {
    const tempStation = fromStation;
    const tempQuery = fromQuery;
    setFromStation(toStation);
    setFromQuery(toQuery);
    setToStation(tempStation);
    setToQuery(tempQuery);
    setTrains([]);
    setSearched(false);
    setSelectedTrain(null);
  };

  const findTrains = async () => {
    if (!fromStation || !toStation) { alert("From aur To station daalo!"); return; }
    if (fromStation.station_code === toStation.station_code) { alert("From aur To alag hone chahiye!"); return; }
    setSearching(true);
    setTrains([]);
    setSearched(false);
    setSelectedTrain(null);
    try {
      const db = await getDB();
      if (!db) return;
      const results = await db.getAllAsync(
        `SELECT t.number, t.name, t.type, t.distance,
                s1.stop_number as from_stop, s1.departure as from_dep, s1.day as from_day,
                s2.stop_number as to_stop, s2.arrival as to_arr, s2.day as to_day
         FROM trains t
         JOIN stations s1 ON s1.train_number = t.number AND s1.station_code = ?
         JOIN stations s2 ON s2.train_number = t.number AND s2.station_code = ?
         WHERE s1.stop_number < s2.stop_number
         ORDER BY s1.departure ASC
         LIMIT 50`,
        [fromStation.station_code, toStation.station_code]
      );
      setTrains(results || []);
      onSaveState({ fromStation, toStation, fromQuery, toQuery, trains: results || [] });
            setSearched(true);
          } catch (e) { console.log("Find trains error:", e); setSearched(true); }
    setSearching(false);
  };

  const formatTime = (time) => {
    if (!time || time === "None") return "---";
    return time.substring(0, 5);
  };

  const getDuration = (dep, arr, fromDay, toDay) => {
    if (!dep || !arr || dep === "None" || arr === "None") return "---";
    try {
      const depParts = dep.split(":");
      const arrParts = arr.split(":");
      let depMins = parseInt(depParts[0]) * 60 + parseInt(depParts[1]);
      let arrMins = parseInt(arrParts[0]) * 60 + parseInt(arrParts[1]);
      const dayDiff = (toDay || 1) - (fromDay || 1);
      arrMins += dayDiff * 24 * 60;
      const diff = arrMins - depMins;
      if (diff < 0) return "---";
      return Math.floor(diff / 60) + "h " + (diff % 60) + "m";
    } catch (e) { return "---"; }
  };

  // Train detail card
  if (selectedTrain) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setSelectedTrain(null)}>
            <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: "white" }} numberOfLines={1}>
              {selectedTrain.number + " - " + selectedTrain.name}
            </Text>
            <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>
              {fromStation.station_code + " → " + toStation.station_code}
            </Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#FF6200", fontSize: 22, fontWeight: "bold" }}>{fromStation.station_code}</Text>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop: 4 }}>{formatTime(selectedTrain.from_dep)}</Text>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Day " + (selectedTrain.from_day || 1)}</Text>
              </View>
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FF6200", fontSize: 20 }}>{"🚂"}</Text>
                <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold", marginTop: 4 }}>
                  {getDuration(selectedTrain.from_dep, selectedTrain.to_arr, selectedTrain.from_day, selectedTrain.to_day)}
                </Text>
                <View style={{ height: 1, width: 60, backgroundColor: "#FF6200", marginTop: 4 }} />
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#FF6200", fontSize: 22, fontWeight: "bold" }}>{toStation.station_code}</Text>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop: 4 }}>{formatTime(selectedTrain.to_arr)}</Text>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Day " + (selectedTrain.to_day || 1)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Train No."}</Text>
                <Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.number}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Type"}</Text>
                <Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.type || "---"}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"Total Stations"}</Text>
                <Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.to_stop}</Text>
              </View>
            </View>
          </View>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#4CAF50", marginRight: 10 }} />
              <Text style={{ color: "white", fontSize: 14 }}>{fromStation.station_name}</Text>
            </View>
            <View style={{ width: 2, height: 20, backgroundColor: "#4a90d9", marginLeft: 4, marginBottom: 8 }} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6200", marginRight: 10 }} />
              <Text style={{ color: "white", fontSize: 14 }}>{toStation.station_name}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity
              onPress={() => onGoToRoute(selectedTrain.number)}
              style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, flex: 1, marginRight: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>{"🗺️"}</Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 6 }}>{"Train Route"}</Text>
              <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Saare stations"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onGoToLive(selectedTrain.number)}
              style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, flex: 1, marginLeft: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>{"🚂"}</Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 6 }}>{"Running Status"}</Text>
              <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Abhi kahan hai"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main search screen
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🔎 Train Search"}</Text>
      </View>
      <View style={{ backgroundColor: "#111", padding: 16 }}>
        <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8, borderWidth: activeInput === "from" ? 1 : 0, borderColor: "#FF6200" }}>
          <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"FROM STATION"}</Text>
          <TextInput
            style={{ color: "white", fontSize: 15, paddingVertical: 8 }}
            placeholder="Station naam ya code (e.g. SLN)"
            placeholderTextColor="#555"
            value={fromQuery}
            onFocus={() => setActiveInput("from")}
            onChangeText={(t) => searchStations(t, "from")}
          />
          {fromQuery.length > 0 && (
  <TouchableOpacity onPress={() => { setFromQuery(""); setFromStation(null); setFromSuggestions([]); }}
    style={{ position: "absolute", right: 12, top: 20 }}>
    <Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text>
  </TouchableOpacity>
)}
        </View>
        {fromSuggestions.length > 0 && activeInput === "from" && (
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, marginBottom: 8, maxHeight: 200 }}>
            <ScrollView>
              {fromSuggestions.map((s, i) => (
                <TouchableOpacity key={i} onPress={() => selectStation(s, "from")}
                  style={{ padding: 12, borderBottomWidth: i < fromSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}>
                  <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}>
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text>
                  </View>
                  <Text style={{ color: "white", fontSize: 14 }}>{s.station_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <TouchableOpacity onPress={swapStations} style={{ alignSelf: "flex-end", backgroundColor: "#333", padding: 8, borderRadius: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, color: "white" }}>{"⇅"}</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8, borderWidth: activeInput === "to" ? 1 : 0, borderColor: "#FF6200" }}>
          <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"TO STATION"}</Text>
          <TextInput
            style={{ color: "white", fontSize: 15, paddingVertical: 8 }}
            placeholder="Station naam ya code (e.g. ADI)"
            placeholderTextColor="#555"
            value={toQuery}
            onFocus={() => setActiveInput("to")}
            onChangeText={(t) => searchStations(t, "to")}
          />
          {toQuery.length > 0 && (
  <TouchableOpacity onPress={() => { setToQuery(""); setToStation(null); setToSuggestions([]); }}
    style={{ position: "absolute", right: 12, top: 20 }}>
    <Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text>
  </TouchableOpacity>
)}
        </View>
        {toSuggestions.length > 0 && activeInput === "to" && (
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, marginBottom: 8, maxHeight: 200 }}>
            <ScrollView>
              {toSuggestions.map((s, i) => (
                <TouchableOpacity key={i} onPress={() => selectStation(s, "to")}
                  style={{ padding: 12, borderBottomWidth: i < toSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}>
                  <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}>
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text>
                  </View>
                  <Text style={{ color: "white", fontSize: 14 }}>{s.station_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <TouchableOpacity onPress={findTrains}
          style={{ backgroundColor: fromStation && toStation ? "#FF6200" : "#555", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 }}>
          {searching ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"🔍 FIND TRAINS"}</Text>
          )}
        </TouchableOpacity>
      </View>
      {searched && !searching && trains.length === 0 && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>{"😕"}</Text>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" }}>{"Koi train nahi mili!"}</Text>
          <Text style={{ color: "#888", fontSize: 13, marginTop: 8, textAlign: "center" }}>{"In dono stations ke beech koi direct train nahi"}</Text>
        </View>
      )}
      {trains.length > 0 && (
        <FlatList
          data={trains}
          keyExtractor={(item) => item.number}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={
            <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>
              {trains.length + " trains mili — " + fromStation.station_code + " → " + toStation.station_code}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedTrain(item)}
              style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold" }}>{item.number}</Text>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }} numberOfLines={1}>{item.name}</Text>
                </View>
                {item.type ? (
                  <View style={{ backgroundColor: "#333", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: "#aaa", fontSize: 12 }}>{item.type}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{formatTime(item.from_dep)}</Text>
                  <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{fromStation.station_code}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#FF6200", fontSize: 12 }}>
                    {getDuration(item.from_dep, item.to_arr, item.from_day, item.to_day)}
                  </Text>
                  <View style={{ height: 1, width: "80%", backgroundColor: "#444", marginTop: 4 }} />
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{formatTime(item.to_arr)}</Text>
                  <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{toStation.station_code}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      {!searched && !searching && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>{"🚉"}</Text>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center" }}>{"Station se Station!"}</Text>
          <Text style={{ color: "#888", fontSize: 14, marginTop: 8, textAlign: "center" }}>{"From aur To station daalo\naur saari trains dekhein!"}</Text>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginTop: 20, width: "100%" }}>
            <Text style={{ color: "#FF6200", fontSize: 12, fontWeight: "bold", marginBottom: 8 }}>{"Example:"}</Text>
            <TouchableOpacity onPress={() => {
              setFromQuery("SULTANPUR JN (SLN)"); setFromStation({ station_code: "SLN", station_name: "SULTANPUR JN" });
              setToQuery("AHMEDABAD JN (ADI)"); setToStation({ station_code: "ADI", station_name: "AHMEDABAD JN" });
            }}>
              <Text style={{ color: "#aaa", fontSize: 13 }}>{"🚉 SLN → ADI (Sultanpur to Ahmedabad)"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================
// MAIN HOME SCREEN
// ============================================================
export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState("home");
  const [selectedPNR, setSelectedPNR] = useState(null);
  const [pnr, setPnr] = useState("");
  const [pnrHistory, setPnrHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [liveTrainNumber, setLiveTrainNumber] = useState("");
  const [liveTrainDay, setLiveTrainDay] = useState("0");
  const [liveTrainData, setLiveTrainData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [routeTrainNumber, setRouteTrainNumber] = useState("");
  const [routeFrom, setRouteFrom] = useState("home");
  const [liveFrom, setLiveFrom] = useState("home");
  const [tsFromStation, setTsFromStation] = useState(null);
  const [tsToStation, setTsToStation] = useState(null);
  const [tsFromQuery, setTsFromQuery] = useState("");
  const [tsToQuery, setTsToQuery] = useState("");
  const [tsTrains, setTsTrains] = useState([]);
  const [showTrainSearch, setShowTrainSearch] = useState(false);

  useEffect(() => { setTimeout(() => setShowSplash(false), 2000); }, []);

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  useEffect(() => { loadAndRefreshPNRs(); }, []);

  const loadAndRefreshPNRs = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        setPnrHistory(list);
        for (const item of list) await autoRefreshPNR(item.data.pnrNumber);
      }
    } catch (e) { console.log("Load error:", e); }
  };

  const savePNRs = async (list) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (e) { console.log("Save error:", e); }
  };

  const autoRefreshPNR = async (pnrNum) => {
    try {
      const response = await fetch(
        "https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/" + pnrNum,
        { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-indian-railway-pnr-status.p.rapidapi.com" } }
      );
      const data = await response.json();
      if (data.success) {
        const journeyDate = parseDate(data.data.arrivalDate);
        const now = new Date();
        if (journeyDate && journeyDate < now) {
          setPnrHistory(prev => { const updated = prev.filter(p => p.data.pnrNumber !== pnrNum); savePNRs(updated); return updated; });
          return;
        }
        setPnrHistory(prev => {
          const exists = prev.findIndex(p => p.data.pnrNumber === data.data.pnrNumber);
          let updated;
          if (exists >= 0) { updated = [...prev]; updated[exists] = data; }
          else { updated = [...prev, data]; }
          savePNRs(updated);
          return updated;
        });
      } else {
        setPnrHistory(prev => { const updated = prev.filter(p => p.data.pnrNumber !== pnrNum); savePNRs(updated); return updated; });
      }
    } catch (e) { console.log("Auto refresh error:", e); }
  };

  const getDateLabel = (offset) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(new Date().getTime() - offset * 86400000);
    return days[date.getDay()] + ", " + String(date.getDate()).padStart(2, "0") + "-" + months[date.getMonth()];
  };

  const checkLiveTrain = async () => {
    if (liveTrainNumber.length < 4) { alert("Sahi train number daalo!"); return; }
    setLiveLoading(true);
    setLiveTrainData(null);
    try {
      const response = await fetch(
        "https://irctc-api2.p.rapidapi.com/liveTrain?trainNumber=" + liveTrainNumber + "&startDay=" + liveTrainDay,
        { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-api2.p.rapidapi.com" } }
      );
      const data = await response.json();
      setLiveTrainData(data);
    } catch (e) { alert("Error! Internet check karo!"); }
    setLiveLoading(false);
  };

  const getClassName = (code) => {
    const classes = { "SL": "Sleeper (SL)", "3A": "3rd AC (3A)", "2A": "2nd AC (2A)", "1A": "1st AC (1A)", "CC": "Chair Car (CC)", "EC": "Executive (EC)" };
    return classes[code] || code;
  };

  const parseDate = (str) => {
    if (!str) return null;
    try {
      const months = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };
      const parts = str.trim().split(" ");
      const mon = months[parts[0]]; const day = parseInt(parts[1]); const year = parseInt(parts[2]);
      const timeParts = parts[3].split(":");
      let hour = parseInt(timeParts[0]); const min = parseInt(timeParts[1]); const ampm = parts[4];
      if (ampm === "PM" && hour !== 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      return new Date(year, mon, day, hour, min);
    } catch (e) { return null; }
  };

  const formatDate = (str) => {
    const dt = parseDate(str);
    if (!dt) return "---";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return dt.getDate() + " " + months[dt.getMonth()] + " " + String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
  };

  const formatDateShort = (str) => {
    const dt = parseDate(str);
    if (!dt) return "---";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dt.getDay()] + ", " + dt.getDate() + " " + months[dt.getMonth()];
  };

  const getDuration = (depStr, arrStr) => {
    const dep = parseDate(depStr); const arr = parseDate(arrStr);
    if (!dep || !arr) return "---";
    const diffMs = arr.getTime() - dep.getTime();
    if (diffMs < 0) return "---";
    return Math.floor(diffMs / (1000 * 60 * 60)) + "h " + Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)) + "m";
  };

  const checkPNR = async (pnrNum?) => {
    const num = pnrNum || pnr;
    if (num.length !== 10) { alert("10 digit PNR number daalo!"); return; }
    setLoading(true);
    try {
      const response = await fetch(
        "https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/" + num,
        { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-indian-railway-pnr-status.p.rapidapi.com" } }
      );
      const data = await response.json();
      if (data.success) {
        setPnrHistory(prev => {
          const exists = prev.findIndex((p) => p.data.pnrNumber === data.data.pnrNumber);
          let updated;
          if (exists >= 0) { updated = [...prev]; updated[exists] = data; if (selectedPNR?.data?.pnrNumber === data.data.pnrNumber) setSelectedPNR(data); }
          else { updated = [...prev, data]; }
          savePNRs(updated);
          return updated;
        });
      } else { alert(data.message || "Error!"); }
    } catch (e) { alert("Error! Internet check karo!"); }
    setLoading(false);
  };

  const sharePNR = async (d) => {
    const passengers = d.passengerList.map((p) => {
      const isWL = p.currentStatus?.startsWith("WL");
      const berth = isWL ? p.currentStatusDetails : p.currentCoachId + "-" + p.currentBerthNo;
      return "Passenger " + p.passengerSerialNumber + ": " + p.currentStatus + " | Berth: " + berth;
    }).join("\n");
    await Share.share({
      message: "🚂 *Railayan - PNR Status*\n\nPNR: " + d.pnrNumber + "\nTrain: " + d.trainName + " (No. " + d.trainNumber + ")" +
        "\nFrom: " + d.sourceStation + " → " + d.destinationStation + "\nDeparture: " + formatDate(d.dateOfJourney) +
        "\nArrival: " + formatDate(d.arrivalDate) + "\nDuration: " + getDuration(d.dateOfJourney, d.arrivalDate) +
        "\nClass: " + getClassName(d.journeyClass) + "\nChart: " + d.chartStatus +
        "\n\n*Passengers:*\n" + passengers + "\n\n_Railayan App download karo aur apni train track karo!_"
    });
  };

  if (showSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 60 }}>{"🚂"}</Text>
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "white", marginTop: 10 }}>{"Railayan"}</Text>
        <Text style={{ fontSize: 16, color: "white", marginTop: 8 }}>{"Meri Train Kahan Hai?"}</Text>
      </View>
    );
  }

  if (screen === "speedometer") return <SpeedometerScreen onBack={() => setScreen("home")} />;

  if (screen === "trainsearch") {
    return <TrainSearchScreen
      onBack={() => setScreen("home")}
      onGoToRoute={(num) => { setRouteTrainNumber(num); setRouteFrom("trainsearch"); setScreen("route"); }}
      onGoToLive={(num) => { setLiveTrainNumber(num); setLiveFrom("trainsearch"); setScreen("livetrain"); }}
      savedState={{ tsFromStation, tsToStation, tsFromQuery, tsToQuery, tsTrains }}
      onSaveState={(s) => { setTsFromStation(s.fromStation); setTsToStation(s.toStation); setTsFromQuery(s.fromQuery); setTsToQuery(s.toQuery); setTsTrains(s.trains); }}
    />;
  }

  if (screen === "route") {
    return (
      <RouteScreen
        onBack={() => { setRouteTrainNumber(""); setScreen(routeFrom); }}
        initialTrainNumber={routeTrainNumber}
      />
    );
  }

  if (screen === "livetrain") {
    const d = liveTrainData?.data;
    const delay = d?.delay || 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { setScreen(liveFrom); setLiveTrainData(null); }}>
            <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {d ? (<><Text style={{ fontSize: 16, fontWeight: "bold", color: "white" }}>{liveTrainNumber + " " + d.train_name}</Text><Text style={{ fontSize: 11, color: "white", opacity: 0.8 }}>{d.train_name}</Text></>) : (<Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🚂 Live Train Status"}</Text>)}
          </View>
        </View>
        <RunningTrain />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: "row", backgroundColor: "#2a2a2a", borderRadius: 12, alignItems: "center", paddingHorizontal: 15, marginBottom: 12 }}>
            <TextInput style={{ flex: 1, color: "white", paddingVertical: 14, fontSize: 16, letterSpacing: 2 }} placeholder="Train number daalo" placeholderTextColor="#666" keyboardType="numeric" maxLength={5} value={liveTrainNumber} onChangeText={setLiveTrainNumber} />
            <TouchableOpacity onPress={checkLiveTrain} style={{ backgroundColor: "#FF6200", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{liveLoading ? "..." : "Search"}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {[0, 1, 2].map((offset) => {
              const val = String(offset);
              const label = getDateLabel(offset);
              const sublabel = offset === 0 ? "(Today)" : offset === 1 ? "(Yesterday)" : "";
              return (
                <TouchableOpacity key={val} onPress={() => setLiveTrainDay(val)}
                  style={{ marginRight: 10, backgroundColor: liveTrainDay === val ? "#FF6200" : "#2a2a2a", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: "center", minWidth: 145 }}>
                  <Text style={{ color: "white", fontWeight: liveTrainDay === val ? "bold" : "normal", fontSize: 13 }}>{label}</Text>
                  {sublabel ? <Text style={{ color: liveTrainDay === val ? "white" : "#888", fontSize: 11, marginTop: 2 }}>{sublabel}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {liveLoading && <View style={{ alignItems: "center", marginTop: 40 }}><Text style={{ color: "#FF6200", fontSize: 16 }}>{"🔍 Dhundh raha hoon..."}</Text></View>}
          {liveTrainData && !liveLoading && !liveTrainData.success && (
            <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 24, alignItems: "center", marginTop: 20 }}>
              <Text style={{ fontSize: 44 }}>{"😴"}</Text>
              <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 12, textAlign: "center" }}>{"Train abhi chal nahi rahi!"}</Text>
              <Text style={{ color: "#888", fontSize: 13, marginTop: 8, textAlign: "center" }}>{liveTrainData.error || "Doosra din try karo"}</Text>
            </View>
          )}
          {d && !liveLoading && (
            <View>
              <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>{"📍 Abhi kahan hai"}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{d.current_station_name || "---"}</Text>
                    {d.current_location_info?.[0]?.message ? <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{d.current_location_info[0].message}</Text> : null}
                  </View>
                  <View style={{ backgroundColor: delay > 0 ? "#b71c1c" : "#1b5e20", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 10 }}>
                    <Text style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>{delay > 0 ? delay + " min late" : "On Time ✓"}</Text>
                  </View>
                </View>
              </View>
              <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: "#aaa", fontSize: 12 }}>{d.distance_from_source + " km covered"}</Text>
                  <Text style={{ color: "#aaa", fontSize: 12 }}>{d.total_distance + " km total"}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "#444", borderRadius: 3 }}>
                  <View style={{ height: 6, backgroundColor: "#FF6200", borderRadius: 3, width: (Math.min(d.distance_from_source / d.total_distance, 1) * 100) + "%" }} />
                </View>
              </View>
              {d.next_stoppage_info && (
                <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{"⏭️ Agla Station"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{d.next_stoppage_info.next_stoppage}</Text>
                    <Text style={{ color: "#FF6200", fontSize: 13 }}>{d.next_stoppage_info.next_stoppage_time_diff}</Text>
                  </View>
                  {d.next_stoppage_info.next_stoppage_delay > 0 && <Text style={{ color: "#ff4444", fontSize: 12, marginTop: 4 }}>{d.next_stoppage_info.next_stoppage_delay + " min late"}</Text>}
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ backgroundColor: "#2a2a2a", padding: 12, borderRadius: 12, flex: 1, marginRight: 8 }}><Text style={{ color: "#888", fontSize: 11 }}>{"ETA"}</Text><Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 3 }}>{d.eta || "---"}</Text></View>
                <View style={{ backgroundColor: "#2a2a2a", padding: 12, borderRadius: 12, flex: 1 }}><Text style={{ color: "#888", fontSize: 11 }}>{"ETD"}</Text><Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 3 }}>{d.etd || "---"}</Text></View>
              </View>
              {d.current_location_info && d.current_location_info.length > 1 && (
                <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>{"ℹ️ Live Info"}</Text>
                  {d.current_location_info.map((info, i) => <Text key={i} style={{ color: "#ddd", fontSize: 13, marginBottom: 4 }}>{"• " + info.message}</Text>)}
                </View>
              )}
            </View>
          )}
        </ScrollView>
        {d && (
          <View style={{ backgroundColor: "#FF6200", padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>{d.current_location_info?.[1]?.message || (d.distance_from_source + " km covered")}</Text>
            <TouchableOpacity onPress={checkLiveTrain} style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 8, borderRadius: 20 }}>
              <Text style={{ color: "white", fontSize: 13 }}>{"🔄"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (screen === "pnrdetail" && selectedPNR) {
    const d = selectedPNR.data;
    const depDate = formatDate(d.dateOfJourney);
    const arrDate = formatDate(d.arrivalDate);
    const duration = getDuration(d.dateOfJourney, d.arrivalDate);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { setSelectedPNR(null); setScreen("pnr"); }}>
            <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{d.trainName}</Text>
            <Text style={{ fontSize: 12, color: "white", opacity: 0.8 }}>{"Train No. " + d.trainNumber}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: "#111", paddingVertical: 4 }}><RunningTrain /></View>
        <View style={{ padding: 16 }}>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View><Text style={{ color: "#888", fontSize: 11 }}>{"PNR Number"}</Text><Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{d.pnrNumber}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Booked On"}</Text><Text style={{ color: "white", fontSize: 13, marginTop: 2 }}>{formatDateShort(d.bookingDate)}</Text></View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <View><Text style={{ color: "#888", fontSize: 11 }}>{"Ticket Fare"}</Text><Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{"₹" + d.ticketFare}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Distance"}</Text><Text style={{ color: "white", fontSize: 13, marginTop: 2 }}>{d.distance + " km"}</Text></View>
            </View>
          </View>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>{d.sourceStation}</Text><Text style={{ color: "#aaa", fontSize: 13, marginTop: 3 }}>{depDate}</Text></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 20 }}>{"🚂"}</Text><Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold", marginTop: 3 }}>{duration}</Text></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>{d.destinationStation}</Text><Text style={{ color: "#aaa", fontSize: 13, marginTop: 3 }}>{arrDate}</Text></View>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ backgroundColor: "#2a2a2a", padding: 12, borderRadius: 12, flex: 1, marginRight: 8 }}><Text style={{ color: "#888", fontSize: 11 }}>{"Class"}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 3 }}>{getClassName(d.journeyClass)}</Text></View>
            <View style={{ backgroundColor: "#2a2a2a", padding: 12, borderRadius: 12, flex: 1 }}><Text style={{ color: "#888", fontSize: 11 }}>{"Chart Status"}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 3 }}>{d.chartStatus}</Text></View>
          </View>
          <Text style={{ color: "#FF6200", fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>{"Passengers"}</Text>
          {d.passengerList.map((p, i) => {
            const isWL = p.currentStatus?.startsWith("WL"); const isRAC = p.currentStatus?.startsWith("RAC");
            const berthText = isWL ? p.currentStatusDetails : p.currentCoachId + "-" + p.currentBerthNo;
            const berthColor = isWL ? "#ff4444" : isRAC ? "#FFA500" : "#4CAF50";
            const badgeColor = isWL ? "#b71c1c" : isRAC ? "#E65100" : "#1b5e20";
            return (
              <View key={i} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "white", fontSize: 15 }}>{"Passenger " + p.passengerSerialNumber}</Text>
                  <Text style={{ color: berthColor, fontSize: 13, marginTop: 3, fontWeight: "bold" }}>{"Berth: " + berthText}</Text>
                  <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Booking: " + p.bookingStatusDetails}</Text>
                </View>
                <View style={{ backgroundColor: badgeColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{p.currentStatus}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <TouchableOpacity onPress={() => checkPNR(d.pnrNumber)} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1, marginRight: 6 }}><Text style={{ color: "white", fontSize: 13 }}>{"🔄 Refresh"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setLiveTrainNumber(d.trainNumber); setLiveFrom("home"); setScreen("livetrain"); }} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1, marginRight: 6 }}><Text style={{ color: "white", fontSize: 13 }}>{"🚂 Running"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setRouteTrainNumber(d.trainNumber); setScreen("route"); }} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1 }}><Text style={{ color: "white", fontSize: 13 }}>{"🗺️ Route"}</Text></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => sharePNR(d)} style={{ backgroundColor: "#25D366", borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 20 }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"💬 WhatsApp pe Share Karo"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "pnr") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setScreen("home")}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>{"🔍 PNR Status"}</Text>
        </View>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", backgroundColor: "#2a2a2a", borderRadius: 12, alignItems: "center", paddingHorizontal: 15 }}>
            <TextInput style={{ flex: 1, color: "white", paddingVertical: 14, fontSize: 16, letterSpacing: 2 }} placeholder="10 digit PNR daalo" placeholderTextColor="#666" keyboardType="numeric" maxLength={10} value={pnr} onChangeText={setPnr} />
            <TouchableOpacity onPress={() => checkPNR(pnr)} style={{ backgroundColor: "#FF6200", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{loading ? "..." : "Search"}</Text>
            </TouchableOpacity>
          </View>
          {pnrHistory.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{pnrHistory.length + " PNR saved • Swipe karo →"}</Text>
              <FlatList ref={flatListRef} data={pnrHistory} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item, i) => i.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setSelectedPNR(item); setScreen("pnrdetail"); }} style={{ width: 300, backgroundColor: "#2a2a2a", borderRadius: 16, padding: 16, marginRight: 12 }}>
                    <Animated.Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", opacity: blinkAnim }}>{item.data.trainName}</Animated.Text>
                    <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Train No. " + item.data.trainNumber + " • PNR: " + item.data.pnrNumber}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                      <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.data.sourceStation}</Text><Text style={{ color: "#aaa", fontSize: 11 }}>{formatDate(item.data.dateOfJourney)}</Text></View>
                      <View style={{ flex: 1, alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 16 }}>{"🚂"}</Text><Text style={{ color: "#FF6200", fontSize: 11 }}>{getDuration(item.data.dateOfJourney, item.data.arrivalDate)}</Text></View>
                      <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.data.destinationStation}</Text><Text style={{ color: "#aaa", fontSize: 11 }}>{formatDate(item.data.arrivalDate)}</Text></View>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <View style={{ backgroundColor: item.data.passengerList?.[0]?.currentStatus?.startsWith("WL") ? "#b71c1c" : item.data.passengerList?.[0]?.currentStatus?.startsWith("RAC") ? "#E65100" : "#1b5e20", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{item.data.passengerList?.[0]?.currentStatusDetails || item.data.passengerList?.[0]?.currentStatus || "---"}</Text>
                      </View>
                      <Text style={{ color: "#888", fontSize: 12 }}>{getClassName(item.data.journeyClass)}</Text>
                      <Text style={{ color: "#FF6200", fontSize: 12 }}>{"Details →"}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, alignItems: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "white" }}>{"🚂 Railayan"}</Text>
        <Text style={{ fontSize: 14, color: "white", marginTop: 5 }}>{"Meri Train Kahan Hai?"}</Text>
      </View>
      <View style={{ backgroundColor: "#111", paddingVertical: 4 }}><RunningTrain /></View>
      <View style={{ padding: 15 }}>
        <Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>{"Features"}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <TouchableOpacity onPress={() => setScreen("pnr")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 30 }}>{"🔍"}</Text>
            <Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"PNR Status"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setLiveFrom("home"); setScreen("livetrain"); }} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 30 }}>{"🚂"}</Text>
            <Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Live Train"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <TouchableOpacity onPress={() => setScreen("trainsearch")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 30 }}>{"🔎"}</Text>
            <Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Train Search"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen("speedometer")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 30 }}>{"⚡"}</Text>
            <Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Speedometer"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <TouchableOpacity onPress={() => { setRouteTrainNumber(""); setScreen("route"); }} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 30 }}>{"🗺️"}</Text>
            <Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Train Route"}</Text>
          </TouchableOpacity>
          <View style={{ width: "48%" }} />
        </View>
      </View>
    </ScrollView>
  );
}
