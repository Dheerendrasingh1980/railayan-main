import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as SQLite from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Dimensions, FlatList, Keyboard, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const STORAGE_KEY = "railayan_pnr_list";
const CITY_STATION_GROUPS = {
  "NDLS": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "DLI": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "DEE": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "NZM": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "SZM": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "ANVT": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "ANDI": ["NDLS","DLI","DEE","NZM","SZM","ANVT","DSA","DEC","TKJ","PTNR","SSB","ANVR","ANDI"],
  "BCT": ["BCT","CSTM","LTT","BDTS","MMCT","DR","DDR","BVI","TNA","PNVL","BSR","CLA","BA","MM"],
  "CSTM": ["BCT","CSTM","LTT","BDTS","MMCT","DR","DDR","BVI","TNA","PNVL","BSR","CLA","BA","MM"],
  "LTT": ["BCT","CSTM","LTT","BDTS","MMCT","DR","DDR","BVI","TNA","PNVL","BSR","CLA","BA","MM"],
  "BDTS": ["BCT","CSTM","LTT","BDTS","MMCT","DR","DDR","BVI","TNA","PNVL","BSR","CLA","BA","MM"],
  "ADI": ["ADI","SBIB","SBT","SBI","ASV","MAN","CLDY"],
  "SBIB": ["ADI","SBIB","SBT","SBI","ASV","MAN","CLDY"],
  "MAN": ["ADI","SBIB","SBT","SBI","ASV","MAN","CLDY"],
  "HWH": ["HWH","KOAA","SDAH","SHM","SRC","CP"],
  "KOAA": ["HWH","KOAA","SDAH","SHM","SRC","CP"],
  "SDAH": ["HWH","KOAA","SDAH","SHM","SRC","CP"],
  "MAS": ["MAS","MS","MSB","TBM","PER","MSF","MSC"],
  "MS": ["MAS","MS","MSB","TBM","PER","MSF","MSC"],
  "SBC": ["SBC","YPR","BNC","BAND","KJM","WFD","BNCE"],
  "YPR": ["SBC","YPR","BNC","BAND","KJM","WFD","BNCE"],
  "SC": ["SC","HYB","KCG","LPI","MED","FM"],
  "HYB": ["SC","HYB","KCG","LPI","MED","FM"],
  "KCG": ["SC","HYB","KCG","LPI","MED","FM"],
  "PUNE": ["PUNE","PMP","LNL","HDP"],
  "LKO": ["LKO","LJN","ASH","ML","LC"],
  "LJN": ["LKO","LJN","ASH","ML","LC"],
  "AGC": ["AGC","AF","AGA","IDH","RKM"],
  "AF": ["AGC","AF","AGA","IDH","RKM"],
  "AGA": ["AGC","AF","AGA","IDH","RKM"],
  "JP": ["JP","GADJ","DPA","SNGN"],
  "PNBE": ["PNBE","PNC","DNR","RJPB","PWS"],
  "DNR": ["PNBE","PNC","DNR","RJPB","PWS"],
  "BSB": ["BSB","BCY","MUV","MGS","KEI","BSBS"],
  "MUV": ["BSB","BCY","MUV","MGS","KEI","BSBS"],
  "MGS": ["BSB","BCY","MUV","MGS","KEI","BSBS"],
  "ALD": ["ALD","NYN","PFM","ALY"],
  "CNB": ["CNB","CPA","GOY","PNK","CPB"],
  "ST": ["ST","UDN","KIM"],
  "UDN": ["ST","UDN","KIM"],
  "BRC": ["BRC"],
  "NGP": ["NGP","ITR","AJNI","WR"],
  "BPL": ["BPL","HBJ","MSO"],
  "HBJ": ["BPL","HBJ","MSO"],
  "JU": ["JU","RKB","BGKT","BANE","MMC","JUCT"],
  "JAM": ["JAM","HAPA"],
  "HAPA": ["JAM","HAPA"],
  "MAQ": ["MAQ","MAJN"],
  "GKP": ["GKP","GKC","GKPE"],
  "VSKP": ["VSKP","WAT"],
  "BBS": ["BBS","BBSN","CTC","PURI"],
  "CTC": ["BBS","BBSN","CTC","PURI"],
  "GHY": ["GHY","KYQ","NGC"],
  "KYQ": ["GHY","KYQ","NGC"],
  "RNC": ["RNC","HTE"],
  "DHN": ["DHN","GMO"],
  "ERS": ["ERS","ERN","AWY","ALLP"],
  "TVC": ["TVC","KCVL","TVP"],
  "CDG": ["CDG","UMB","UBC"],
  "UMB": ["CDG","UMB","UBC"],
  "DDN": ["DDN","HW","RKSH"],
  "HW": ["DDN","HW","RKSH"],
};

const getRelatedStations = (code) => {
  return CITY_STATION_GROUPS[code.toUpperCase()] || [code.toUpperCase()];
};
const RAPIDAPI_KEY = "d99e338eb6mshbeaa0e430c17cd2p1a2481jsn7e407c501775";
const WINNING_COMBINATIONS = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

let dbInstance = null;
let currentDBVersion = null;

// GitHub se latest version fetch karo
const fetchLatestDBVersion = async () => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/railayanapp/railayan-data/main/version.json",
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.version || null;
  } catch (e) {
    console.log("Version fetch failed:", e);
    return null;
  }
};

const getDB = async () => {
  if (dbInstance) return dbInstance;
  try {
    const dbName = "railayan.db";
    const dbPath = FileSystem.documentDirectory + "SQLite/" + dbName;
    const dir = FileSystem.documentDirectory + "SQLite/";

    // SQLite folder banao agar nahi hai
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    // Local mein saved version check karo
    const savedVersion = await AsyncStorage.getItem("db_version");
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    const fileExists = fileInfo.exists && fileInfo.size && fileInfo.size > 1000000;

    // GitHub se latest version fetch karo
    const latestVersion = await fetchLatestDBVersion();
    console.log("Saved:", savedVersion, "| Latest:", latestVersion, "| FileExists:", fileExists);

    // Version same hai aur file bhi hai → seedha open karo
    if (latestVersion && savedVersion === latestVersion && fileExists) {
      console.log("DB up to date:", latestVersion);
      currentDBVersion = latestVersion;
      dbInstance = await SQLite.openDatabaseAsync(dbName);
      return dbInstance;
    }

    // Version different hai ya file nahi → download karo
    const versionToDownload = latestVersion || savedVersion || "cf3c67b"; // fallback
    console.log("Downloading DB version:", versionToDownload);

    await FileSystem.downloadAsync(
      "https://github.com/railayanapp/railayan-data/raw/" + versionToDownload + "/railayan.db",
      dbPath
    );

    // Size check
    const fileInfoAfter = await FileSystem.getInfoAsync(dbPath);
    if (!fileInfoAfter.exists || fileInfoAfter.size < 1000000) {
      console.log("Download failed or file too small");
      dbInstance = null;
      return null;
    }

    // Save karo new version
    await AsyncStorage.setItem("db_version", versionToDownload);
    currentDBVersion = versionToDownload;
    console.log("DB downloaded successfully:", versionToDownload);

    dbInstance = await SQLite.openDatabaseAsync(dbName);
    return dbInstance;

  } catch (e) {
    console.log("DB Error:", e);
    dbInstance = null;
    return null;
  }
};

const getTrainScheduleFromDB = async (trainNumber) => {
  try {
    const db = await getDB();
    if (!db) { console.log("DB null!"); return null; }
    console.log("Searching train:", trainNumber);
    const train = await db.getFirstAsync("SELECT * FROM trains WHERE number = ?", [trainNumber]);
    console.log("Train found:", train);
    if (!train) return null;
    const stations = await db.getAllAsync("SELECT * FROM stations WHERE train_number = ? ORDER BY day ASC, stop_number ASC", [trainNumber]);
    console.log("Stations count:", stations?.length);
    return { train, stations: stations || [] };
  } catch (e) { console.log("Schedule error:", e); return null; }
};

