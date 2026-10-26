import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useUykvuaState } from "./src/app/useUykvuaState";
import { coachingDay, createSleepForecast, handoffSummary, methodDescription } from "./src/domain/sleep";
import { CareEvent, SleepMethod } from "./src/domain/types";
import { Card, Pill, PrimaryButton, SectionTitle } from "./src/ui/components";
import { colors } from "./src/ui/theme";

type Tab = "today" | "timeline" | "coach" | "insights" | "family";
type LogMode = "feed" | "diaper" | "note" | null;

const tabs: { id: Tab; label: string; glyph: string }[] = [
  { id: "today", label: "Bugün", glyph: "⌂" },
  { id: "timeline", label: "Akış", glyph: "≋" },
  { id: "coach", label: "Uyku", glyph: "☾" },
  { id: "insights", label: "Özet", glyph: "⌁" },
  { id: "family", label: "Aile", glyph: "♧" }
];

function time(value?: string | Date) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function duration(event: CareEvent) {
  if (!event.endedAt) return "devam ediyor";
  const minutes = Math.round((new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 60_000);
  return `${minutes} dk`;
}

function eventTitle(event: CareEvent) {
  if (event.kind === "sleep") return `Uyku · ${duration(event)}`;
  if (event.kind === "feed") return event.amountMl ? `Biberon · ${event.amountMl} ml` : "Emzirme";
  if (event.kind === "diaper") return `Bez · ${{ wet: "ıslak", dirty: "kirli", both: "ıslak + kirli" }[event.diaperType ?? "wet"]}`;
  return event.note || "Not";
}

export default function App() {
  const app = useUykvuaState();
  const [tab, setTab] = useState<Tab>("today");
  const [logMode, setLogMode] = useState<LogMode>(null);
  const forecast = useMemo(() => createSleepForecast(app.state.baby, app.state.events), [app.state.baby, app.state.events]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>uykvua</Text>
            <Text style={styles.headerSub}>{app.state.baby.name} · bugün</Text>
          </View>
          <Pressable style={styles.avatar}><Text style={styles.avatarText}>D</Text></Pressable>
        </View>

        {tab === "today" && <TodayScreen app={app} forecast={forecast} openLog={setLogMode} />}
        {tab === "timeline" && <TimelineScreen events={app.state.events} onDelete={app.deleteEvent} />}
        {tab === "coach" && <CoachScreen app={app} />}
        {tab === "insights" && <InsightsScreen events={app.state.events} />}
        {tab === "family" && <FamilyScreen summary={handoffSummary(app.state)} />}

        <View style={styles.nav}>
          {tabs.map((item) => (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.navItem}>
              <Text style={[styles.navGlyph, tab === item.id && styles.navActive]}>{item.glyph}</Text>
              <Text style={[styles.navLabel, tab === item.id && styles.navActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <QuickLogModal mode={logMode} close={() => setLogMode(null)} add={app.addSimpleEvent} />
    </SafeAreaView>
  );
}

function TodayScreen({ app, forecast, openLog }: { app: ReturnType<typeof useUykvuaState>; forecast: ReturnType<typeof createSleepForecast>; openLog: (mode: LogMode) => void }) {
  const confidence = { low: "İlk tahmin", medium: "Kişiselleşiyor", high: "Kişisel ritim" }[forecast.confidence];
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset} showsVerticalScrollIndicator={false}>
      <Card tone="mint">
        <View style={styles.cardTopline}><Text style={styles.eyebrow}>SIRADAKİ UYKU</Text><Text style={styles.confidence}>{confidence}</Text></View>
        <Text style={styles.heroTime}>{forecast.available ? `${time(forecast.start)}–${time(forecast.end)}` : "Henüz hazır değil"}</Text>
        <Text style={styles.body}>{forecast.explanation}</Text>
        {forecast.awakeMinutes !== undefined ? <Text style={styles.awake}>{forecast.awakeMinutes} dakikadır uyanık</Text> : null}
      </Card>

      <SectionTitle title="Hızlı kayıt" />
      <View style={styles.quickRow}>
        <QuickAction glyph={app.runningSleep ? "■" : "☾"} label={app.runningSleep ? "Uyandı" : "Uyku"} onPress={app.toggleSleep} active={Boolean(app.runningSleep)} />
        <QuickAction glyph="◒" label="Beslenme" onPress={() => openLog("feed")} />
        <QuickAction glyph="◇" label="Bez" onPress={() => openLog("diaper")} />
        <QuickAction glyph="＋" label="Not" onPress={() => openLog("note")} />
      </View>

      <SectionTitle title="Bakım devri" action="Son 4 saat" />
      <Card tone="peach">
        <Text style={styles.cardTitle}>Herkes aynı sayfada</Text>
        <Text style={styles.body}>{handoffSummary(app.state)}</Text>
        <View style={styles.spacer12} />
        <PrimaryButton label="Özeti paylaş" quiet onPress={() => void Share.share({ message: `${app.state.baby.name} · ${handoffSummary(app.state)}` })} />
      </Card>

      <SectionTitle title="Son kayıtlar" action="Tümünü gör" />
      <Card>{app.state.events.slice(0, 4).map((event) => <EventRow key={event.id} event={event} />)}</Card>
      <Text style={styles.disclaimer}>Uykvua tıbbi tanı veya tedavi önermez. Endişeniz varsa sağlık uzmanınıza başvurun.</Text>
    </ScrollView>
  );
}

function TimelineScreen({ events, onDelete }: { events: CareEvent[]; onDelete: (id: string) => void }) {
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Günün akışı</Text>
      <Text style={styles.pageIntro}>Uyku, beslenme, bez ve notlar tek zaman çizelgesinde.</Text>
      <Card>{events.map((event) => <EventRow key={event.id} event={event} onDelete={() => onDelete(event.id)} />)}</Card>
    </ScrollView>
  );
}

function CoachScreen({ app }: { app: ReturnType<typeof useUykvuaState> }) {
  const plan = coachingDay(app.state.sleepPlan.day, app.state.sleepPlan.method);
  const methods: SleepMethod[] = ["responsive", "gradual", "camping"];
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Uyku planı</Text>
      <Text style={styles.pageIntro}>Katı kurallar değil; bebeğinizin sinyallerine göre ayarlanabilen 14 günlük nazik bir plan.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
        {methods.map((method) => <Pill key={method} label={methodDescription(method).name} active={app.state.sleepPlan.method === method} onPress={() => app.setMethod(method)} />)}
      </ScrollView>
      <Card tone="lavender">
        <Text style={styles.eyebrow}>{plan.title.toUpperCase()}</Text>
        <Text style={styles.heroSmall}>{plan.focus}</Text>
        <Text style={styles.body}>{methodDescription(app.state.sleepPlan.method).support}</Text>
      </Card>
      <SectionTitle title="Bugünün adımları" />
      <Card>
        {plan.tasks.map((task) => {
          const done = app.state.sleepPlan.completedToday.includes(task);
          return (
            <Pressable key={task} onPress={() => app.toggleTask(task)} style={styles.taskRow}>
              <View style={[styles.checkbox, done && styles.checkboxDone]}><Text style={styles.check}>{done ? "✓" : ""}</Text></View>
              <Text style={[styles.taskText, done && styles.taskTextDone]}>{task}</Text>
            </Pressable>
          );
        })}
      </Card>
      <SectionTitle title="Akşam rutini" action={`${app.state.sleepPlan.routine.reduce((sum, item) => sum + (item.enabled ? item.minutes : 0), 0)} dakika`} />
      <Card>{app.state.sleepPlan.routine.filter((item) => item.enabled).map((item, index) => <View key={item.id} style={styles.routineRow}><Text style={styles.routineNo}>{index + 1}</Text><Text style={styles.taskText}>{item.label}</Text><Text style={styles.muted}>{item.minutes} dk</Text></View>)}</Card>
      <Card tone="peach"><Text style={styles.cardTitle}>Sabah check-in</Text><Text style={styles.body}>{plan.checkIn}</Text></Card>
      <PrimaryButton label={app.state.sleepPlan.day >= 14 ? "Plan tamamlandı" : "Günü tamamla"} onPress={app.advancePlan} />
      <Text style={styles.disclaimer}>Yoğun ağlama, beslenme güçlüğü, solunum sorunu veya sağlık endişesinde planı durdurun ve sağlık uzmanınıza danışın.</Text>
    </ScrollView>
  );
}

function InsightsScreen({ events }: { events: CareEvent[] }) {
  const today = new Date().toDateString();
  const recent = events.filter((event) => new Date(event.startedAt).toDateString() === today);
  const sleeps = recent.filter((event) => event.kind === "sleep" && event.endedAt);
  const sleepMinutes = sleeps.reduce((sum, event) => sum + (new Date(event.endedAt!).getTime() - new Date(event.startedAt).getTime()) / 60_000, 0);
  const feeds = recent.filter((event) => event.kind === "feed");
  const diapers = recent.filter((event) => event.kind === "diaper");
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Günlük özet</Text><Text style={styles.pageIntro}>Rakamları yorumlamak için değil, değişimi fark etmek için.</Text>
      <View style={styles.statGrid}>
        <Stat value={`${Math.floor(sleepMinutes / 60)}s ${Math.round(sleepMinutes % 60)}d`} label="Toplam uyku" tone="mint" />
        <Stat value={`${feeds.length}`} label="Beslenme" tone="peach" />
        <Stat value={`${diapers.length}`} label="Bez" tone="lavender" />
        <Stat value={`${recent.length}`} label="Tüm kayıtlar" tone="white" />
      </View>
      <SectionTitle title="Doktor görüşmesi" />
      <Card><Text style={styles.cardTitle}>Kısa ve düzenli bir özet</Text><Text style={styles.body}>Uyku, beslenme ve bez kayıtlarını tarihleriyle hazırlayan PDF raporu sonraki sürümde eklenecek.</Text></Card>
    </ScrollView>
  );
}

function FamilyScreen({ summary }: { summary: string }) {
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Aile ve bakım</Text><Text style={styles.pageIntro}>Devir anında arama yapmak yerine tek, güncel özet paylaşın.</Text>
      <Card tone="mint"><Text style={styles.cardTitle}>Anne · yönetici</Text><Text style={styles.body}>Tüm kayıtları görebilir ve düzenleyebilir.</Text></Card>
      <Card><Text style={styles.cardTitle}>Baba · bakım veren</Text><Text style={styles.body}>Kayıt ekleyebilir ve ortak akışı görebilir.</Text></Card>
      <PrimaryButton label="Bakım özetini paylaş" onPress={() => void Share.share({ message: summary })} />
      <View style={styles.spacer12} />
      <PrimaryButton label="Bakım veren davet et" quiet onPress={() => Alert.alert("Yakında", "Güvenli davet bağlantıları bulut senkronizasyonuyla birlikte eklenecek.")} />
    </ScrollView>
  );
}

function QuickAction({ glyph, label, onPress, active }: { glyph: string; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.quick, active && styles.quickActive]}><Text style={styles.quickGlyph}>{glyph}</Text><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

function EventRow({ event, onDelete }: { event: CareEvent; onDelete?: () => void }) {
  return (
    <Pressable onLongPress={onDelete} style={styles.eventRow}>
      <View style={[styles.eventDot, { backgroundColor: event.kind === "sleep" ? colors.lavender : event.kind === "feed" ? colors.peach : colors.mint }]} />
      <View style={styles.flex}><Text style={styles.eventTitle}>{eventTitle(event)}</Text><Text style={styles.muted}>{event.caregiver}</Text></View>
      <Text style={styles.eventTime}>{time(event.startedAt)}</Text>
    </Pressable>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "white" | "mint" | "peach" | "lavender" }) {
  return <View style={styles.stat}><Card tone={tone}><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></Card></View>;
}