// ============================================================
// RUNNING TRAIN ANIMATION
// ============================================================
const RunningTrain = () => {
  const trainAnim = useRef(new Animated.Value(SCREEN_WIDTH + 60)).current;
  useEffect(() => {
    const runTrain = Animated.loop(
      Animated.sequence([
        Animated.timing(trainAnim, { toValue: -SCREEN_WIDTH - 60, duration: 4000, useNativeDriver: true }),
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

  useEffect(() => {
    activateKeepAwake();
    return () => deactivateKeepAwake();
  }, []);

  const speak = (text) => { if (!voiceOn) return; Speech.stop(); Speech.speak(text, { language: "hi-IN", pitch: 2.0, rate: 1.1 }); };
  const getFunFact = (s) => { if (s < 20) return "Train abhi ruki hui hai. Chai peete hain! Ha ha ha!"; if (s < 50) return "Train start ho gayi! Chalo chalo!"; if (s < 80) return "Wah! Train running hai! Full speed ahead!"; return "Train flying hai! Rocket ban gayi! Ha ha ha!"; };
  const getSpeedCategoryKey = (s) => { if (s < 20) return "stop"; if (s < 50) return "start"; if (s < 80) return "running"; return "flying"; };
  const getSpeedCategory = (s) => { if (s < 20) return { label: "Train Stop 🛑", color: "#888" }; if (s < 50) return { label: "Train Start 🚃", color: "#4CAF50" }; if (s < 80) return { label: "Train Running 🚄", color: "#FFC107" }; return { label: "Train Flying 🚀😄", color: "#FF6200" }; };

  useEffect(() => {
    const duration = speed > 5 ? Math.max(1000, 6000 - speed * 40) : 4000;
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
    setStatus("loading"); setErrorMsg("");
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") { setErrorMsg("GPS permission nahi mili!\nSettings mein jaake allow karo."); setStatus("error"); return; }
      setStatus("running");
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const spd = loc.coords.speed != null ? Math.max(0, loc.coords.speed * 3.6) : 0;
          const rounded = Math.round(spd);
          setSpeed(rounded); setMaxSpeed(prev => Math.max(prev, rounded));
          speedHistory.current.push(rounded);
          if (speedHistory.current.length > 60) speedHistory.current.shift();
          const avg = speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length;
          setAvgSpeed(Math.round(avg));
          const newCat = getSpeedCategoryKey(rounded);
          if (newCat !== lastSpeedCategory.current) { lastSpeedCategory.current = newCat; speak(getFunFact(rounded)); }
          if (lastPos.current) {
            const dx = loc.coords.longitude - lastPos.current.longitude; const dy = loc.coords.latitude - lastPos.current.latitude;
            const R = 6371000; const lat1 = lastPos.current.latitude * Math.PI / 180; const lat2 = loc.coords.latitude * Math.PI / 180;
            const dLat = dy * Math.PI / 180; const dLon = dx * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); const d = R * c;
            if (d < 500) setDistance(prev => prev + d / 1000);
          }
          lastPos.current = loc.coords;
          Animated.spring(needleAnim, { toValue: Math.min(rounded, 160), useNativeDriver: false, tension: 40, friction: 8 }).start();
        }
      );
    } catch (e) { setErrorMsg("GPS error! Phone restart karo."); setStatus("error"); }
  };

  const stopGPS = () => { if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; } Speech.stop(); setStatus("idle"); };
  useEffect(() => { return () => { if (locationSub.current) locationSub.current.remove(); Speech.stop(); }; }, []);

  const cat = getSpeedCategory(speed);
  const needleDeg = needleAnim.interpolate({ inputRange: [0, 160], outputRange: ["-120deg", "120deg"] });
  const dialSize = SCREEN_WIDTH * 0.75;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { stopGPS(); onBack(); }}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>{"⚡ GPS Speedometer"}</Text>
      </View>
      <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", height: 44, overflow: "hidden", justifyContent: "center", marginBottom: 8 }}>
          <Animated.Text style={{ fontSize: 32, transform: [{ translateX: trainAnim }] }}>{speed >= 80 ? "🚄💨💨" : speed >= 50 ? "🚂💨" : "🚂"}</Animated.Text>
        </View>
        <View style={{ width: dialSize, height: dialSize, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <View style={{ position: "absolute", width: dialSize, height: dialSize, borderRadius: dialSize / 2, borderWidth: 8, borderColor: "#222", backgroundColor: "#111" }} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const segSpeed = i * 20; const segColor = segSpeed < 60 ? "#4CAF50" : segSpeed < 100 ? "#FFC107" : "#FF6200"; const rotate = (-120 + i * 30) + "deg";
            return <View key={i} style={{ position: "absolute", width: dialSize - 16, height: dialSize - 16, borderRadius: (dialSize - 16) / 2, borderWidth: 6, borderColor: speed > segSpeed ? segColor : "#2a2a2a", borderTopColor: "transparent", borderLeftColor: "transparent", transform: [{ rotate }] }} />;
          })}
          <Animated.View style={{ position: "absolute", width: 4, height: dialSize / 2 - 40, backgroundColor: "#FF6200", borderRadius: 2, bottom: "50%", transform: [{ rotate: needleDeg }, { translateY: -(dialSize / 4 - 20) }], transformOrigin: "bottom" }} />
          <View style={{ position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#FF6200" }} />
          <Text style={{ fontSize: speed >= 100 ? 64 : 72, fontWeight: "bold", color: "white", marginTop: 20 }}>{speed}</Text>
          <Text style={{ fontSize: 18, color: "#888", marginTop: -8 }}>{"km/h"}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: cat.color, marginBottom: 20, textAlign: "center" }}>{cat.label}</Text>
        <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, marginRight: 8, alignItems: "center" }}><Text style={{ color: "#888", fontSize: 12 }}>{"Max Speed"}</Text><Text style={{ color: "#FF6200", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{maxSpeed}</Text><Text style={{ color: "#666", fontSize: 11 }}>{"km/h"}</Text></View>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, marginRight: 8, alignItems: "center" }}><Text style={{ color: "#888", fontSize: 12 }}>{"Avg Speed"}</Text><Text style={{ color: "#4CAF50", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{avgSpeed}</Text><Text style={{ color: "#666", fontSize: 11 }}>{"km/h"}</Text></View>
          <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, flex: 1, alignItems: "center" }}><Text style={{ color: "#888", fontSize: 12 }}>{"Distance"}</Text><Text style={{ color: "#2196F3", fontSize: 24, fontWeight: "bold", marginTop: 4 }}>{distance.toFixed(1)}</Text><Text style={{ color: "#666", fontSize: 11 }}>{"km"}</Text></View>
        </View>
        {status === "error" ? (
          <View style={{ backgroundColor: "#b71c1c", borderRadius: 12, padding: 14, width: "100%", marginBottom: 16 }}>
            <Text style={{ color: "white", textAlign: "center" }}>{errorMsg}</Text>
          </View>
        ) : null}
        {(status === "idle" || status === "error") ? (
          <TouchableOpacity onPress={startGPS} style={{ backgroundColor: "#FF6200", borderRadius: 50, paddingVertical: 18, paddingHorizontal: 60, marginBottom: 16 }}><Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{"🚀 On GPS"}</Text></TouchableOpacity>
        ) : status === "loading" ? (
          <View style={{ backgroundColor: "#333", borderRadius: 50, paddingVertical: 18, paddingHorizontal: 60, marginBottom: 16 }}><Text style={{ color: "white", fontSize: 18 }}>{"📡 GPS Searching..."}</Text></View>
        ) : (
          <View style={{ width: "100%", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#4CAF50", marginRight: 8 }} /><Text style={{ color: "#4CAF50", fontSize: 14 }}>{"GPS Active — Live tracking on!"}</Text></View>
            <TouchableOpacity onPress={stopGPS} style={{ backgroundColor: "#b71c1c", borderRadius: 50, paddingVertical: 16, paddingHorizontal: 50, marginBottom: 16 }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{"🛑 Off GPS"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setMaxSpeed(0); setDistance(0); speedHistory.current = []; setAvgSpeed(0); lastPos.current = null; }} style={{ backgroundColor: "#1a1a1a", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 30 }}><Text style={{ color: "#888", fontSize: 14 }}>{"🔄 Reset"}</Text></TouchableOpacity>
          </View>
        )}
        <View style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, width: "100%", marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ color: "#FF6200", fontSize: 12 }}>{"💡 Fun Fact"}</Text>
            <TouchableOpacity onPress={() => { setVoiceOn(!voiceOn); if (voiceOn) Speech.stop(); }} style={{ backgroundColor: voiceOn ? "#FF6200" : "#333", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}><Text style={{ color: "white", fontSize: 12 }}>{voiceOn ? "🔊 Voice On" : "🔇 Voice Off"}</Text></TouchableOpacity>
          </View>
          <Text style={{ color: "#888", fontSize: 13 }}>{getFunFact(speed)}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================
// SNAKE GAME
// ============================================================
const SnakeGame = ({ onBack }) => {
  const COLS = 15; const ROWS = 20; const CELL = Math.floor(SCREEN_WIDTH * 0.9 / COLS);
  const [snake, setSnake] = useState([[7, 10], [6, 10], [5, 10]]);
  const [food, setFood] = useState([12, 5]);
  const [dir, setDir] = useState([1, 0]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const dirRef = useRef([1, 0]);
  const snakeRef = useRef([[7, 10], [6, 10], [5, 10]]);

  const placeFood = (s) => {
    let fx, fy;
    do { fx = Math.floor(Math.random() * COLS); fy = Math.floor(Math.random() * ROWS); }
    while (s.some(([x, y]) => x === fx && y === fy));
    return [fx, fy];
  };

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const [dx, dy] = dirRef.current;
      const head = snakeRef.current[0];
      const newHead = [head[0] + dx, head[1] + dy];
      if (newHead[0] < 0 || newHead[0] >= COLS || newHead[1] < 0 || newHead[1] >= ROWS || snakeRef.current.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
        setRunning(false); setGameOver(true); return;
      }
      const newSnake = [newHead, ...snakeRef.current];
      setFood(prev => {
        if (newHead[0] === prev[0] && newHead[1] === prev[1]) {
          setScore(s => s + 10);
          const nf = placeFood(newSnake);
          snakeRef.current = newSnake;
          setSnake([...newSnake]);
          return nf;
        }
        newSnake.pop();
        snakeRef.current = newSnake;
        setSnake([...newSnake]);
        return prev;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [running]);

  const startGame = () => {
    const s = [[7, 10], [6, 10], [5, 10]];
    snakeRef.current = s; dirRef.current = [1, 0];
    setSnake(s); setDir([1, 0]); setFood(placeFood(s));
    setScore(0); setGameOver(false); setRunning(true);
  };

  const changeDir = (nd) => {
    const [dx, dy] = dirRef.current;
    if (nd[0] !== -dx || nd[1] !== -dy) { dirRef.current = nd; setDir(nd); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{"🐍 Snake"}</Text>
        <Text style={{ color: "white", fontSize: 16, marginLeft: "auto" }}>{"Score: " + score}</Text>
      </View>
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <View style={{ width: COLS * CELL, height: ROWS * CELL, backgroundColor: "#111", borderWidth: 2, borderColor: "#333", position: "relative" }}>
          {snake.map(([x, y], i) => (
            <View key={i} style={{ position: "absolute", left: x * CELL, top: y * CELL, width: CELL - 1, height: CELL - 1, backgroundColor: i === 0 ? "#FF6200" : "#4CAF50", borderRadius: 2 }} />
          ))}
          <View style={{ position: "absolute", left: food[0] * CELL, top: food[1] * CELL, width: CELL - 1, height: CELL - 1, backgroundColor: "#ff4444", borderRadius: CELL / 2 }} />
        </View>
      </View>
      {gameOver ? <Text style={{ color: "#ff4444", textAlign: "center", fontSize: 18, fontWeight: "bold", marginTop: 12 }}>{"Game Over! Score: " + score}</Text> : null}
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <TouchableOpacity onPress={() => changeDir([0, -1])} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginBottom: 4 }}><Text style={{ color: "white", fontSize: 18 }}>{"▲"}</Text></TouchableOpacity>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity onPress={() => changeDir([-1, 0])} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginRight: 8 }}><Text style={{ color: "white", fontSize: 18 }}>{"◄"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => changeDir([0, 1])} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginRight: 8 }}><Text style={{ color: "white", fontSize: 18 }}>{"▼"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => changeDir([1, 0])} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8 }}><Text style={{ color: "white", fontSize: 18 }}>{"►"}</Text></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={startGame} style={{ backgroundColor: "#FF6200", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginTop: 12 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{running ? "Restart" : gameOver ? "Play Again" : "Start"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================
// TIC TAC TOE
// ============================================================
const TicTacToe = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);

  const checkWinner = (b) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, bb, c] = lines[i];
      if (b[a] && b[a] === b[bb] && b[a] === b[c]) {
        setWinningLine(i);
        return b[a];
      }
    }
    setWinningLine(null);
    return b.every(Boolean) ? "Draw" : null;
  };

  const press = (i) => {
    if (board[i] || winner) return;
    const nb = [...board];
    nb[i] = xTurn ? "X" : "O";
    setBoard(nb);
    setXTurn(!xTurn);
    const w = checkWinner(nb);
    if (w) setWinner(w);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setWinner(null);
    setWinningLine(null);
  };

  const renderWinningLine = () => {
    if (winningLine === null) return null;
    switch(winningLine) {
      case 0: return <View style={{ position: 'absolute', top: 39, left: 10, width: 220, height: 4, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 1: return <View style={{ position: 'absolute', top: 117, left: 10, width: 220, height: 4, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 2: return <View style={{ position: 'absolute', top: 195, left: 10, width: 220, height: 4, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 3: return <View style={{ position: 'absolute', top: 10, left: 39, width: 4, height: 220, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 4: return <View style={{ position: 'absolute', top: 10, left: 117, width: 4, height: 220, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 5: return <View style={{ position: 'absolute', top: 10, left: 195, width: 4, height: 220, backgroundColor: '#FF6200', opacity: 0.8 }} />;
      case 6: return <View style={{ position: 'absolute', top: 118, left: 15, width: 210, height: 4, backgroundColor: '#FF6200', opacity: 0.8, transform: [{ rotate: '45deg' }] }} />;
      case 7: return <View style={{ position: 'absolute', top: 118, left: 15, width: 210, height: 4, backgroundColor: '#FF6200', opacity: 0.8, transform: [{ rotate: '-45deg' }] }} />;
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{"❌ Tic Tac Toe"}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: winner ? "#FF6200" : "white", fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
          {winner ? (winner === "Draw" ? "Draw!" : winner + " Jeeta!") : (xTurn ? "X ki baari" : "O ki baari")}
        </Text>
        <View style={{ position: "relative", width: 240 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", width: 240 }}>
            {board.map((cell, i) => (
              <TouchableOpacity key={i} onPress={() => press(i)}
                style={{ width: 78, height: 78, borderWidth: 2, borderColor: "#444", justifyContent: "center", alignItems: "center", margin: 1 }}>
                <Text style={{ fontSize: 36, color: cell === "X" ? "#FF6200" : "#4CAF50", fontWeight: "bold" }}>{cell || ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderWinningLine()}
        </View>
        <TouchableOpacity onPress={reset} style={{ backgroundColor: "#FF6200", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginTop: 24 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"Reset"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================
// FLAPPY BIRD
// ============================================================
const FlappyBird = ({ onBack }) => {
  const GRAVITY = 1; const JUMP = -10; const PIPE_W = 50; const GAP = 150;
  const [birdY, setBirdY] = useState(200);
  const [vel, setVel] = useState(0);
  const [pipes, setPipes] = useState([{ x: SCREEN_WIDTH, top: 100 }]);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const birdRef = useRef(200); const velRef = useRef(0);
  const pipesRef = useRef([{ x: SCREEN_WIDTH, top: 100 }]);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      velRef.current += GRAVITY;
      birdRef.current += velRef.current;
      if (birdRef.current > 500 || birdRef.current < 0) { setRunning(false); setDead(true); return; }
      pipesRef.current = pipesRef.current.map(p => ({ ...p, x: p.x - 5 })).filter(p => p.x > -PIPE_W);
      if (pipesRef.current.length === 0 || pipesRef.current[pipesRef.current.length - 1].x < SCREEN_WIDTH - 220) {
        pipesRef.current.push({ x: SCREEN_WIDTH, top: 60 + Math.floor(Math.random() * 200) });
      }
      pipesRef.current.forEach(p => {
        if (p.x < 80 && p.x + PIPE_W > 40) {
          if (birdRef.current < p.top || birdRef.current + 30 > p.top + GAP) { setRunning(false); setDead(true); }
        }
        if (p.x + PIPE_W === 40) { scoreRef.current++; setScore(scoreRef.current); }
      });
      setBirdY(birdRef.current);
      setPipes([...pipesRef.current]);
    }, 30);
    return () => clearInterval(interval);
  }, [running]);

  const jump = () => { if (running) { velRef.current = JUMP; setVel(JUMP); } };
  const start = () => {
    birdRef.current = 200; velRef.current = 0; pipesRef.current = [{ x: SCREEN_WIDTH, top: 100 }]; scoreRef.current = 0;
    setBirdY(200); setVel(0); setPipes([{ x: SCREEN_WIDTH, top: 100 }]); setScore(0); setDead(false); setRunning(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#87CEEB" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{"🐦 Flappy Bird"}</Text>
        <Text style={{ color: "white", fontSize: 16, marginLeft: "auto" }}>{"Score: " + score}</Text>
      </View>
      <TouchableOpacity activeOpacity={1} onPress={jump} style={{ flex: 1, position: "relative" }}>
        <View style={{ position: "absolute", left: 40, top: birdY, width: 30, height: 30, backgroundColor: "#FFD700", borderRadius: 15, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 20 }}>{"🐦"}</Text>
        </View>
        {pipes.map((p, i) => (
          <View key={i}>
            <View style={{ position: "absolute", left: p.x, top: 0, width: PIPE_W, height: p.top, backgroundColor: "#4CAF50", borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
            <View style={{ position: "absolute", left: p.x, top: p.top + GAP, width: PIPE_W, bottom: 0, backgroundColor: "#4CAF50", borderTopLeftRadius: 8, borderTopRightRadius: 8, height: 600 }} />
          </View>
        ))}
        {!running ? (
          <View style={{ position: "absolute", top: 150, left: 0, right: 0, alignItems: "center" }}>
            {dead ? <Text style={{ color: "#b71c1c", fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>{"Game Over! " + score}</Text> : null}
            <TouchableOpacity onPress={start} style={{ backgroundColor: "#FF6200", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{dead ? "Play Again" : "Start"}</Text>
            </TouchableOpacity>
            {!dead ? <Text style={{ color: "#333", fontSize: 14, marginTop: 10 }}>{"Tap to fly!"}</Text> : null}
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

// ============================================================
// 2048
// ============================================================
const Game2048 = ({ onBack }) => {
  const newBoard = () => { const b = Array(4).fill(null).map(() => Array(4).fill(0)); addTile(b); addTile(b); return b; };
  const addTile = (b) => {
    const empty = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (b[r][c] === 0) empty.push([r, c]);
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  };
  const [board, setBoard] = useState(newBoard);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);

  const moveLeft = (b) => {
    let sc = 0;
    const nb = b.map(row => {
      const r = row.filter(x => x); const merged = [];
      for (let i = 0; i < r.length; i++) {
        if (r[i] === r[i + 1]) { merged.push(r[i] * 2); sc += r[i] * 2; i++; } else merged.push(r[i]);
      }
      while (merged.length < 4) merged.push(0);
      return merged;
    });
    return { nb, sc };
  };

  const rotate = (b) => b[0].map((_, i) => b.map(row => row[i]).reverse());

  const move = (dir) => {
    let b = board.map(r => [...r]); let sc = 0;
    if (dir === "right") b = rotate(rotate(b));
    else if (dir === "up") b = rotate(rotate(rotate(b)));
    else if (dir === "down") b = rotate(b);
    const res = moveLeft(b); b = res.nb; sc = res.sc;
    if (dir === "right") b = rotate(rotate(b));
    else if (dir === "up") b = rotate(b);
    else if (dir === "down") b = rotate(rotate(rotate(b)));
    addTile(b);
    setBoard(b); setScore(s => s + sc);
    if (b.some(r => r.some(c => c === 2048))) setWon(true);
  };

  const tileColor = (v) => {
    const c = { 0: "#cdc1b4", 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#edc53f", 2048: "#edc22e" };
    return c[v] || "#3c3a32";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{"🔢 2048"}</Text>
        <Text style={{ color: "white", fontSize: 16, marginLeft: "auto" }}>{"Score: " + score}</Text>
      </View>
      {won ? <Text style={{ color: "#FF6200", textAlign: "center", fontSize: 20, fontWeight: "bold", marginTop: 10 }}>{"🎉 2048! Badiya!"}</Text> : null}
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <View style={{ backgroundColor: "#bbada0", padding: 6, borderRadius: 8 }}>
          {board.map((row, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {row.map((cell, c) => (
                <View key={c} style={{ width: 70, height: 70, backgroundColor: tileColor(cell), margin: 4, borderRadius: 6, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: cell >= 1024 ? 18 : cell >= 100 ? 22 : 26, fontWeight: "bold", color: cell <= 4 ? "#776e65" : "white" }}>{cell || ""}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity onPress={() => move("up")} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, alignItems: "center", marginBottom: 4 }}><Text style={{ color: "white", fontSize: 20 }}>{"▲"}</Text></TouchableOpacity>
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <TouchableOpacity onPress={() => move("left")} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginRight: 8 }}><Text style={{ color: "white", fontSize: 20 }}>{"◄"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => move("down")} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginRight: 8 }}><Text style={{ color: "white", fontSize: 20 }}>{"▼"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => move("right")} style={{ backgroundColor: "#333", padding: 14, borderRadius: 8 }}><Text style={{ color: "white", fontSize: 20 }}>{"►"}</Text></TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => { setBoard(newBoard()); setScore(0); setWon(false); }} style={{ backgroundColor: "#FF6200", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"New Game"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================
// BRICK BREAKER WITH 25 LEVELS
// ============================================================
const BrickBreaker = ({ onBack }) => {
  const W = SCREEN_WIDTH - 32; const H = 400;
  const PADDLE_W = 80; const BALL_R = 10;

  const LEVELS = [
    { rows: 4, cols: 6, speed: 3,   name: "Beginner" },
    { rows: 4, cols: 7, speed: 3.2, name: "Easy" },
    { rows: 5, cols: 6, speed: 3.4, name: "Easy Plus" },
    { rows: 5, cols: 7, speed: 3.6, name: "Medium" },
    { rows: 5, cols: 8, speed: 3.8, name: "Medium Plus" },
    { rows: 6, cols: 7, speed: 4.0, name: "Hard" },
    { rows: 6, cols: 8, speed: 4.2, name: "Hard Plus" },
    { rows: 6, cols: 9, speed: 4.4, name: "Tough" },
    { rows: 7, cols: 8, speed: 4.6, name: "Tough Plus" },
    { rows: 7, cols: 9, speed: 4.8, name: "Expert" },
    { rows: 7, cols: 10, speed: 5.0, name: "Expert Plus" },
    { rows: 8, cols: 9, speed: 5.2, name: "Pro" },
    { rows: 8, cols: 10, speed: 5.4, name: "Pro Plus" },
    { rows: 8, cols: 11, speed: 5.6, name: "Master" },
    { rows: 9, cols: 10, speed: 5.8, name: "Master Plus" },
    { rows: 9, cols: 11, speed: 6.0, name: "Grand Master" },
    { rows: 9, cols: 12, speed: 6.2, name: "Elite" },
    { rows: 10, cols: 11, speed: 6.4, name: "Elite Plus" },
    { rows: 10, cols: 12, speed: 6.6, name: "Champion" },
    { rows: 10, cols: 13, speed: 6.8, name: "Hero" },
    { rows: 11, cols: 12, speed: 7.0, name: "Legend" },
    { rows: 11, cols: 13, speed: 7.2, name: "Mythic" },
    { rows: 12, cols: 12, speed: 7.5, name: "Godly" },
    { rows: 12, cols: 13, speed: 7.8, name: "Insane" },
    { rows: 12, cols: 14, speed: 8.0, name: "IMPOSSIBLE" },
  ];

  const [level, setLevel] = useState(1);
  const currentLevel = LEVELS[level-1];
  const BRICK_ROWS = currentLevel.rows;
  const BRICK_COLS = currentLevel.cols;
  const BRICK_W = Math.floor(W / BRICK_COLS) - 4;
  const BRICK_H = 22;

  const initBricks = () => Array(BRICK_ROWS).fill(null).map((_, r) => Array(BRICK_COLS).fill(null).map((_, c) => ({ x: c * (BRICK_W + 4) + 2, y: r * (BRICK_H + 6) + 40, alive: true })));

  const [paddle, setPaddle] = useState(W / 2 - PADDLE_W / 2);
  const [ball, setBall] = useState({ x: W / 2, y: H - 60 });
  const [vel, setVel] = useState({ x: currentLevel.speed, y: -4 });
  const [bricks, setBricks] = useState(initBricks());
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const stateRef = useRef({ ball: { x: W / 2, y: H - 60 }, vel: { x: currentLevel.speed, y: -4 }, paddle: W / 2 - PADDLE_W / 2, bricks: initBricks(), score: 0 });

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      let { x, y } = s.ball; let { x: vx, y: vy } = s.vel;
      x += vx; y += vy;
      if (x <= BALL_R || x >= W - BALL_R) vx = -vx;
      if (y <= BALL_R) vy = -vy;
      if (y >= H - 30 - BALL_R && x >= s.paddle && x <= s.paddle + PADDLE_W) { vy = -Math.abs(vy); }
      if (y > H) { setRunning(false); setLost(true); return; }
      let sc = s.score;
      const nb = s.bricks.map(row => row.map(b => {
        if (!b.alive) return b;
        if (x >= b.x && x <= b.x + BRICK_W && y >= b.y && y <= b.y + BRICK_H) { vy = -vy; sc++; return { ...b, alive: false }; }
        return b;
      }));
      if (nb.every(row => row.every(b => !b.alive))) {
        if (level < 25) { setLevelComplete(true); setRunning(false); }
        else { setWon(true); setRunning(false); }
      }
      stateRef.current = { ...s, ball: { x, y }, vel: { x: vx, y: vy }, bricks: nb, score: sc };
      setBall({ x, y }); setVel({ x: vx, y: vy }); setBricks([...nb]); setScore(sc);
    }, 16);
    return () => clearInterval(interval);
  }, [running]);

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    const newLevel = LEVELS[next-1];
    setVel({ x: newLevel.speed, y: -4 });
    const ib = Array(newLevel.rows).fill(null).map((_, r) => Array(newLevel.cols).fill(null).map((_, c) => ({ x: c * (BRICK_W + 4) + 2, y: r * (BRICK_H + 6) + 40, alive: true })));
    stateRef.current = { ball: { x: W / 2, y: H - 60 }, vel: { x: newLevel.speed, y: -4 }, paddle: W / 2 - PADDLE_W / 2, bricks: ib, score: 0 };
    setBall({ x: W / 2, y: H - 60 }); setBricks(ib); setPaddle(W / 2 - PADDLE_W / 2);
    setLevelComplete(false); setRunning(true);
  };

  const movePaddle = (dir) => {
    const np = Math.max(0, Math.min(W - PADDLE_W, stateRef.current.paddle + dir * 30));
    stateRef.current.paddle = np; setPaddle(np);
  };

  const start = () => {
    const ib = initBricks();
    stateRef.current = { ball: { x: W / 2, y: H - 60 }, vel: { x: currentLevel.speed, y: -4 }, paddle: W / 2 - PADDLE_W / 2, bricks: ib, score: 0 };
    setBall({ x: W / 2, y: H - 60 }); setVel({ x: currentLevel.speed, y: -4 }); setPaddle(W / 2 - PADDLE_W / 2);
    setBricks(ib); setScore(0); setLost(false); setWon(false); setLevelComplete(false); setRunning(true);
  };

  const restartLevel = () => { setLevel(1); start(); };

  const brickColors = ["#FF6200", "#FF9800", "#4CAF50", "#2196F3", "#9C27B0", "#E91E63"];

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "white" }}>{"🧱 Brick Breaker"}</Text>
          <Text style={{ fontSize: 11, color: "white", opacity: 0.8 }}>{"Level " + level + "/25 • " + currentLevel.name}</Text>
        </View>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"Score: " + score}</Text>
      </View>
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <View style={{ width: W, height: H, backgroundColor: "#111", borderWidth: 2, borderColor: "#333", position: "relative" }}>
          {bricks.map((row, r) => row.map((b, c) => b.alive ? (
            <View key={r + "-" + c} style={{ position: "absolute", left: b.x, top: b.y, width: BRICK_W, height: BRICK_H, backgroundColor: brickColors[level % brickColors.length], borderRadius: 4 }} />
          ) : null))}
          <View style={{ position: "absolute", left: ball.x - BALL_R, top: ball.y - BALL_R, width: BALL_R * 2, height: BALL_R * 2, backgroundColor: "white", borderRadius: BALL_R }} />
          <View style={{ position: "absolute", left: paddle, top: H - 30, width: PADDLE_W, height: 12, backgroundColor: "#FF6200", borderRadius: 6 }} />
          {!running ? (
            <View style={{ position: "absolute", top: H / 2 - 60, left: 0, right: 0, alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 20 }}>
              {levelComplete ? <Text style={{ color: "#4CAF50", fontSize: 22, fontWeight: "bold", marginBottom: 10 }}>{"🎉 Level " + level + " Complete!"}</Text> : null}
              {won ? <Text style={{ color: "#FF6200", fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>{"🏆 GAME COMPLETE! 🏆"}</Text> : null}
              {lost ? <Text style={{ color: "#ff4444", fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>{"Game Over!"}</Text> : null}
              {!won && !lost && !levelComplete ? <Text style={{ color: "white", fontSize: 16, marginBottom: 10 }}>{"Press Start"}</Text> : null}
              <View style={{ flexDirection: "row" }}>
                {levelComplete ? (
                  <TouchableOpacity onPress={nextLevel} style={{ backgroundColor: "#4CAF50", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginHorizontal: 5 }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"Next Level →"}</Text>
                  </TouchableOpacity>
                ) : null}
                {(lost || won || (!running && !levelComplete)) ? (
                  <TouchableOpacity onPress={level === 1 ? start : restartLevel} style={{ backgroundColor: "#FF6200", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginHorizontal: 5 }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{won ? "Play Again" : lost ? "Try Again" : "Start"}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
        {running ? (
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity onPress={() => movePaddle(-1)} style={{ backgroundColor: "#333", padding: 20, borderRadius: 12, marginRight: 40 }}>
              <Text style={{ color: "white", fontSize: 26 }}>{"◄"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => movePaddle(1)} style={{ backgroundColor: "#333", padding: 20, borderRadius: 12 }}>
              <Text style={{ color: "white", fontSize: 26 }}>{"►"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ============================================================
// NUMBER GUESS GAME
// ============================================================
const NumberGuessGame = ({ onBack }) => {
  const [target, setTarget] = useState(Math.floor(Math.random() * 20) + 1);
  const [input, setInput] = useState("");
  const [tries, setTries] = useState(5);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);

  const reset = () => { setTarget(Math.floor(Math.random() * 20) + 1); setInput(""); setTries(5); setMessage(""); setWon(false); setLost(false); };

  const submit = () => {
    const guess = Number(input);
    if (!guess || guess < 1 || guess > 20) { alert("1 se 20 tak ka number do"); return; }
    if (guess === target) { setMessage("🎉 Sahi! Number " + target + " tha!"); setWon(true); return; }
    const next = tries - 1;
    if (next === 0) { setMessage("💀 Game Over! Number " + target + " tha!"); setLost(true); setTries(0); return; }
    setMessage(guess < target ? "⬆️ Bada number try karo!" : "⬇️ Chhota number try karo!");
    setTries(next); setInput("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🔮 Number Guess"}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: "#888", fontSize: 15, marginBottom: 4 }}>{"1 se 20 ke beech ek number socho"}</Text>
        <Text style={{ color: "#FF6200", fontSize: 20, fontWeight: "bold", marginBottom: 24 }}>{"Tries bacha: " + tries}</Text>
        {message ? <Text style={{ color: won ? "#4CAF50" : lost ? "#ff4444" : "white", fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" }}>{message}</Text> : null}
        {!won && !lost ? (
          <>
            <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => { Keyboard.dismiss(); submit(); }}
              placeholder="Number daalo" placeholderTextColor="#555" keyboardType="numeric"
              style={{ color: "white", backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, fontSize: 22, width: 200, textAlign: "center", marginBottom: 16 }} />
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); submit(); }} style={{ backgroundColor: "#FF6200", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 }}>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{"Submit"}</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {(won || lost) ? (
          <TouchableOpacity onPress={reset} style={{ backgroundColor: "#FF6200", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginTop: 16 }}>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{"Play Again"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

// ============================================================
// SMALL GAMES SCREEN
// ============================================================
const SmallGamesScreen = ({ onBack }) => {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === "snake") return <SnakeGame onBack={() => setActiveGame(null)} />;
  if (activeGame === "tictactoe") return <TicTacToe onBack={() => setActiveGame(null)} />;
  if (activeGame === "flappy") return <FlappyBird onBack={() => setActiveGame(null)} />;
  if (activeGame === "2048") return <Game2048 onBack={() => setActiveGame(null)} />;
  if (activeGame === "brick") return <BrickBreaker onBack={() => setActiveGame(null)} />;
  if (activeGame === "guess") return <NumberGuessGame onBack={() => setActiveGame(null)} />;

  const games = [
    { id: "snake", emoji: "🐍", name: "Snake", desc: "Classic snake game" },
    { id: "tictactoe", emoji: "❌", name: "Tic Tac Toe", desc: "2 player on same phone" },
    { id: "flappy", emoji: "🐦", name: "Flappy Bird", desc: "Tap to fly!" },
    { id: "2048", emoji: "🔢", name: "2048", desc: "Swipe to merge tiles" },
    { id: "brick", emoji: "🧱", name: "Brick Breaker", desc: "Break all bricks!" },
    { id: "guess", emoji: "🔮", name: "Number Guess", desc: "1-20, 5 tries" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🎮 Small Games"}</Text>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>{"Journey mein time pass karo!"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {games.map((g) => (
            <TouchableOpacity key={g.id} onPress={() => setActiveGame(g.id)}
              style={{ width: "48%", backgroundColor: "#2a2a2a", padding: 16, borderRadius: 12, marginBottom: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{g.emoji}</Text>
              <Text style={{ color: "white", fontSize: 15, fontWeight: "bold" }}>{g.name}</Text>
              <Text style={{ color: "#888", fontSize: 12, marginTop: 4, textAlign: "center" }}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================
// ROUTE SCREEN
// ============================================================
const RouteScreen = ({ onBack, initialTrainNumber }) => {
  const [searchQuery, setSearchQuery] = useState(initialTrainNumber || "");
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRoute, setShowRoute] = useState(false);

  useEffect(() => { getDB().then((db) => { if (db) setDbReady(true); else setError("Database load nahi hua!"); }); }, []);
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem("route_recent_searches");
        if (saved) setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    };
    load();
  }, []);
  useEffect(() => { if (initialTrainNumber && dbReady) loadSchedule(initialTrainNumber); }, [dbReady]);

  const loadSchedule = async (num) => {
    const trimmed = (num || searchQuery).trim();
    if (!trimmed) { setError("Train number daalo!"); return; }
    setLoading(true); setError(""); setScheduleData(null);
    try {
      const result = await getTrainScheduleFromDB(trimmed);
      if (result && result.stations.length > 0) {
        setScheduleData(result);
        setShowRoute(true);
        const newSearch = { trainNumber: trimmed, trainName: result.train.name || trimmed, fromStn: result.train.from_stn || "", toStn: result.train.to_stn || "" };
        setRecentSearches(prev => {
          const updated = [newSearch, ...prev.filter(s => s.trainNumber !== trimmed)].slice(0, 10);
          AsyncStorage.setItem("route_recent_searches", JSON.stringify(updated));
          return updated;
        });
      }
      else setError("Train nahi mili! Train number check karo.");
    } catch (e) { setError("Error aaya! Try karo."); }
    setLoading(false);
  };

  const formatTime = (time) => { if (!time || time === "None") return "---"; return time.substring(0, 5); };

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { if (showRoute) { setShowRoute(false); setScheduleData(null); setSearchQuery(""); setError(""); } else { onBack(); } }}>
          <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {scheduleData ? (
            <>
              <Text style={{ fontSize: 15, fontWeight: "bold", color: "white" }} numberOfLines={1}>{scheduleData.train.number + " - " + scheduleData.train.name}</Text>
              <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>{scheduleData.train.from_stn + " → " + scheduleData.train.to_stn}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🗺️ Train Route"}</Text>
          )}
        </View>
      </View>
      <View style={{ padding: 12, backgroundColor: "#111" }}>
        <View style={{ flexDirection: "row", backgroundColor: "#2a2a2a", borderRadius: 12, alignItems: "center", paddingHorizontal: 15 }}>
          <TextInput style={{ flex: 1, color: "white", paddingVertical: 12, fontSize: 16, letterSpacing: 2 }} placeholder="Train number daalo (e.g. 12476)" placeholderTextColor="#666" keyboardType="numeric" maxLength={5} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => { Keyboard.dismiss(); loadSchedule(searchQuery); }} />
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); loadSchedule(searchQuery); }} style={{ backgroundColor: "#FF6200", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{loading ? "..." : "Search"}</Text>
          </TouchableOpacity>
        </View>
        {(!dbReady && !error) ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator size="small" color="#FF6200" />
            <Text style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{"Database load ho raha hai..."}</Text>
          </View>
        ) : null}
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#FF6200" />
          <Text style={{ color: "#FF6200", fontSize: 15, marginTop: 16 }}>{"🔍 Train dhundh raha hoon..."}</Text>
        </View>
      ) : null}
      {(error && !loading) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>{"😕"}</Text>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" }}>{error}</Text>
          <Text style={{ color: "#888", fontSize: 13, marginTop: 8, textAlign: "center" }}>{"Example: 12476, 12301, 22439"}</Text>
        </View>
      ) : null}
      {(scheduleData && !loading && showRoute) ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }}>
          <View style={{ marginHorizontal: 16, backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View><Text style={{ color: "#888", fontSize: 11 }}>{"Total Distance"}</Text><Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.train.distance + " km"}</Text></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Stations"}</Text><Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.stations.length}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Type"}</Text><Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{scheduleData.train.type || "---"}</Text></View>
            </View>
          </View>
          {scheduleData.stations.map((stn, index) => {
            const isFirst = index === 0;
            const isLast = index === scheduleData.stations.length - 1;
            // ✅ FIX: boolean banaya taaki kabhi bhi number render na ho
            const dayChanged = !!(index > 0 && stn.day !== scheduleData.stations[index - 1].day);
            return (
              <View key={index}>
                {dayChanged ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 8 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#333" }} />
                    <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginHorizontal: 8 }}>
                      <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>{"Day " + stn.day}</Text>
                    </View>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#333" }} />
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", paddingHorizontal: 16, minHeight: 68 }}>
                  <View style={{ width: 65, alignItems: "flex-end", paddingRight: 10, paddingTop: 8 }}>
                    <Text style={{ color: isFirst || isLast ? "#FF6200" : "#bbb", fontSize: 13, fontWeight: isFirst || isLast ? "bold" : "normal" }}>{isFirst ? formatTime(stn.departure) : formatTime(stn.arrival)}</Text>
                  </View>
                  <View style={{ alignItems: "center", width: 32 }}>
                    {!isFirst ? <View style={{ width: 2, height: 16, backgroundColor: "#4a90d9" }} /> : <View style={{ height: 16 }} />}
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
                    {!isLast ? <View style={{ width: 2, flex: 1, backgroundColor: "#4a90d9", minHeight: 28 }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12, paddingTop: 6, paddingBottom: 12 }}>
                    <Text style={{ color: isFirst || isLast ? "white" : "#ddd", fontSize: isFirst || isLast ? 16 : 14, fontWeight: isFirst || isLast ? "bold" : "normal" }}>{stn.station_name}</Text>
                    <Text style={{ color: "#555", fontSize: 11, marginTop: 1 }}>{"[" + stn.station_code + "]"}</Text>
                    {(!isFirst && !isLast && stn.departure !== "None" && stn.departure !== stn.arrival) ? (
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Dep: " + formatTime(stn.departure)}</Text>
                    ) : null}
                    {isLast ? (
                      <Text style={{ color: "#FF6200", fontSize: 12, marginTop: 2, fontWeight: "bold" }}>{"Arr: " + formatTime(stn.arrival)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
      {(!scheduleData && !loading && !error) ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {recentSearches.length > 0 ? (
            <View>
              <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{"🕐 Recent Searches"}</Text>
              {recentSearches.map((item, i) => (
                <TouchableOpacity key={i} onPress={() => { setSearchQuery(item.trainNumber); loadSchedule(item.trainNumber); }}
                  style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold" }}>{item.trainNumber}</Text>
                    <Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{item.trainName}</Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{item.fromStn + " → " + item.toStn}</Text>
                  </View>
                  <Text style={{ color: "#FF6200", fontSize: 20 }}>{"🚂"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>{"🗺️"}</Text>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center" }}>{"Train number daalein!"}</Text>
              <Text style={{ color: "#888", fontSize: 14, marginTop: 8, textAlign: "center" }}>{"Saare stations aur timings dekhein"}</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
};

// ============================================================
// TRAIN SEARCH SCREEN
// ============================================================
const TrainSearchScreen = ({ onBack, onGoToRoute, onGoToLive, savedState, onSaveState }) => {
  const [fromQuery, setFromQuery] = useState(savedState?.tsFromQuery || "");
  const [toQuery, setToQuery] = useState(savedState?.tsToQuery || "");
  const [fromStation, setFromStation] = useState(savedState?.tsFromStation || null);
  const [toStation, setToStation] = useState(savedState?.tsToStation || null);
  const [journeyDate, setJourneyDate] = useState(savedState?.tsDate ? new Date(savedState.tsDate) : new Date());
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [trains, setTrains] = useState(savedState?.tsTrains || []);
  const [searching, setSearching] = useState(false);
  const [savedTrainList, setSavedTrainList] = useState([]);
  const [savedFromStation, setSavedFromStation] = useState(null);
  const [savedToStation, setSavedToStation] = useState(null);
  const [searched, setSearched] = useState(savedState?.tsTrains?.length > 0);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => { getDB().then((db) => { if (db) setDbReady(true); }); }, []);
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem("ts_recent_searches");
        if (saved) setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    };
    load();
  }, []);

  const searchStations = async (text, type) => {
    if (type === "from") { setFromQuery(text); setFromStation(null); } else { setToQuery(text); setToStation(null); }
    if (!text || text.trim().length < 2) { if (type === "from") setFromSuggestions([]); else setToSuggestions([]); return; }
    try {
      const db = await getDB(); if (!db) return;
      const results = await db.getAllAsync(
        `SELECT DISTINCT station_code, station_name FROM stations WHERE station_code = ? OR UPPER(station_name) LIKE ? GROUP BY station_code ORDER BY CASE WHEN station_code = ? THEN 0 ELSE 1 END, station_name LIMIT 8`,
        [text.trim().toUpperCase(), "%" + text.trim().toUpperCase() + "%", text.trim().toUpperCase()]
      );
      if (type === "from") setFromSuggestions(results || []); else setToSuggestions(results || []);
    } catch (e) { console.log("Station search error:", e); }
  };

  const selectStation = (station, type) => {
    if (type === "from") { setFromStation(station); setFromQuery(station.station_name + " (" + station.station_code + ")"); setFromSuggestions([]); }
    else { setToStation(station); setToQuery(station.station_name + " (" + station.station_code + ")"); setToSuggestions([]); }
    setActiveInput(null);
  };

  const swapStations = () => {
    const tempStation = fromStation; const tempQuery = fromQuery;
    setFromStation(toStation); setFromQuery(toQuery); setToStation(tempStation); setToQuery(tempQuery);
    setTrains([]); setSearched(false); setSelectedTrain(null);
  };

  const findTrains = async () => {
    Keyboard.dismiss();
    if (!fromStation || !toStation) { alert("From aur To station daalo!"); return; }
    if (fromStation.station_code === toStation.station_code) { alert("From aur To alag hone chahiye!"); return; }
    setSearching(true); setTrains([]); setSearched(false); setSelectedTrain(null);
    try {
      const db = await getDB(); if (!db) return;
      const fromCodes = getRelatedStations(fromStation.station_code);
      const toCodes = getRelatedStations(toStation.station_code);
const fromPlaceholders = fromCodes.map(() => "?").join(",");
const toPlaceholders = toCodes.map(() => "?").join(",");
const results = await db.getAllAsync(
  `SELECT t.number, t.name, t.type, t.distance,
   s1.stop_number as from_stop, s1.departure as from_dep, s1.day as from_day, s1.station_code as from_code,
   s2.stop_number as to_stop, s2.arrival as to_arr, s2.day as to_day, s2.station_code as to_code
   FROM trains t
   JOIN stations s1 ON s1.train_number = t.number AND s1.station_code IN (${fromPlaceholders})
   JOIN stations s2 ON s2.train_number = t.number AND s2.station_code IN (${toPlaceholders})
   WHERE s1.stop_number < s2.stop_number
   GROUP BY t.number
   ORDER BY s1.departure ASC LIMIT 50`,
  [...fromCodes, ...toCodes]
);
      setTrains(results || []);
      onSaveState({ fromStation, toStation, fromQuery, toQuery, tsDate: journeyDate.toISOString(), trains: results || [] });
      // Recent save karo
      const newSearch = { fromCode: fromStation.station_code, fromName: fromStation.station_name, toCode: toStation.station_code, toName: toStation.station_name };
      setRecentSearches(prev => {
        const updated = [newSearch, ...prev.filter(s => !(s.fromCode === newSearch.fromCode && s.toCode === newSearch.toCode))].slice(0, 5);
        AsyncStorage.setItem("ts_recent_searches", JSON.stringify(updated));
        return updated;
      });
      setSearched(true);
      setShowResults(true);
    } catch (e) { console.log("Find trains error:", e); setSearched(true); }
    setSearching(false);
  };

  const formatTime = (time) => { if (!time || time === "None") return "---"; return time.substring(0, 5); };
  const getDuration = (dep, arr, fromDay, toDay) => {
    if (!dep || !arr || dep === "None" || arr === "None") return "---";
    try {
      let depMins = parseInt(dep.split(":")[0]) * 60 + parseInt(dep.split(":")[1]);
      let arrMins = parseInt(arr.split(":")[0]) * 60 + parseInt(arr.split(":")[1]);
      arrMins += ((toDay || 1) - (fromDay || 1)) * 24 * 60;
      const diff = arrMins - depMins; if (diff < 0) return "---";
      return Math.floor(diff / 60) + "h " + (diff % 60) + "m";
    } catch (e) { return "---"; }
  };

  if (showResults) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setShowResults(false)}>
            <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "white" }}>{fromStation?.station_code + " → " + toStation?.station_code}</Text>
            <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>{trains.length + " trains mili"}</Text>
          </View>
        </View>
        {trains.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>{"😕"}</Text>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"Koi train nahi mili!"}</Text>
          </View>
        ) : (
          <FlatList data={trains} keyExtractor={(item, index) => item.number + "_" + index}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setSelectedTrain(item); setShowResults(false); }}
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
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.from_dep ? item.from_dep.substring(0,5) : "---"}</Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{fromStation?.station_code}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: "#FF6200", fontSize: 12 }}>{"🚂"}</Text>
                    <View style={{ height: 1, width: "80%", backgroundColor: "#444", marginTop: 4 }} />
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.to_arr ? item.to_arr.substring(0,5) : "---"}</Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{toStation?.station_code}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }
  if (selectedTrain) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setSelectedTrain(null)}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: "white" }} numberOfLines={1}>{selectedTrain.number + " - " + selectedTrain.name}</Text>
            <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>{fromStation.station_code + " → " + toStation.station_code}</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 22, fontWeight: "bold" }}>{fromStation.station_code}</Text><Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop: 4 }}>{formatTime(selectedTrain.from_dep)}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Day " + (selectedTrain.from_day || 1)}</Text></View>
              <View style={{ alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#FF6200", fontSize: 20 }}>{"🚂"}</Text><Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold", marginTop: 4 }}>{getDuration(selectedTrain.from_dep, selectedTrain.to_arr, selectedTrain.from_day, selectedTrain.to_day)}</Text><View style={{ height: 1, width: 60, backgroundColor: "#FF6200", marginTop: 4 }} /></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 22, fontWeight: "bold" }}>{toStation.station_code}</Text><Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop: 4 }}>{formatTime(selectedTrain.to_arr)}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Day " + (selectedTrain.to_day || 1)}</Text></View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12 }}>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Train No."}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.number}</Text></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Type"}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.type || "---"}</Text></View>
              <View style={{ alignItems: "center" }}><Text style={{ color: "#888", fontSize: 11 }}>{"Total Stations"}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{selectedTrain.to_stop}</Text></View>
            </View>
          </View>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#4CAF50", marginRight: 10 }} /><Text style={{ color: "white", fontSize: 14 }}>{fromStation.station_name}</Text></View>
            <View style={{ width: 2, height: 20, backgroundColor: "#4a90d9", marginLeft: 4, marginBottom: 8 }} />
            <View style={{ flexDirection: "row", alignItems: "center" }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6200", marginRight: 10 }} /><Text style={{ color: "white", fontSize: 14 }}>{toStation.station_name}</Text></View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => onGoToRoute(selectedTrain.number)} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, flex: 1, marginRight: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>{"🗺️"}</Text><Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 6 }}>{"Train Route"}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Saare stations"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onGoToLive(selectedTrain.number)} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 16, flex: 1, marginLeft: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>{"🚂"}</Text><Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 6 }}>{"Running Status"}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{"Abhi kahan hai"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
      <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => { if (showRoute) { setShowRoute(false); setScheduleData(null); setSearchQuery(""); setError(""); } else { onBack(); } }}>
          <Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🔎 Train Search"}</Text>
      </View>
      <View style={{ backgroundColor: "#111", padding: 16 }}>
        <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8, borderWidth: activeInput === "from" ? 1 : 0, borderColor: "#FF6200" }}>
          <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"FROM STATION"}</Text>
          <TextInput style={{ color: "white", fontSize: 15, paddingVertical: 8 }} placeholder="Station naam ya code (e.g. SLN)" placeholderTextColor="#555" value={fromQuery} onFocus={() => setActiveInput("from")} onChangeText={(t) => searchStations(t, "from")} onSubmitEditing={() => { Keyboard.dismiss(); if (fromStation && toStation) findTrains(); }} />
          {fromQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setFromQuery(""); setFromStation(null); setFromSuggestions([]); }} style={{ position: "absolute", right: 12, top: 20 }}>
              <Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {(fromSuggestions.length > 0 && activeInput === "from") ? (
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, marginBottom: 8, maxHeight: 200 }}>
            <ScrollView>{fromSuggestions.map((s, i) => (<TouchableOpacity key={i} onPress={() => selectStation(s, "from")} style={{ padding: 12, borderBottomWidth: i < fromSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}><View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}><Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text></View><Text style={{ color: "white", fontSize: 14 }}>{s.station_name}</Text></TouchableOpacity>))}</ScrollView>
          </View>
        ) : null}
        <TouchableOpacity onPress={swapStations} style={{ alignSelf: "flex-end", backgroundColor: "#333", padding: 8, borderRadius: 20, marginBottom: 8 }}><Text style={{ fontSize: 18, color: "white" }}>{"⇅"}</Text></TouchableOpacity>
        <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8, borderWidth: activeInput === "to" ? 1 : 0, borderColor: "#FF6200" }}>
          <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"TO STATION"}</Text>
          <TextInput style={{ color: "white", fontSize: 15, paddingVertical: 8 }} placeholder="Station naam ya code (e.g. ADI)" placeholderTextColor="#555" value={toQuery} onFocus={() => setActiveInput("to")} onChangeText={(t) => searchStations(t, "to")} onSubmitEditing={() => { Keyboard.dismiss(); if (fromStation && toStation) findTrains(); }} />
          {toQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setToQuery(""); setToStation(null); setToSuggestions([]); }} style={{ position: "absolute", right: 12, top: 20 }}>
              <Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {(toSuggestions.length > 0 && activeInput === "to") ? (
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 12, marginBottom: 8, maxHeight: 200 }}>
            <ScrollView>{toSuggestions.map((s, i) => (<TouchableOpacity key={i} onPress={() => selectStation(s, "to")} style={{ padding: 12, borderBottomWidth: i < toSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}><View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}><Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text></View><Text style={{ color: "white", fontSize: 14 }}>{s.station_name}</Text></TouchableOpacity>))}</ScrollView>
          </View>
        ) : null}
        <TouchableOpacity disabled style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 8, alignItems: "center", opacity: 0.5 }}>
  <Text style={{ color: "#888", fontSize: 11 }}>{"JOURNEY DATE"}</Text>
  <Text style={{ color: "white", fontSize: 15, marginTop: 4 }}>{journeyDate.toDateString()}</Text>
  <Text style={{ color: "#FF6200", fontSize: 10, marginTop: 4 }}>{"⚠️ Coming Soon"}</Text>
</TouchableOpacity>
{showDatePicker ? (
  <DateTimePicker value={journeyDate} mode="date" display="calendar" onChange={(event, date) => { setShowDatePicker(false); if (date) setJourneyDate(date); }} />
) : null}
        <TouchableOpacity onPress={findTrains} style={{ backgroundColor: fromStation && toStation ? "#FF6200" : "#555", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 }}>
          {searching ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"🔍 FIND TRAINS"}</Text>}
        </TouchableOpacity>
        {recentSearches.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{"🕐 Recent Searches"}</Text>
            {recentSearches.map((item, i) => (
              <TouchableOpacity key={i} onPress={async () => {
                const fs = { station_code: item.fromCode, station_name: item.fromName };
                const ts = { station_code: item.toCode, station_name: item.toName };
                setFromStation(fs); setFromQuery(item.fromName + " (" + item.fromCode + ")");
                setToStation(ts); setToQuery(item.toName + " (" + item.toCode + ")");
                setSearching(true); setTrains([]); setSearched(false); setSelectedTrain(null);
                try {
                  const db = await getDB(); if (!db) return;
                  const fromCodes = getRelatedStations(item.fromCode);
                  const toCodes = getRelatedStations(item.toCode);
                  const fromPlaceholders = fromCodes.map(() => "?").join(",");
                  const toPlaceholders = toCodes.map(() => "?").join(",");
                  const results = await db.getAllAsync(
                    `SELECT t.number, t.name, t.type, t.distance,
                     s1.stop_number as from_stop, s1.departure as from_dep, s1.day as from_day, s1.station_code as from_code,
                     s2.stop_number as to_stop, s2.arrival as to_arr, s2.day as to_day, s2.station_code as to_code
                     FROM trains t
                     JOIN stations s1 ON s1.train_number = t.number AND s1.station_code IN (${fromPlaceholders})
                     JOIN stations s2 ON s2.train_number = t.number AND s2.station_code IN (${toPlaceholders})
                     WHERE s1.stop_number < s2.stop_number
                     GROUP BY t.number ORDER BY s1.departure ASC LIMIT 50`,
                    [...fromCodes, ...toCodes]
                  );
                  setTrains(results || []);
                  onSaveState({ fromStation: fs, toStation: ts, fromQuery: item.fromName + " (" + item.fromCode + ")", toQuery: item.toName + " (" + item.toCode + ")", trains: results || [] });
                  setSearched(true);
                  setShowResults(true);
                } catch (e) { setSearched(true); }
                setSearching(false);
              }} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{item.fromCode + " → " + item.toCode}</Text>
                  <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{item.fromName + " → " + item.toName}</Text>
                </View>
                <Text style={{ color: "#FF6200", fontSize: 16 }}>{"→"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      {(searched && !searching && trains.length === 0) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>{"😕"}</Text>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" }}>{"Koi train nahi mili!"}</Text>
        </View>
      ) : null}
      {trains.length > 0 && !showResults ? (
        <FlatList data={trains} keyExtractor={(item, index) => item.number + "_" + index} contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={<Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{trains.length + " trains mili — " + (fromStation?.station_code || "") + " → " + (toStation?.station_code || "")}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedTrain(item)} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flex: 1 }}><Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold" }}>{item.number}</Text><Text style={{ color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 }} numberOfLines={1}>{item.name}</Text></View>
                {item.type ? (
                  <View style={{ backgroundColor: "#333", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: "#aaa", fontSize: 12 }}>{item.type}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{formatTime(item.from_dep)}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{fromStation.station_code}</Text></View>
                <View style={{ flex: 1, alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 12 }}>{getDuration(item.from_dep, item.to_arr, item.from_day, item.to_day)}</Text><View style={{ height: 1, width: "80%", backgroundColor: "#444", marginTop: 4 }} /></View>
                <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{formatTime(item.to_arr)}</Text><Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{toStation.station_code}</Text></View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : null}
      {(!searched && !searching) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>{"🚉"}</Text>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center" }}>{"Station se Station!"}</Text>
          <Text style={{ color: "#888", fontSize: 14, marginTop: 8, textAlign: "center" }}>{"From aur To station daalo\naur saari trains dekhein!"}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ============================================================
// LIVE TRAIN SCREEN - GPS BASED
// ============================================================
const LiveTrainScreen = ({ onBack }) => {
  // SEARCH STATE
  const [searchMode, setSearchMode] = useState("route");
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromStation, setFromStation] = useState(null);
  const [toStation, setToStation] = useState(null);
  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [trainList, setTrainList] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savedTrainList, setSavedTrainList] = useState([]);
  const [savedFromStation, setSavedFromStation] = useState(null);
  const [savedToStation, setSavedToStation] = useState(null);

  // SCREEN STATE
  const [currentView, setCurrentView] = useState("search");
  const [recentSearches, setRecentSearches] = useState([]);
const [recentRoutes, setRecentRoutes] = useState([]);

  // SELECTED TRAIN
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [allStations, setAllStations] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});

  // GPS STATE
  const [gpsGranted, setGpsGranted] = useState(false);
  const [showTrainPopup, setShowTrainPopup] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsSpeed, setGpsSpeed] = useState(0);
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const locationSub = useRef(null);

  // TRAIN POSITION
  const [currentSegment, setCurrentSegment] = useState(null);
  const [nearestStop, setNearestStop] = useState(null);
  const [crossedStations, setCrossedStations] = useState([]);
  const [showCrossPopup, setShowCrossPopup] = useState(false);
  const [crossedStationName, setCrossedStationName] = useState("");
  const [nextStationName, setNextStationName] = useState("");
  const trainPosition = useRef(new Animated.Value(0)).current;

  // ONLINE DATA
  const [liveApiData, setLiveApiData] = useState(null);
  const [nightMode, setNightMode] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const [smoothTrainLat, setSmoothTrainLat] = useState(null);
  const [smoothTrainLon, setSmoothTrainLon] = useState(null);
  const animTrainLat = useRef(null);
  const animTrainLon = useRef(null);
  const [trainProgress, setTrainProgress] = useState({ fromIdx: 0, toIdx: 1, progress: 0 });
  const mapRef = useRef(null);

  const scrollRef = useRef(null);
  const popupAnim = useRef(new Animated.Value(0)).current;
  const gpsBlinkAnim = useRef(new Animated.Value(1)).current;

  // DB READY
  useEffect(() => { getDB(); }, []);
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const s1 = await AsyncStorage.getItem("live_recent_searches");
        if (s1) setRecentSearches(JSON.parse(s1));
        const s2 = await AsyncStorage.getItem("live_route_searches");
        if (s2) setRecentRoutes(JSON.parse(s2));
      } catch (e) {}
    };
    loadRecent();
  }, []);
  // Recent searches load karo
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const saved = await AsyncStorage.getItem("live_recent_searches");
        if (saved) {
          const list = JSON.parse(saved);
          setRecentSearches(list);
          }
      } catch (e) {}
    };
    loadRecent();
  }, []);

  // CLEANUP
  useEffect(() => {
    return () => { stopGPS(); };
  }, []);

  // GPS BLINK
  useEffect(() => {
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(gpsBlinkAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(gpsBlinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, []);

  const bg = nightMode ? "#0a0a0a" : "#1a1a1a";
  const cardBg = nightMode ? "#111" : "#2a2a2a";
  const textColor = nightMode ? "#ccc" : "white";

  // ---- STATION SEARCH ----
  const searchStations = async (text, type) => {
    if (type === "from") { setFromQuery(text); setFromStation(null); }
    else { setToQuery(text); setToStation(null); }
    if (!text || text.trim().length < 2) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }
    try {
      const db = await getDB(); if (!db) return;
      const results = await db.getAllAsync(
        `SELECT DISTINCT station_code, station_name FROM stations WHERE station_code = ? OR UPPER(station_name) LIKE ? GROUP BY station_code ORDER BY CASE WHEN station_code = ? THEN 0 ELSE 1 END LIMIT 8`,
        [text.trim().toUpperCase(), "%" + text.trim().toUpperCase() + "%", text.trim().toUpperCase()]
      );
      if (type === "from") setFromSuggestions(results || []);
      else setToSuggestions(results || []);
    } catch (e) { }
  };

  const selectStation = (station, type) => {
    if (type === "from") { setFromStation(station); setFromQuery(station.station_name + " (" + station.station_code + ")"); setFromSuggestions([]); }
    else { setToStation(station); setToQuery(station.station_name + " (" + station.station_code + ")"); setToSuggestions([]); }
  };

  // ---- FIND TRAINS ----
  const findTrains = async () => {
    Keyboard.dismiss();
    if (!fromStation || !toStation) { alert("From aur To station daalo!"); return; }
    setSearching(true); setTrainList([]);
    try {
      const db = await getDB(); if (!db) { alert("Database load nahi hua!"); return; }
      const fromCodes = getRelatedStations(fromStation.station_code);
      const toCodes = getRelatedStations(toStation.station_code);
      const fromPlaceholders = fromCodes.map(() => "?").join(",");
      const toPlaceholders = toCodes.map(() => "?").join(",");
      const results = await db.getAllAsync(
        `SELECT t.number, t.name, t.type, s1.departure as from_dep, s1.day as from_day, s2.arrival as to_arr, s2.day as to_day, s1.stop_number as from_stop, s2.stop_number as to_stop
         FROM trains t
         JOIN stations s1 ON s1.train_number = t.number AND s1.station_code IN (${fromPlaceholders})
         JOIN stations s2 ON s2.train_number = t.number AND s2.station_code IN (${toPlaceholders})
         WHERE s1.stop_number < s2.stop_number
         GROUP BY t.number
         ORDER BY s1.departure ASC LIMIT 50`,
        [...fromCodes, ...toCodes]
      );
      setTrainList(results || []);
      setSavedTrainList(results || []);
      setSavedFromStation(fromStation);
      setSavedToStation(toStation);
      setCurrentView("trainlist");
      const routeSearch = { fromCode: fromStation.station_code, fromName: fromStation.station_name, toCode: toStation.station_code, toName: toStation.station_name };
      setRecentRoutes(prev => {
        const updated = [routeSearch, ...prev.filter(s => !(s.fromCode === routeSearch.fromCode && s.toCode === routeSearch.toCode))].slice(0, 5);
        AsyncStorage.setItem("live_route_searches", JSON.stringify(updated));
        return updated;
      });
    } catch (e) { }
    setSearching(false);
  };

  // ---- LOAD TRAIN STATIONS ----
  const loadTrainStations = async (trainNum) => {
    try {
      const db = await getDB(); if (!db) return;
      const train = await db.getFirstAsync("SELECT * FROM trains WHERE number = ?", [trainNum]);
      const stations = await db.getAllAsync("SELECT * FROM stations WHERE train_number = ? ORDER BY day ASC, stop_number ASC", [trainNum]);
      setSelectedTrain(train);
      setAllStations(stations || []);
      setCurrentView("live");
      fetchLiveApiData(trainNum);
      const newSearch = { trainNumber: trainNum, trainName: train?.name || trainNum, fromStn: train?.from_stn || "", toStn: train?.to_stn || "" };
      setRecentSearches(prev => {
        const updated = [newSearch, ...prev.filter(s => s.trainNumber !== trainNum)].slice(0, 5);
        AsyncStorage.setItem("live_recent_searches", JSON.stringify(updated));
        return updated;
      });
    } catch (e) { alert("Error: " + e.message); }
  };

  // ---- FETCH LIVE API DATA ----
  const fetchLiveApiData = async (trainNum) => {
    try {
      const response = await fetch("https://irctc-api2.p.rapidapi.com/liveTrain?trainNumber=" + trainNum + "&startDay=0", {
        headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-api2.p.rapidapi.com" }
      });
      const data = await response.json();
      if (data?.data) setLiveApiData(data.data);
    } catch (e) { }
  };

  // ---- GPS ----
  const requestGPS = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("GPS permission zaroori hai! Settings mein jaake allow karo.");
      return false;
    }
    setGpsGranted(true);
    startGPS();
    return true;
  };

  const startGPS = async () => {
    if (locationSub.current) return;
    const interval = batterySaver ? 10000 : 3000;
    const distance = batterySaver ? 20 : 5;
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: batterySaver ? Location.Accuracy.Balanced : Location.Accuracy.BestForNavigation, timeInterval: interval, distanceInterval: distance },
      (loc) => {
        const { latitude, longitude, speed } = loc.coords;
        setUserLat(latitude);
        setUserLon(longitude);
        setGpsSpeed(Math.round(Math.max(0, (speed || 0) * 3.6)));
        setGpsActive(true);
        updateTrainPosition(latitude, longitude);
      }
    );
  };

  const stopGPS = () => {
    if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; }
    setGpsActive(false);
    setGpsGranted(false);
    animTrainLat.current = null;
    animTrainLon.current = null;
  };

  // ---- TRAIN POSITION UPDATE ----
  const updateTrainPosition = (lat, lon) => {
    if (!allStations || allStations.length === 0) return;
    const stopsWithCoords = allStations.filter(s => s.latitude && s.longitude && parseFloat(s.latitude) !== 0 && parseFloat(s.longitude) !== 0);
    const haltStopsWithCoords = stopsWithCoords.filter(s => s.is_halt === 1);
    if (stopsWithCoords.length < 2) return;
    let minDist = 999999;
    let nearestIdx = 0;
    stopsWithCoords.forEach((stn, i) => {
      const d = getDistanceInMeters(lat, lon, stn.latitude, stn.longitude);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });
    const nearest = stopsWithCoords[nearestIdx];
    setNearestStop(nearest);

    // Next station find karo
    const nextIdx = nearestIdx + 1 < stopsWithCoords.length ? nearestIdx + 1 : nearestIdx;
    const nextStn = stopsWithCoords[nextIdx];

    // Progress calculate karo — 0 to 1 (current station se next station ke beech)
    let progress = 0;
    if (nextStn && nextStn.station_code !== nearest.station_code) {
      const totalDist = getDistanceInMeters(nearest.latitude, nearest.longitude, nextStn.latitude, nextStn.longitude);
      const distFromNearest = getDistanceInMeters(lat, lon, nearest.latitude, nearest.longitude);
      progress = totalDist > 0 ? Math.min(1, distFromNearest / totalDist) : 0;
    }
    // halt stations mein index dhundho
    // Nearest halt station dhundho — agar nearest non-stop hai to pichla halt lo
    let nearestHaltIdx = haltStopsWithCoords.findIndex(s => s.station_code === nearest.station_code);
    if (nearestHaltIdx === -1) {
      // Non-stop station hai — pichla halt station dhundho
      const nearestStopNum = nearest.stop_number;
      for (let i = haltStopsWithCoords.length - 1; i >= 0; i--) {
        if (haltStopsWithCoords[i].stop_number < nearestStopNum) {
          nearestHaltIdx = i;
          break;
        }
      }
    }
    if (nearestHaltIdx === -1) nearestHaltIdx = 0;
    const nextHalt = haltStopsWithCoords[nearestHaltIdx + 1];
    let haltProgress = 0;
    if (nextHalt) {
      const totalDist = getDistanceInMeters(nearest.latitude, nearest.longitude, nextHalt.latitude, nextHalt.longitude);
      const distFromNearest = getDistanceInMeters(lat, lon, nearest.latitude, nearest.longitude);
      haltProgress = totalDist > 0 ? Math.min(1, distFromNearest / totalDist) : 0;
    }
    setTrainProgress({ fromIdx: nearestHaltIdx, toIdx: nearestHaltIdx + 1, progress: haltProgress });

    if (minDist < 500 && nearest.is_halt === 1) {
      if (!crossedStations.includes(nearest.station_code)) {
        setCrossedStations(prev => [...prev, nearest.station_code]);
        setCrossedStationName(nearest.station_name);
        setNextStationName(nextStn?.station_name || "");
        showCrossedPopup();
      }
    }
    if (nextStn) {
      setNextStationName(nextStn.station_name);
    }
    if (nearestIdx < stopsWithCoords.length - 1) {
      setCurrentSegment({ prevStop: nearest, nextStop: nextStn, progress });
    }
    const key = nearest.station_code;
    setExpandedSections(prev => ({ ...prev, [key]: true }));

    // Smooth map position
    if (animTrainLat.current === null) {
      animTrainLat.current = lat;
      animTrainLon.current = lon;
      setSmoothTrainLat(lat);
      setSmoothTrainLon(lon);
    } else {
      animTrainLat.current = animTrainLat.current + 0.3 * (lat - animTrainLat.current);
      animTrainLon.current = animTrainLon.current + 0.3 * (lon - animTrainLon.current);
      setSmoothTrainLat(animTrainLat.current);
      setSmoothTrainLon(animTrainLon.current);
    }
  };
    
  // ---- POPUP ----
  const showCrossedPopup = () => {
    setShowCrossPopup(true);
    Animated.sequence([
      Animated.timing(popupAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(popupAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowCrossPopup(false));
  };

  // ---- WHATSAPP SHARE ----
  const shareOnWhatsApp = async () => {
    const trainName = selectedTrain?.name || "Train";
    const trainNum = selectedTrain?.number || "";
    const speed = gpsSpeed;
    const nearest = nearestStop?.station_name || "Unknown";
    const nextStn = nextStationName || "Unknown";
    const msg = `🚂 *Railayan - Live Train Status*\n\nTrain: ${trainName} (${trainNum})\n📍 Abhi: ${nearest}\n➡️ Next Station: ${nextStn}\n⚡ Speed: ${speed} km/h\n\n_Railayan App se track karo apni train!_`;
    await Share.share({ message: msg });
  };

  // ---- FORMAT TIME ----
  const formatTime = (t) => { if (!t || t === "None" || t === "NULL") return "---"; return t.substring(0, 5); };

  // ---- GET API DATA FOR STATION ----
  const getApiStation = (code) => {
    if (!liveApiData?.route) return null;
    return liveApiData.route.find(s => s.station_code === code);
  };

  // ---- RENDER SEARCH VIEW ----
  if (currentView === "search") {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={onBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>{"🚂 Live Train"}</Text>
        </View>

        <View style={{ flexDirection: "row", margin: 16, backgroundColor: cardBg, borderRadius: 12, padding: 4 }}>
          <TouchableOpacity onPress={() => setSearchMode("route")} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: searchMode === "route" ? "#FF6200" : "transparent", alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "bold" }}>{"🗺️ Route"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSearchMode("number")} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: searchMode === "number" ? "#FF6200" : "transparent", alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "bold" }}>{"🔢 Train No."}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {searchMode === "route" ? (
            <>
              <View style={{ backgroundColor: cardBg, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8 }}>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"FROM STATION"}</Text>
                <TextInput style={{ color: textColor, fontSize: 15, paddingVertical: 8 }} placeholder="Station naam ya code" placeholderTextColor="#555" value={fromQuery} onChangeText={(t) => searchStations(t, "from")} />
                {fromQuery.length > 0 ? <TouchableOpacity onPress={() => { setFromQuery(""); setFromStation(null); setFromSuggestions([]); }} style={{ position: "absolute", right: 12, top: 12 }}><Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text></TouchableOpacity> : null}
              </View>
              {fromSuggestions.length > 0 ? (
                <View style={{ backgroundColor: cardBg, borderRadius: 12, marginBottom: 8 }}>
                  {fromSuggestions.map((s, i) => (
                    <TouchableOpacity key={i} onPress={() => selectStation(s, "from")} style={{ padding: 12, borderBottomWidth: i < fromSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}>
                      <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}><Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text></View>
                      <Text style={{ color: textColor, fontSize: 14 }}>{s.station_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity onPress={() => { const tq = fromQuery; const ts = fromStation; setFromQuery(toQuery); setFromStation(toStation); setToQuery(tq); setToStation(ts); }} style={{ alignSelf: "flex-end", backgroundColor: "#333", padding: 8, borderRadius: 20, marginBottom: 8 }}>
                <Text style={{ fontSize: 18, color: "white" }}>{"⇅"}</Text>
              </TouchableOpacity>

              <View style={{ backgroundColor: cardBg, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 8 }}>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"TO STATION"}</Text>
                <TextInput style={{ color: textColor, fontSize: 15, paddingVertical: 8 }} placeholder="Station naam ya code" placeholderTextColor="#555" value={toQuery} onChangeText={(t) => searchStations(t, "to")} />
                {toQuery.length > 0 ? <TouchableOpacity onPress={() => { setToQuery(""); setToStation(null); setToSuggestions([]); }} style={{ position: "absolute", right: 12, top: 12 }}><Text style={{ color: "#888", fontSize: 18 }}>{"✕"}</Text></TouchableOpacity> : null}
              </View>
              {toSuggestions.length > 0 ? (
                <View style={{ backgroundColor: cardBg, borderRadius: 12, marginBottom: 8 }}>
                  {toSuggestions.map((s, i) => (
                    <TouchableOpacity key={i} onPress={() => selectStation(s, "to")} style={{ padding: 12, borderBottomWidth: i < toSuggestions.length - 1 ? 1 : 0, borderBottomColor: "#333", flexDirection: "row", alignItems: "center" }}>
                      <View style={{ backgroundColor: "#FF6200", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 }}><Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>{s.station_code}</Text></View>
                      <Text style={{ color: textColor, fontSize: 14 }}>{s.station_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity disabled style={{ backgroundColor: cardBg, borderRadius: 12, padding: 14, marginBottom: 12, alignItems: "center", opacity: 0.5 }}>
                <Text style={{ color: "#888", fontSize: 11 }}>{"JOURNEY DATE"}</Text>
                <Text style={{ color: textColor, fontSize: 15, marginTop: 4 }}>{journeyDate.toDateString()}</Text>
                <Text style={{ color: "#FF6200", fontSize: 10, marginTop: 4 }}>{"⚠️ Coming Soon"}</Text>
              </TouchableOpacity>
              {showDatePicker ? <DateTimePicker value={journeyDate} mode="date" display="calendar" onChange={(e, d) => { setShowDatePicker(false); if (d) setJourneyDate(d); }} /> : null}

              <TouchableOpacity onPress={findTrains} style={{ backgroundColor: "#FF6200", borderRadius: 12, padding: 16, alignItems: "center" }}>
                {searching ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"🔍 Search Trains"}</Text>}
              </TouchableOpacity>
              {recentRoutes.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{"🕐 Recent Routes"}</Text>
                  {recentRoutes.map((item, i) => (
                    <TouchableOpacity key={i} onPress={async () => {
                      const fs = { station_code: item.fromCode, station_name: item.fromName };
                      const ts = { station_code: item.toCode, station_name: item.toName };
                      setFromQuery(item.fromName + " (" + item.fromCode + ")");
                      setFromStation(fs);
                      setToQuery(item.toName + " (" + item.toCode + ")");
                      setToStation(ts);
                      setSearching(true); setTrainList([]);
                      try {
                        const db = await getDB(); if (!db) return;
                        const fromCodes = getRelatedStations(item.fromCode);
                        const toCodes = getRelatedStations(item.toCode);
                        const fromPlaceholders = fromCodes.map(() => "?").join(",");
                        const toPlaceholders = toCodes.map(() => "?").join(",");
                        const results = await db.getAllAsync(
                          `SELECT t.number, t.name, t.type, s1.departure as from_dep, s1.day as from_day, s2.arrival as to_arr, s2.day as to_day, s1.stop_number as from_stop, s2.stop_number as to_stop
                           FROM trains t
                           JOIN stations s1 ON s1.train_number = t.number AND s1.station_code IN (${fromPlaceholders})
                           JOIN stations s2 ON s2.train_number = t.number AND s2.station_code IN (${toPlaceholders})
                           WHERE s1.stop_number < s2.stop_number
                           GROUP BY t.number ORDER BY s1.departure ASC LIMIT 50`,
                          [...fromCodes, ...toCodes]
                        );
                        setTrainList(results || []);
                        setSavedTrainList(results || []);
                        setSavedFromStation(fs);
                        setSavedToStation(ts);
                        setCurrentView("trainlist");
                      } catch (e) {}
                      setSearching(false);
                    }} style={{ backgroundColor: cardBg, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{item.fromCode + " → " + item.toCode}</Text>
                        <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{item.fromName + " → " + item.toName}</Text>
                      </View>
                      <Text style={{ color: "#FF6200", fontSize: 16 }}>{"→"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={{ backgroundColor: cardBg, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 4, marginBottom: 12 }}>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 8 }}>{"TRAIN NUMBER"}</Text>
                <TextInput style={{ color: textColor, fontSize: 18, paddingVertical: 8, letterSpacing: 2 }} placeholder="e.g. 12476" placeholderTextColor="#555" keyboardType="numeric" maxLength={5} value={trainNumber} onChangeText={setTrainNumber} />
              </View>
              <TouchableOpacity onPress={() => { if (trainNumber.length >= 4) loadTrainStations(trainNumber); else alert("Sahi train number daalo!"); }} style={{ backgroundColor: "#FF6200", borderRadius: 12, padding: 16, alignItems: "center" }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{"🚂 TRAIN DHUNDO"}</Text>
              </TouchableOpacity>
              {recentSearches.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{"🕐 Recent Searches"}</Text>
                  {recentSearches.map((item, i) => (
                    <TouchableOpacity key={i} onPress={() => loadTrainStations(item.trainNumber)}
                      style={{ backgroundColor: cardBg, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold" }}>{item.trainNumber}</Text>
                        <Text style={{ color: textColor, fontSize: 14, fontWeight: "bold", marginTop: 2 }}>{item.trainName}</Text>
                        <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{item.fromStn + " → " + item.toStn}</Text>
                      </View>
                      <Text style={{ color: "#FF6200", fontSize: 20 }}>{"🚂"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---- RENDER TRAIN LIST ----
  if (currentView === "trainlist") {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { setCurrentView("search"); setTrainList(savedTrainList); setFromStation(savedFromStation); setToStation(savedToStation); }}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{"Trains: " + fromStation?.station_code + " → " + toStation?.station_code}</Text>
        </View>
        <FlatList data={trainList} keyExtractor={(item, index) => item.number + "_" + index}
          ListEmptyComponent={<View style={{ padding: 40, alignItems: "center" }}><Text style={{ color: textColor, fontSize: 16 }}>{"Koi train nahi mili!"}</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => loadTrainStations(item.number)} style={{ backgroundColor: cardBg, margin: 8, borderRadius: 12, padding: 14 }}>
              <Text style={{ color: "#FF6200", fontWeight: "bold" }}>{item.number}</Text>
              <Text style={{ color: textColor, fontSize: 15, fontWeight: "bold", marginTop: 2 }}>{item.name}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{formatTime(item.from_dep)}</Text>
                <Text style={{ color: "#FF6200" }}>{"🚂"}</Text>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>{formatTime(item.to_arr)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // ---- RENDER LIVE VIEW ----
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ backgroundColor: "#FF6200", padding: 16, paddingTop: 50 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { stopGPS(); setCurrentView("search"); }}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: "white" }} numberOfLines={1}>{selectedTrain?.number + " - " + selectedTrain?.name}</Text>
            <Text style={{ fontSize: 11, color: "white", opacity: 0.85 }}>{selectedTrain?.from_stn + " → " + selectedTrain?.to_stn}</Text>
          </View>
          <View style={{ backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 8, alignItems: "center", minWidth: 55 }}>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>{gpsSpeed}</Text>
            <Text style={{ color: "white", fontSize: 9 }}>{"km/h"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", marginTop: 8, justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 2 }}>
            <TouchableOpacity onPress={() => setViewMode("timeline")} style={{ backgroundColor: viewMode === "timeline" ? "white" : "transparent", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 18 }}>
              <Text style={{ color: viewMode === "timeline" ? "#FF6200" : "white", fontSize: 11, fontWeight: "bold" }}>{"📋 Timeline"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode("map")} style={{ backgroundColor: viewMode === "map" ? "white" : "transparent", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 18 }}>
              <Text style={{ color: viewMode === "map" ? "#FF6200" : "white", fontSize: 11, fontWeight: "bold" }}>{"🗺️ Map"}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={() => setNightMode(!nightMode)} style={{ backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 6 }}>
              <Text style={{ color: "white", fontSize: 11 }}>{nightMode ? "☀️ Day" : "🌙 Night"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setBatterySaver(!batterySaver); if (gpsActive) { stopGPS(); setTimeout(startGPS, 500); } }} style={{ backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "white", fontSize: 11 }}>{batterySaver ? "🔋 Saver ON" : "🔋 Saver OFF"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showTrainPopup ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 16, padding: 24, margin: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{"🚂"}</Text>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>{"Are you in Train?"}</Text>
            <Text style={{ color: "#888", fontSize: 13, textAlign: "center", marginBottom: 20 }}>{"Please turn on GPS for accurate Live Location!"}</Text>
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TouchableOpacity onPress={() => { setShowTrainPopup(false); requestGPS(); }} style={{ flex: 1, backgroundColor: "#FF6200", borderRadius: 12, padding: 14, alignItems: "center", marginRight: 8 }}>
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>{"✅ Yes"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTrainPopup(false)} style={{ flex: 1, backgroundColor: "#333", borderRadius: 12, padding: 14, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>{"❌ No"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {!gpsGranted ? (
        <View style={{ backgroundColor: "#b71c1c", padding: 16, alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{"🚨 Are you in Train?"}</Text>
          <Text style={{ color: "white", fontSize: 12, marginTop: 4, textAlign: "center" }}>{"Please turn on GPS for accurate Live Location!"}</Text>
          <Animated.View style={{ opacity: gpsBlinkAnim, marginTop: 10 }}>
            <TouchableOpacity onPress={requestGPS} style={{ backgroundColor: "white", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}>
              <Text style={{ color: "#b71c1c", fontWeight: "bold", fontSize: 15 }}>{"📍 Please On GPS"}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <View style={{ backgroundColor: gpsActive ? "#1b5e20" : "#333", padding: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: gpsActive ? "#4CAF50" : "#888", marginRight: 8 }} />
          <Text style={{ color: "white", fontSize: 12 }}>{gpsActive ? ("📍 GPS Active — " + (nearestStop ? ("Paas mein: " + nearestStop.station_name) : "Searching...")) : "GPS searching..."}</Text>
        </View>
      )}

      {liveApiData?.current_location_info?.[0]?.message ? (
        <View style={{ backgroundColor: "#1a237e", padding: 8, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 12 }}>{"🌐 " + liveApiData.current_location_info[0].message}</Text>
        </View>
      ) : null}

      {viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            source={{ html: `<!DOCTYPE html><html><head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
              <style>body,html,#map{margin:0;padding:0;height:100%;width:100%;}</style>
            </head><body><div id="map"></div><script>
              var stations = ${JSON.stringify(
                allStations
                  .filter(s => s.latitude && s.longitude && parseFloat(s.latitude) !== 0)
                  .map(s => ({
                    lat: parseFloat(s.latitude),
                    lon: parseFloat(s.longitude),
                    name: s.station_name,
                    code: s.station_code,
                    is_halt: s.is_halt,
                    crossed: crossedStations.includes(s.station_code),
                    nearest: nearestStop?.station_code === s.station_code
                  }))
              )};
              var trainLat = ${smoothTrainLat || 0};
              var trainLon = ${smoothTrainLon || 0};
              var centerLat = trainLat || (stations[0] ? stations[0].lat : 23.0);
              var centerLon = trainLon || (stations[0] ? stations[0].lon : 72.0);
              var map = L.map('map').setView([centerLat, centerLon], 8);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
              }).addTo(map);
              var trackCoords = stations.map(s => [s.lat, s.lon]);
              if(trackCoords.length > 1) {
                L.polyline(trackCoords, {color: '#4a90d9', weight: 3}).addTo(map);
              }
              var crossedCoords = stations.filter(s => s.crossed).map(s => [s.lat, s.lon]);
              if(crossedCoords.length > 1) {
                L.polyline(crossedCoords, {color: '#4CAF50', weight: 4}).addTo(map);
              }
              stations.filter(s => s.is_halt === 1).forEach(function(s) {
                var color = s.crossed ? '#4CAF50' : s.nearest ? '#FF6200' : '#4a90d9';
                var size = s.nearest ? 14 : 10;
                L.marker([s.lat, s.lon], {
                  icon: L.divIcon({
                    className: '',
                    html: '<div style="background:rgba(0,0,0,0.8);border:2px solid ' + color + ';border-radius:6px;padding:3px 6px;white-space:nowrap;"><span style="color:' + color + ';font-size:' + size + 'px;font-weight:bold;">' + s.name + '</span><br><span style="color:' + color + ';font-size:9px;">' + s.code + '</span></div>',
                    iconAnchor: [0, 0]
                  })
                }).addTo(map);
              });
              if(trainLat && trainLon) {
                L.marker([trainLat, trainLon], {
                  icon: L.divIcon({
                    className: '',
                    html: '<div style="background:#FF6200;border-radius:50%;padding:6px;border:3px solid white;font-size:20px;">🚂</div>',
                    iconAnchor: [20, 20]
                  })
                }).addTo(map);
              }
            </script></body></html>` }}
          />
          <View style={{ position: "absolute", bottom: 80, left: 16, right: 16, backgroundColor: "rgba(0,0,0,0.8)", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#888", fontSize: 10 }}>{"ABHI PAAS MEIN"}</Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 2 }}>{String(nearestStop?.station_name || "---")}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#888", fontSize: 10 }}>{"SPEED"}</Text>
              <Text style={{ color: "#FF6200", fontSize: 13, fontWeight: "bold", marginTop: 2 }}>{gpsSpeed + " km/h"}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#888", fontSize: 10 }}>{"NEXT STATION"}</Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "bold", marginTop: 2 }}>{String(nextStationName || "---")}</Text>
            </View>
          </View>
        </View>
      ) : (
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 80 }}>
        {(() => {
          const elements = [];
          let prevStopIdx = -1;
          allStations.forEach((stn, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === allStations.length - 1;
            const isStop = stn.is_halt === 1;
            const isNearest = nearestStop?.station_code === stn.station_code;
            const isCrossed = crossedStations.includes(stn.station_code);
            const apiStn = getApiStation(stn.station_code);
            if (isStop || isNearest) {
              if (prevStopIdx >= 0) {
                const nonStops = allStations.slice(prevStopIdx + 1, idx).filter(s => s.is_halt === 0);
                if (nonStops.length > 0) {
                  const prevStopCode = allStations[prevStopIdx].station_code;
                  const isExpanded = expandedSections[prevStopCode];
                  elements.push(
                    <TouchableOpacity key={"ns-" + idx + "-" + prevStopCode} onPress={() => setExpandedSections(prev => ({ ...prev, [prevStopCode]: !prev[prevStopCode] }))}
                      style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 4 }}>
                      <View style={{ width: 65 }} />
                      <View style={{ width: 32, alignItems: "center" }}>
                        <View style={{ width: 2, flex: 1, backgroundColor: "#4a90d9" }} />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <View style={{ backgroundColor: "#1a3a5c", borderRadius: 8, padding: 6 }}>
                          <Text style={{ color: "#4a90d9", fontSize: 12 }}>{(isExpanded ? "▲ " : "▼ ") + nonStops.length + " stations"}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                  if (isExpanded) {
                    nonStops.forEach((ns, ni) => {
                      elements.push(
                        <View key={"nsi-" + idx + "-" + ni + "-" + ns.station_code} style={{ flexDirection: "row", paddingHorizontal: 16, minHeight: 40 }}>
                          <View style={{ width: 65, alignItems: "flex-end", paddingRight: 10, paddingTop: 4 }}>
                            <Text style={{ color: "#555", fontSize: 11 }}>{formatTime(ns.arrival)}</Text>
                          </View>
                          <View style={{ alignItems: "center", width: 32 }}>
                            <View style={{ width: 2, flex: 1, backgroundColor: "#2a5a8a" }} />
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2a5a8a" }} />
                            <View style={{ width: 2, flex: 1, backgroundColor: "#2a5a8a" }} />
                          </View>
                          <View style={{ flex: 1, paddingLeft: 12, justifyContent: "center" }}>
                            <Text style={{ color: "#666", fontSize: 12 }}>{ns.station_name}</Text>
                            <Text style={{ color: "#444", fontSize: 10 }}>{"[" + ns.station_code + "]"}</Text>
                          </View>
                        </View>
                      );
                    });
                  }
                }
              }
              prevStopIdx = idx;
              elements.push(
                <View key={"stn-" + idx + "-" + stn.station_code} style={{ flexDirection: "row", paddingHorizontal: 16, minHeight: 72 }}>
                  <View style={{ width: 65, alignItems: "flex-end", paddingRight: 10, paddingTop: 8 }}>
                    <Text style={{ color: isFirst || isLast ? "#FF6200" : (isCrossed ? "#4CAF50" : "#bbb"), fontSize: 13, fontWeight: isFirst || isLast ? "bold" : "normal" }}>
                      {isFirst ? formatTime(stn.departure) : formatTime(stn.arrival)}
                    </Text>
                    {apiStn?.actual_arrival && apiStn.actual_arrival !== stn.arrival ? (
                      <Text style={{ color: "#FFC107", fontSize: 10, marginTop: 2 }}>{formatTime(apiStn.actual_arrival)}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "center", width: 32 }}>
                    {!isFirst ? <View style={{ width: 2, height: 16, backgroundColor: isCrossed ? "#4CAF50" : "#4a90d9" }} /> : <View style={{ height: 16 }} />}
                    {isNearest && gpsActive ? (
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 18 }}>{"🚂"}</Text>
                      </View>
                    ) : isFirst ? (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 14 }}>{"🚂"}</Text>
                      </View>
                    ) : isLast ? (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FF6200", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 14 }}>{"🏁"}</Text>
                      </View>
                    ) : (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isCrossed ? "#4CAF50" : "#4a90d9", borderWidth: 2, borderColor: bg }} />
                    )}
                    {!isLast ? (
                      <View style={{ position: "relative", width: 2, flex: 1, minHeight: 24, backgroundColor: isCrossed ? "#4CAF50" : "#4a90d9" }}>
                        {(() => {
                          if (!gpsActive) return null;
                          const stopsOnly = allStations.filter(s => s.is_halt === 1);
                          const thisStopIdx = stopsOnly.findIndex(s => s.station_code === stn.station_code);
                          if (thisStopIdx !== trainProgress.fromIdx) return null;
                          return (
                            <View style={{ position: "absolute", left: -10, top: trainProgress.progress * 20, zIndex: 10 }}>
                              <Text style={{ fontSize: 14 }}>{"🚂"}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12, paddingTop: 6, paddingBottom: 10 }}>
                    <Text style={{ color: isFirst || isLast ? "white" : (isNearest ? "#FF6200" : textColor), fontSize: isFirst || isLast ? 16 : 14, fontWeight: isFirst || isLast || isNearest ? "bold" : "normal" }}>
                      {stn.station_name}{isNearest && gpsActive ? " 📍" : ""}
                    </Text>
                    <Text style={{ color: "#555", fontSize: 11, marginTop: 1 }}>{"[" + stn.station_code + "]"}</Text>
                    {!isFirst && !isLast && stn.departure && stn.departure !== stn.arrival && stn.departure !== "None" ? (
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Dep: " + formatTime(stn.departure)}</Text>
                    ) : null}
                    {apiStn?.platform ? <Text style={{ color: "#FFC107", fontSize: 11, marginTop: 2 }}>{"PF: " + apiStn.platform}</Text> : null}
                    {isCrossed ? <Text style={{ color: "#4CAF50", fontSize: 11, marginTop: 2 }}>{"✅ Crossed"}</Text> : null}
                  </View>
                </View>
              );
            }
          });
          return elements;
        })()}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {showCrossPopup ? (
        <Animated.View style={{ position: "absolute", top: 180, left: 20, right: 20, backgroundColor: "#FF6200", borderRadius: 16, padding: 16, opacity: popupAnim, transform: [{ scale: popupAnim }] }}>
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, textAlign: "center" }}>{"🎉 " + crossedStationName + " crossed!"}</Text>
          <Text style={{ color: "white", fontSize: 13, textAlign: "center", marginTop: 4 }}>{"Next: " + nextStationName}</Text>
        </Animated.View>
      ) : null}

      <TouchableOpacity onPress={shareOnWhatsApp} style={{ position: "absolute", bottom: 20, right: 20, backgroundColor: "#25D366", borderRadius: 30, padding: 16, elevation: 8, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 20 }}>{"💬"}</Text>
        <Text style={{ color: "white", fontWeight: "bold", marginLeft: 6, fontSize: 13 }}>{"Share"}</Text>
      </TouchableOpacity>
    </View>
  );
};
// ============================================================
// MAIN HOME SCREEN
// ============================================================
export default function HomeScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState("home");
  const [navigationStack, setNavigationStack] = useState([]);
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

  const [liveGpsSpeed, setLiveGpsSpeed] = useState(0);
  const liveGpsSub = useRef(null);
  const [nearestStation, setNearestStation] = useState(null);

  useEffect(() => { setTimeout(() => setShowSplash(false), 2000); }, []);
  useEffect(() => {
    const blink = Animated.loop(Animated.sequence([Animated.timing(blinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }), Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true })]));
    blink.start(); return () => blink.stop();
  }, []);
  useEffect(() => { loadAndRefreshPNRs(); }, []);
  useEffect(() => {
    const onBackPress = () => { if (screen !== "home") { goBack(); return true; } return false; };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [screen, navigationStack]);

  const navigateTo = (nextScreen) => { if (!nextScreen || nextScreen === screen) return; setNavigationStack((prev) => [...prev, screen]); setScreen(nextScreen); };
  const goBack = () => { if (navigationStack.length === 0) { setScreen("home"); return; } const prevScreen = navigationStack[navigationStack.length - 1]; setNavigationStack((prev) => prev.slice(0, -1)); setScreen(prevScreen); };

  const loadAndRefreshPNRs = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) { const list = JSON.parse(saved); setPnrHistory(list); for (const item of list) await autoRefreshPNR(item.data.pnrNumber); }
    } catch (e) { console.log("Load error:", e); }
  };
  const savePNRs = async (list) => { try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { } };
  const autoRefreshPNR = async (pnrNum) => {
    try {
      const response = await fetch("https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/" + pnrNum, { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-indian-railway-pnr-status.p.rapidapi.com" } });
      const data = await response.json();
      if (data.success) {
        const journeyDate = parseDate(data.data.arrivalDate); const now = new Date();
        if (journeyDate && journeyDate < now) { setPnrHistory(prev => { const updated = prev.filter(p => p.data.pnrNumber !== pnrNum); savePNRs(updated); return updated; }); return; }
        setPnrHistory(prev => { const exists = prev.findIndex(p => p.data.pnrNumber === data.data.pnrNumber); let updated; if (exists >= 0) { updated = [...prev]; updated[exists] = data; } else updated = [...prev, data]; savePNRs(updated); return updated; });
      } else { setPnrHistory(prev => { const updated = prev.filter(p => p.data.pnrNumber !== pnrNum); savePNRs(updated); return updated; }); }
    } catch (e) { }
  };

  const getDateLabel = (offset) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(new Date().getTime() - offset * 86400000);
    return days[date.getDay()] + ", " + String(date.getDate()).padStart(2, "0") + "-" + months[date.getMonth()];
  };

  const checkLiveTrain = async () => {
    Keyboard.dismiss(); if (liveTrainNumber.length < 4) { alert("Sahi train number daalo!"); return; }
    setLiveLoading(true); setLiveTrainData(null);
    try {
      const response = await fetch("https://irctc-api2.p.rapidapi.com/liveTrain?trainNumber=" + liveTrainNumber + "&startDay=" + liveTrainDay, { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-api2.p.rapidapi.com" } });
      const data = await response.json(); setLiveTrainData(data);
    } catch (e) { alert("Error! Internet check karo!"); }
    setLiveLoading(false);
  };

  const startLiveGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { alert("GPS Permission Needed"); return; }
    liveGpsSub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 10 }, (loc) => {
      const { latitude, longitude, speed } = loc.coords;
      setLiveGpsSpeed(Math.round((speed || 0) * 3.6));
      if (liveTrainData?.data?.route) {
        let closest = null; let minD = 1000000;
        liveTrainData.data.route.forEach(st => {
          if (st.lat && st.lon) {
            const d = getDistanceInMeters(latitude, longitude, parseFloat(st.lat), parseFloat(st.lon));
            if (d < minD) { minD = d; closest = { ...st, dist: d }; }
          }
        });
        if (closest) setNearestStation(closest);
      }
    });
  };
  const stopLiveGps = () => { if (liveGpsSub.current) liveGpsSub.current.remove(); setLiveGpsSpeed(0); setNearestStation(null); };

  const getClassName = (code) => { const classes = { "SL": "Sleeper (SL)", "3A": "3rd AC (3A)", "2A": "2nd AC (2A)", "1A": "1st AC (1A)", "CC": "Chair Car (CC)", "EC": "Executive (EC)" }; return classes[code] || code; };
  const formatPnrBookingStatus = (passenger) => {
    if (!passenger) return "---"; const main = passenger.currentStatus || passenger.bookingStatus || "---"; let place = "";
    if (passenger.currentStatusDetails) place = passenger.currentStatusDetails.replace("-", "/");
    else if (passenger.currentCoachId && passenger.currentBerthNo) place = passenger.currentCoachId + "/" + passenger.currentBerthNo;
    return place ? `${main}/${place}` : main;
  };
  const parseDate = (str) => {
    if (!str) return null;
    try {
      const months = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };
      const parts = str.trim().split(" "); const mon = months[parts[0]]; const day = parseInt(parts[1]); const year = parseInt(parts[2]);
      const timeParts = parts[3].split(":"); let hour = parseInt(timeParts[0]); const min = parseInt(timeParts[1]); const ampm = parts[4];
      if (ampm === "PM" && hour !== 12) hour += 12; if (ampm === "AM" && hour === 12) hour = 0;
      return new Date(year, mon, day, hour, min);
    } catch (e) { return null; }
  };
  const formatDate = (str) => { const dt = parseDate(str); if (!dt) return "---"; const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return dt.getDate() + " " + months[dt.getMonth()] + " " + String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0"); };
  const formatDateShort = (str) => { const dt = parseDate(str); if (!dt) return "---"; const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; return days[dt.getDay()] + ", " + dt.getDate() + " " + months[dt.getMonth()]; };
  const getDuration = (depStr, arrStr) => { const dep = parseDate(depStr); const arr = parseDate(arrStr); if (!dep || !arr) return "---"; const diffMs = arr.getTime() - dep.getTime(); if (diffMs < 0) return "---"; return Math.floor(diffMs / (1000 * 60 * 60)) + "h " + Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)) + "m"; };

  const checkPNR = async (pnrNum?) => {
    Keyboard.dismiss(); const num = pnrNum || pnr; if (num.length !== 10) { alert("10 digit PNR number daalo!"); return; }
    setLoading(true);
    try {
      const response = await fetch("https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/" + num, { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "irctc-indian-railway-pnr-status.p.rapidapi.com" } });
      const data = await response.json();
      if (data.success) { setPnrHistory(prev => { const exists = prev.findIndex((p) => p.data.pnrNumber === data.data.pnrNumber); let updated; if (exists >= 0) { updated = [...prev]; updated[exists] = data; if (selectedPNR?.data?.pnrNumber === data.data.pnrNumber) setSelectedPNR(data); } else updated = [...prev, data]; savePNRs(updated); return updated; }); }
      else alert(data.message || "Error!");
    } catch (e) { alert("Error! Internet check karo!"); }
    setLoading(false);
  };

  const sharePNR = async (d) => {
    const passengers = d.passengerList.map((p) => { const isWL = p.currentStatus?.startsWith("WL"); const berth = isWL ? p.currentStatusDetails : p.currentCoachId + "-" + p.currentBerthNo; return "Passenger " + p.passengerSerialNumber + ": " + p.currentStatus + " | Berth: " + berth; }).join("\n");
    await Share.share({ message: "🚂 *Railayan - PNR Status*\n\nPNR: " + d.pnrNumber + "\nTrain: " + d.trainName + " (No. " + d.trainNumber + ")\nFrom: " + d.sourceStation + " → " + d.destinationStation + "\nDeparture: " + formatDate(d.dateOfJourney) + "\nArrival: " + formatDate(d.arrivalDate) + "\nDuration: " + getDuration(d.dateOfJourney, d.arrivalDate) + "\nClass: " + getClassName(d.journeyClass) + "\nChart: " + d.chartStatus + "\n\n*Passengers:*\n" + passengers + "\n\n_Railayan App download karo aur apni train track karo!_" });
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

  if (screen === "speedometer") return <SpeedometerScreen onBack={goBack} />;
  if (screen === "smallgames") return <SmallGamesScreen onBack={goBack} />;
  if (screen === "trainsearch") {
    return <TrainSearchScreen onBack={goBack}
      onGoToRoute={(num) => { setRouteTrainNumber(num); setRouteFrom("trainsearch"); navigateTo("route"); }}
      onGoToLive={(num) => { setLiveTrainNumber(num); setLiveFrom("trainsearch"); navigateTo("livetrain"); }}
      savedState={{ tsFromStation, tsToStation, tsFromQuery, tsToQuery, tsTrains }}
      onSaveState={(s) => { setTsFromStation(s.fromStation); setTsToStation(s.toStation); setTsFromQuery(s.fromQuery); setTsToQuery(s.toQuery); setTsTrains(s.trains); }}
    />;
  }
  if (screen === "route") return <RouteScreen onBack={() => { setRouteTrainNumber(""); goBack(); }} initialTrainNumber={""} />;
  if (screen === "livetrain") return <LiveTrainScreen onBack={goBack} />;
  if (screen === "pnrdetail" && selectedPNR) {
    const d = selectedPNR.data; const depDate = formatDate(d.dateOfJourney); const arrDate = formatDate(d.arrivalDate); const duration = getDuration(d.dateOfJourney, d.arrivalDate);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <View style={{ backgroundColor: "#FF6200", padding: 20, paddingTop: 50, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { setSelectedPNR(null); goBack(); }}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <View><Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>{d.trainName}</Text><Text style={{ fontSize: 12, color: "white", opacity: 0.8 }}>{"Train No. " + d.trainNumber}</Text></View>
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
            const berthText = formatPnrBookingStatus(p); const berthColor = isWL ? "#ff4444" : isRAC ? "#FFA500" : "#4CAF50"; const badgeColor = isWL ? "#b71c1c" : isRAC ? "#E65100" : "#1b5e20";
            return (
              <View key={i} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "white", fontSize: 15 }}>{"Passenger " + p.passengerSerialNumber}</Text>
                  <Text style={{ color: berthColor, fontSize: 13, marginTop: 3, fontWeight: "bold" }}>{"Berth: " + berthText}</Text>
                  <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Booking: " + p.bookingStatusDetails}</Text>
                </View>
                <View style={{ backgroundColor: badgeColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}><Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{p.currentStatus}</Text></View>
              </View>
            );
          })}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <TouchableOpacity onPress={() => checkPNR(d.pnrNumber)} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1, marginRight: 6 }}><Text style={{ color: "white", fontSize: 13 }}>{"🔄 Refresh"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setLiveTrainNumber(d.trainNumber); setLiveFrom("pnrdetail"); navigateTo("livetrain"); }} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1, marginRight: 6 }}><Text style={{ color: "white", fontSize: 13 }}>{"🚂 Running"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setRouteTrainNumber(d.trainNumber); setRouteFrom("pnrdetail"); navigateTo("route"); }} style={{ backgroundColor: "#2a2a2a", borderRadius: 12, padding: 14, alignItems: "center", flex: 1 }}><Text style={{ color: "white", fontSize: 13 }}>{"🗺️ Route"}</Text></TouchableOpacity>
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
          <TouchableOpacity onPress={goBack}><Text style={{ color: "white", fontSize: 18, marginRight: 15 }}>{"←"}</Text></TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>{"🔍 PNR Status"}</Text>
        </View>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", backgroundColor: "#2a2a2a", borderRadius: 12, alignItems: "center", paddingHorizontal: 15 }}>
            <TextInput style={{ flex: 1, color: "white", paddingVertical: 14, fontSize: 16, letterSpacing: 2 }} placeholder="10 digit PNR daalo" placeholderTextColor="#666" keyboardType="numeric" maxLength={10} value={pnr} onChangeText={setPnr} onSubmitEditing={() => checkPNR(pnr)} />
            <TouchableOpacity onPress={() => checkPNR(pnr)} style={{ backgroundColor: "#FF6200", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}><Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{loading ? "..." : "Search"}</Text></TouchableOpacity>
          </View>
          {pnrHistory.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>{pnrHistory.length + " PNR saved • Swipe karo →"}</Text>
              <FlatList ref={flatListRef} data={pnrHistory} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item, i) => i.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setSelectedPNR(item); navigateTo("pnrdetail"); }} style={{ width: 300, backgroundColor: "#2a2a2a", borderRadius: 16, padding: 16, marginRight: 12 }}>
                    <Animated.Text style={{ color: "#FF6200", fontSize: 16, fontWeight: "bold", opacity: blinkAnim }}>{item.data.trainName}</Animated.Text>
                    <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{"Train No. " + item.data.trainNumber + " • PNR: " + item.data.pnrNumber}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                      <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.data.sourceStation}</Text><Text style={{ color: "#aaa", fontSize: 11 }}>{formatDate(item.data.dateOfJourney)}</Text></View>
                      <View style={{ flex: 1, alignItems: "center" }}><Text style={{ color: "#FF6200", fontSize: 16 }}>{"🚂"}</Text><Text style={{ color: "#FF6200", fontSize: 11 }}>{getDuration(item.data.dateOfJourney, item.data.arrivalDate)}</Text></View>
                      <View style={{ alignItems: "center" }}><Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>{item.data.destinationStation}</Text><Text style={{ color: "#aaa", fontSize: 11 }}>{formatDate(item.data.arrivalDate)}</Text></View>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <View style={{ backgroundColor: item.data.passengerList?.[0]?.currentStatus?.startsWith("WL") ? "#b71c1c" : item.data.passengerList?.[0]?.currentStatus?.startsWith("RAC") ? "#E65100" : "#1b5e20", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>{formatPnrBookingStatus(item.data.passengerList?.[0])}</Text>
                      </View>
                      <Text style={{ color: "#888", fontSize: 12 }}>{getClassName(item.data.journeyClass)}</Text>
                      <Text style={{ color: "#FF6200", fontSize: 12 }}>{"Details →"}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}
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
          <TouchableOpacity onPress={() => navigateTo("pnr")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"🔍"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"PNR Status"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo("livetrain")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"🚂"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Live Train"}</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <TouchableOpacity onPress={() => navigateTo("trainsearch")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"🔎"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Train Search"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo("speedometer")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"⚡"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Speedometer"}</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <TouchableOpacity onPress={() => { setRouteTrainNumber(""); navigateTo("route"); }} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"🗺️"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Train Route"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo("smallgames")} style={{ backgroundColor: "#2a2a2a", width: "48%", padding: 20, borderRadius: 12, alignItems: "center" }}><Text style={{ fontSize: 30 }}>{"🎮"}</Text><Text style={{ color: "white", marginTop: 8, fontWeight: "bold" }}>{"Small Games"}</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}