function QuickLogModal({ mode, close, add }: { mode: LogMode; close: () => void; add: ReturnType<typeof useUykvuaState>["addSimpleEvent"] }) {
  const [amount, setAmount] = useState("90");
  const [note, setNote] = useState("");
  if (!mode) return null;
  const save = (details: Partial<CareEvent>) => { add(mode, details); setNote(""); close(); };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.pageTitle}>{mode === "feed" ? "Beslenme kaydı" : mode === "diaper" ? "Bez kaydı" : "Bakım notu"}</Text>
        {mode === "feed" ? <><Text style={styles.inputLabel}>Miktar (ml)</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} /><View style={styles.choiceRow}><Pill label="Biberon" active onPress={() => save({ feedType: "bottle", amountMl: Number(amount) || 0 })} /><Pill label="Emzirme" onPress={() => save({ feedType: "breast" })} /><Pill label="Katı gıda" onPress={() => save({ feedType: "solid" })} /></View></> : null}
        {mode === "diaper" ? <View style={styles.choiceRow}><Pill label="Islak" active onPress={() => save({ diaperType: "wet" })} /><Pill label="Kirli" onPress={() => save({ diaperType: "dirty" })} /><Pill label="İkisi" onPress={() => save({ diaperType: "both" })} /></View> : null}
        {mode === "note" ? <><Text style={styles.inputLabel}>Not</Text><TextInput value={note} onChangeText={setNote} multiline placeholder="Bakımı devralan kişinin bilmesi gereken…" style={[styles.input, styles.noteInput]} /><PrimaryButton label="Notu kaydet" onPress={() => save({ note })} /></> : null}
        <View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: StatusBar.currentHeight ?? 0 },
  shell: { flex: 1, backgroundColor: colors.paper },
  header: { height: 72, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.ink, fontSize: 25, fontWeight: "800", letterSpacing: -1.2 },
  headerSub: { color: colors.inkSoft, fontSize: 12, marginTop: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.ink, fontWeight: "800" },
  content: { flex: 1 },
  contentInset: { paddingHorizontal: 18, paddingBottom: 110 },
  cardTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.sageDark, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  confidence: { color: colors.sageDark, fontSize: 11, fontWeight: "700", backgroundColor: "rgba(255,255,255,.5)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  heroTime: { color: colors.ink, fontSize: 38, fontWeight: "800", letterSpacing: -1.6, marginTop: 14, marginBottom: 8 },
  heroSmall: { color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -1, marginVertical: 10 },
  body: { color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
  awake: { color: colors.sageDark, fontSize: 13, fontWeight: "700", marginTop: 14 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  quick: { width: "23%", aspectRatio: 0.92, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  quickActive: { backgroundColor: colors.peachSoft },
  quickGlyph: { color: colors.sageDark, fontSize: 25, marginBottom: 8 },
  quickLabel: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  spacer12: { height: 12 },
  disclaimer: { color: colors.inkSoft, fontSize: 11, lineHeight: 17, textAlign: "center", paddingHorizontal: 16, marginVertical: 20 },
  pageTitle: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -1.2, marginTop: 10 },
  pageIntro: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 20 },
  pills: { marginBottom: 16, marginHorizontal: -1 },
  eventRow: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line },
  eventDot: { width: 11, height: 11, borderRadius: 6, marginRight: 12 },
  eventTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  eventTime: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  muted: { color: colors.inkSoft, fontSize: 12, marginTop: 3 },
  flex: { flex: 1 },
  taskRow: { flexDirection: "row", alignItems: "center", minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.line },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.sage, marginRight: 12, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  check: { color: "white", fontWeight: "800" },
  taskText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 },
  taskTextDone: { color: colors.inkSoft, textDecorationLine: "line-through" },
  routineRow: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  routineNo: { width: 28, color: colors.sageDark, fontSize: 12, fontWeight: "800" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  stat: { width: "50%", paddingHorizontal: 5 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.7 },
  nav: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, borderRadius: 24, backgroundColor: "#FFFFFFF2", flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderColor: colors.line },
  navItem: { alignItems: "center", justifyContent: "center", minWidth: 54 },
  navGlyph: { color: colors.inkSoft, fontSize: 20, fontWeight: "600" },
  navLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 4, fontWeight: "600" },
  navActive: { color: colors.sageDark, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(18,31,27,.34)" },
  sheet: { backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 4 },
  inputLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 15, color: colors.ink, fontSize: 17 },
  noteInput: { height: 100, paddingTop: 14, textAlignVertical: "top", marginBottom: 14 },
  choiceRow: { flexDirection: "row", marginTop: 16, flexWrap: "wrap" }
});
