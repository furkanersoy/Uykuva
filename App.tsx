import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useUykuvaState } from "./src/app/useUykuvaState";
import { coachingDay, createSleepCoachInsights, createSleepForecast, handoffSummary, methodDescription, SLEEP_READINESS_ITEMS, sleepProgramStage, weeklySleepTotals } from "./src/domain/sleep";
import { createDoctorSummary, createDoctorSummaryHtml } from "./src/domain/reports";
import { createDataExport } from "./src/domain/export";
import { isValidClock } from "./src/domain/time";
import { completedFeedMinutes, createFeedingForecast, nextBreastSide, todayFeedingTotals, TRACKED_ALLERGENS } from "./src/domain/feeding";
import { CareEvent, CareTask, Caregiver, SleepMethod } from "./src/domain/types";
import { cancelSleepReminders, requestNotificationPermission, scheduleCareTaskReminders, scheduleSleepReminder } from "./src/services/notifications";
import { Card, Pill, PrimaryButton, SectionTitle } from "./src/ui/components";
import { colors } from "./src/ui/theme";

type Tab = "today" | "timeline" | "coach" | "insights" | "family";
type LogMode = "feed" | "diaper" | "note" | "health" | "growth" | null;
type TaskMode = "vaccine" | "appointment" | null;

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
  if (event.kind === "feed") {
    if (event.feedType === "bottle") return `Biberon · ${event.amountMl ?? 0} ml`;
    if (event.feedType === "solid") return `Katı gıda · ${event.foods?.join(", ") || "öğün"}`;
    const side = { left: "sol", right: "sağ", both: "iki taraf" }[event.breastSide ?? "both"];
    const minutes = completedFeedMinutes(event);
    return `Emzirme · ${side}${minutes ? ` · ${minutes} dk` : " · sürüyor"}`;
  }
  if (event.kind === "diaper") return `Bez · ${{ wet: "ıslak", dirty: "kirli", both: "ıslak + kirli" }[event.diaperType ?? "wet"]}`;
  if (event.kind === "health") {
    if (event.healthType === "temperature") return `Ateş · ${event.temperatureC ?? "—"} °C`;
    if (event.healthType === "medicine") return `${event.medicineName || "İlaç"}${event.doseAsEntered ? ` · ${event.doseAsEntered}` : ""}`;
    return `Belirti · ${event.note || "not"}`;
  }
  if (event.kind === "growth") return `Ölçüm · ${event.weightG ? `${event.weightG} g` : ""}${event.lengthCm ? ` · ${event.lengthCm} cm` : ""}`;
  return event.note || "Not";
}

export default function App() {
  const app = useUykuvaState();
  const [clockNow, setClockNow] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>("today");
  const [logMode, setLogMode] = useState<LogMode>(null);
  const [taskMode, setTaskMode] = useState<TaskMode>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [caregiverOpen, setCaregiverOpen] = useState(false);
  const [sleepEditor, setSleepEditor] = useState<CareEvent | "new" | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const forecast = useMemo(() => createSleepForecast(app.state.baby, app.state.events, clockNow), [app.state.baby, app.state.events, clockNow]);
  const feedingForecast = useMemo(() => createFeedingForecast(app.state.events), [app.state.events]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    if (!app.state.preferences.notificationsEnabled) {
      void cancelSleepReminders();
      return;
    }
    void scheduleSleepReminder(
      app.state.baby.name,
      forecast,
      app.state.preferences.sleepReminderMinutes,
      app.state.preferences.quietStart,
      app.state.preferences.quietEnd
    );
  }, [app.hydrated, app.state.baby.name, app.state.onboardingComplete, app.state.preferences.notificationsEnabled, app.state.preferences.sleepReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd, forecast.start?.getTime(), forecast.end?.getTime()]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    void scheduleCareTaskReminders(
      app.state.careTasks,
      app.state.preferences.careTaskRemindersEnabled,
      app.state.preferences.careTaskReminderMinutes,
      app.state.preferences.quietStart,
      app.state.preferences.quietEnd
    );
  }, [app.hydrated, app.state.onboardingComplete, app.state.careTasks, app.state.preferences.careTaskRemindersEnabled, app.state.preferences.careTaskReminderMinutes, app.state.preferences.quietStart, app.state.preferences.quietEnd]);

  if (!app.hydrated) return <LoadingScreen />;
  if (!app.state.onboardingComplete) return <OnboardingScreen onComplete={app.completeOnboarding} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>uykuva</Text>
            <Text style={styles.headerSub}>{app.state.baby.name} · bugün</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Profili düzenle" onPress={() => setProfileOpen(true)} style={styles.avatar}><Text style={styles.avatarText}>{app.state.baby.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text></Pressable>
        </View>

        {tab === "today" && <TodayScreen app={app} forecast={forecast} feedingForecast={feedingForecast} openLog={setLogMode} now={clockNow} />}
        {tab === "timeline" && <TimelineScreen events={app.state.events} onDelete={app.deleteEvent} onEditSleep={(event) => setSleepEditor(event)} onAddSleep={() => setSleepEditor("new")} />}
        {tab === "coach" && <CoachScreen app={app} />}
        {tab === "insights" && <InsightsScreen app={app} openTask={setTaskMode} />}
        {tab === "family" && <FamilyScreen app={app} onEditProfile={() => setProfileOpen(true)} onAddCaregiver={() => setCaregiverOpen(true)} />}

        <View style={styles.nav}>
          {tabs.map((item) => (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.navItem}>
              <Text style={[styles.navGlyph, tab === item.id && styles.navActive]}>{item.glyph}</Text>
              <Text style={[styles.navLabel, tab === item.id && styles.navActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <QuickLogModal mode={logMode} close={() => setLogMode(null)} app={app} />
      <CareTaskModal mode={taskMode} close={() => setTaskMode(null)} add={app.addCareTask} />
      <ProfileModal visible={profileOpen} close={() => setProfileOpen(false)} app={app} />
      <CaregiverModal visible={caregiverOpen} close={() => setCaregiverOpen(false)} add={app.addCaregiver} />
      <SleepEntryModal event={sleepEditor === "new" ? null : sleepEditor} visible={sleepEditor !== null} close={() => setSleepEditor(null)} add={app.addEvent} update={app.updateEvent} bedtime={app.state.sleepPlan.bedtime} wakeTime={app.state.sleepPlan.wakeTime} />
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return <SafeAreaView style={[styles.safe, styles.center]}><ActivityIndicator color={colors.sageDark} /><Text style={styles.loadingText}>Uykuva hazırlanıyor…</Text></SafeAreaView>;
}

function OnboardingScreen({ onComplete }: { onComplete: ReturnType<typeof useUykuvaState>["completeOnboarding"] }) {
  const defaultBirth = new Date();
  defaultBirth.setDate(defaultBirth.getDate() - 120);
  const [step, setStep] = useState<"welcome" | "profile">("welcome");
  const [babyName, setBabyName] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [birthDate, setBirthDate] = useState(defaultBirth.toISOString().slice(0, 10));
  const [gestationalWeek, setGestationalWeek] = useState("40");

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.onboarding}>
        <View style={styles.onboardingMark}><Text style={styles.onboardingMoon}>☾</Text></View>
        <Text style={styles.onboardingBrand}>uykuva</Text>
        <Text style={styles.onboardingTitle}>Bebeğinizin ritmi, herkesin elinde.</Text>
        <Text style={styles.onboardingBody}>Uyku, beslenme ve günlük bakım kayıtlarını sakin bir akışta tutun. Tüm özellikler ücretsiz.</Text>
        <View style={styles.onboardingBottom}><PrimaryButton label="Başlayalım" onPress={() => setStep("profile")} /><Text style={styles.privacyLine}>Verileriniz şimdilik yalnızca bu cihazda saklanır.</Text></View>
      </SafeAreaView>
    );
  }

  const submit = () => {
    const week = Number(gestationalWeek);
    const birth = new Date(`${birthDate}T12:00:00`);
    if (!babyName.trim() || !caregiverName.trim()) return Alert.alert("Eksik bilgi", "Bebek ve bakım veren adını yazın.");
    if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) return Alert.alert("Tarihi kontrol edin", "Doğum tarihini YYYY-AA-GG biçiminde ve geçmiş bir tarih olarak yazın.");
    if (!Number.isInteger(week) || week < 22 || week > 42) return Alert.alert("Haftayı kontrol edin", "Gebelik haftası 22–42 arasında olmalı.");
    onComplete({ babyName, caregiverName, birthDate, gestationalWeek: week });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>İLK KURULUM</Text><Text style={styles.pageTitle}>Sizi tanıyalım</Text>
        <Text style={styles.pageIntro}>Bu bilgiler yaşa uygun uyku aralıklarını hesaplamak ve kayıtları kimin eklediğini göstermek için kullanılır.</Text>
        <Field label="Bebeğin adı" value={babyName} onChangeText={setBabyName} placeholder="Örn. Deniz" />
        <Field label="Doğum tarihi" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-AA-GG" keyboardType="numbers-and-punctuation" />
        <Field label="Doğduğu gebelik haftası" value={gestationalWeek} onChangeText={setGestationalWeek} placeholder="40" keyboardType="number-pad" />
        <Field label="Bakım veren adı veya rolü" value={caregiverName} onChangeText={setCaregiverName} placeholder="Örn. Anne, Baba, Ece" />
        <Card tone="peach"><Text style={styles.cardTitle}>Önemli sınır</Text><Text style={styles.body}>Uykuva kayıt ve genel rutin desteği sunar; tıbbi tanı veya tedavi sağlamaz. Sağlık endişesinde uzmanınıza danışın.</Text></Card>
        <PrimaryButton label="Profili oluştur" onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#93A09C" /></View>;
}

function TodayScreen({ app, forecast, feedingForecast, openLog, now }: { app: ReturnType<typeof useUykuvaState>; forecast: ReturnType<typeof createSleepForecast>; feedingForecast: ReturnType<typeof createFeedingForecast>; openLog: (mode: LogMode) => void; now: Date }) {
  const confidence = { low: "İlk tahmin", medium: "Kişiselleşiyor", high: "Kişisel ritim" }[forecast.confidence];
  const sleepElapsed = app.runningSleep ? Math.max(0, Math.floor((now.getTime() - new Date(app.runningSleep.startedAt).getTime()) / 60_000)) : 0;
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset} showsVerticalScrollIndicator={false}>
      <Card tone="mint">
        <View style={styles.cardTopline}><Text style={styles.eyebrow}>{app.runningSleep ? "UYKU DEVAM EDİYOR" : "SIRADAKİ UYKU"}</Text><Text style={styles.confidence}>{app.runningSleep ? "Canlı süre" : confidence}</Text></View>
        <Text style={styles.heroTime}>{app.runningSleep ? `${Math.floor(sleepElapsed / 60) ? `${Math.floor(sleepElapsed / 60)} sa ` : ""}${sleepElapsed % 60} dk` : forecast.available ? `${time(forecast.start)}–${time(forecast.end)}` : "Henüz hazır değil"}</Text>
        <Text style={styles.body}>{app.runningSleep ? `Uyku ${time(app.runningSleep.startedAt)} saatinde başladı. Bitirmek için aşağıdaki “Uyandı” kaydını kullanın.` : forecast.explanation}</Text>
        {!app.runningSleep && forecast.awakeMinutes !== undefined ? <Text style={styles.awake}>{forecast.awakeMinutes} dakikadır uyanık</Text> : null}
      </Card>
      <Card>
        <View style={styles.cardTopline}><Text style={styles.eyebrow}>SIRADAKİ BESLENME</Text><Text style={styles.confidence}>{feedingForecast.confidence === "high" ? "Kişisel ritim" : "Kayıtlardan"}</Text></View>
        <Text style={styles.feedForecast}>{feedingForecast.available ? `${time(feedingForecast.start)}–${time(feedingForecast.end)}` : "Ritim öğreniliyor"}</Text>
        <Text style={styles.body}>{feedingForecast.explanation}</Text>
      </Card>

      <SectionTitle title="Hızlı kayıt" />
      <View style={styles.quickRow}>
        <QuickAction glyph={app.runningSleep ? "■" : "☾"} label={app.runningSleep ? "Uyandı" : "Uyku"} onPress={app.toggleSleep} active={Boolean(app.runningSleep)} />
        <QuickAction glyph="◒" label={app.runningFeed ? "Emzirme sürüyor" : "Beslenme"} onPress={() => openLog("feed")} active={Boolean(app.runningFeed)} />
        <QuickAction glyph="◇" label="Bez" onPress={() => openLog("diaper")} />
        <QuickAction glyph="＋" label="Sağlık" onPress={() => openLog("health")} />
        <QuickAction glyph="↗" label="Büyüme" onPress={() => openLog("growth")} />
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
      <Text style={styles.disclaimer}>Uykuva tıbbi tanı veya tedavi önermez. Endişeniz varsa sağlık uzmanınıza başvurun.</Text>
    </ScrollView>
  );
}

function TimelineScreen({ events, onDelete, onEditSleep, onAddSleep }: { events: CareEvent[]; onDelete: (id: string) => void; onEditSleep: (event: CareEvent) => void; onAddSleep: () => void }) {
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Günün akışı</Text>
      <Text style={styles.pageIntro}>Uyku kaydına dokunarak saatleri düzeltin; silmek için basılı tutun.</Text>
      <PrimaryButton label="Geçmiş uyku ekle" quiet onPress={onAddSleep} />
      <View style={styles.spacer12} />
      <Card>{events.map((event) => <EventRow key={event.id} event={event} onPress={event.kind === "sleep" ? () => onEditSleep(event) : undefined} onDelete={() => onDelete(event.id)} />)}</Card>
    </ScrollView>
  );
}

function CoachScreen({ app }: { app: ReturnType<typeof useUykuvaState> }) {
  const stage = sleepProgramStage(app.state.baby);
  const readyItems = app.state.sleepPlan.readinessCompleted;
  const trainingReady = stage.canReduceSupport && SLEEP_READINESS_ITEMS.every((item) => readyItems.includes(item));
  const coachingMethod = trainingReady ? app.state.sleepPlan.method : "responsive";
  const plan = coachingDay(app.state.sleepPlan.day, coachingMethod, trainingReady);
  const insights = createSleepCoachInsights(app.state.events, app.state.sleepPlan.bedtime, app.state.sleepPlan.checkIns);
  const methods: SleepMethod[] = trainingReady ? ["responsive", "gradual", "camping"] : ["responsive"];
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckIn = app.state.sleepPlan.checkIns.find((item) => item.date === today);
  const [bedtime, setBedtime] = useState(app.state.sleepPlan.bedtime);
  const [wakeTime, setWakeTime] = useState(app.state.sleepPlan.wakeTime);
  const [routineLabel, setRoutineLabel] = useState("");
  const [routineMinutes, setRoutineMinutes] = useState("5");
  const saveSchedule = () => {
    if (!isValidClock(bedtime) || !isValidClock(wakeTime)) return Alert.alert("Saatleri kontrol edin", "Saatleri 20:00 gibi SS:DD biçiminde yazın.");
    app.updateSleepSchedule(bedtime, wakeTime);
  };
  const addRoutine = () => {
    const minutes = Number(routineMinutes);
    if (!routineLabel.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > 60) return Alert.alert("Adımı kontrol edin", "Bir ad ve 1–60 dakika arasında süre yazın.");
    app.addRoutineStep(routineLabel, minutes); setRoutineLabel(""); setRoutineMinutes("5");
  };
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Uyku planı</Text>
      <Text style={styles.pageIntro}>Katı kurallar değil; bebeğinizin sinyallerine göre ayarlanabilen 14 günlük nazik bir plan.</Text>
      <Card tone="mint"><Text style={styles.eyebrow}>YAŞA UYGUN AŞAMA</Text><Text style={styles.heroSmall}>{stage.label}</Text><Text style={styles.body}>{stage.guidance}</Text></Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
        {methods.map((method) => <Pill key={method} label={methodDescription(method).name} active={coachingMethod === method} onPress={() => app.setMethod(method)} />)}
      </ScrollView>
      {!trainingReady ? <Text style={styles.readinessNote}>{stage.canReduceSupport ? "Kademeli yaklaşım seçenekleri dört hazırlık maddesi tamamlandığında açılır. O zamana kadar duyarlı rutin gösterilir." : stage.guidance}</Text> : null}
      <Card tone="lavender">
        <Text style={styles.eyebrow}>{plan.title.toUpperCase()}</Text>
        <Text style={styles.heroSmall}>{plan.focus}</Text>
        <Text style={styles.body}>{methodDescription(app.state.sleepPlan.method).support}</Text>
      </Card>
      <SectionTitle title="Kayıtlardan öneri" action={`${insights.nightsUsed} gece`} />
      <Card>
        <View style={styles.measureRow}><Measure value={insights.actualBedtime ?? "—"} label="Gerçek medyan" /><Measure value={insights.targetBedtime} label="Hedef" /><Measure value={insights.suggestedBedtime} label="Bu gece" /></View>
        <Text style={styles.body}>{insights.nightsUsed ? insights.adjustmentMinutes === 0 ? "Kayıtlı yatış saati hedefle uyumlu görünüyor." : `Hedefe doğru bu gece yalnızca ${Math.abs(insights.adjustmentMinutes)} dakikalık küçük bir değişim öneriliyor.` : "En az bir uzun gece uykusu kaydedildiğinde hedefle karşılaştırma yapılacak."}</Text>
        {insights.checkInAverage ? <Text style={styles.awake}>Son check-in ortalaması: {insights.checkInAverage.toFixed(1)}/5</Text> : null}
        {insights.nightWakingsAverage !== undefined ? <Text style={styles.awake}>Son değerlendirmelerde gece uyanma ortalaması: {insights.nightWakingsAverage.toFixed(1)}</Text> : null}
      </Card>
      <SectionTitle title="Başlamadan önce" action={`${app.state.sleepPlan.readinessCompleted.length}/${SLEEP_READINESS_ITEMS.length}`} />
      <Card>
        {SLEEP_READINESS_ITEMS.map((item) => {
          const done = app.state.sleepPlan.readinessCompleted.includes(item);
          return <Pressable key={item} onPress={() => app.toggleReadiness(item)} style={styles.taskRow}><View style={[styles.checkbox, done && styles.checkboxDone]}><Text style={styles.check}>{done ? "✓" : ""}</Text></View><Text style={styles.taskText}>{item}</Text></Pressable>;
        })}
        {!stage.canReduceSupport ? <Text style={styles.readinessNote}>Bu yaş aşamasında tüm maddeler tamamlansa bile desteği azaltma hedefi yoktur; rutin ve duyarlı bakım önceliklidir.</Text> : null}
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
      <Card>
        {app.state.sleepPlan.routine.map((item, index) => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.enabled }} onPress={() => app.toggleRoutineStep(item.id)} onLongPress={() => app.deleteRoutineStep(item.id)} key={item.id} style={[styles.routineRow, !item.enabled && styles.routineDisabled]}><View style={[styles.miniCheck, item.enabled && styles.checkboxDone]}><Text style={styles.check}>{item.enabled ? "✓" : ""}</Text></View><Text style={styles.routineNo}>{index + 1}</Text><Text style={styles.taskText}>{item.label}</Text><Text style={styles.muted}>{item.minutes} dk</Text></Pressable>)}
        <Text style={styles.inputLabel}>Yeni rutin adımı</Text><TextInput value={routineLabel} onChangeText={setRoutineLabel} style={styles.input} placeholder="Örn. pijamaları giy" placeholderTextColor="#93A09C" /><View style={styles.inlineForm}><TextInput value={routineMinutes} onChangeText={setRoutineMinutes} style={[styles.compactInput, styles.minutesInput]} keyboardType="number-pad" /><Text style={styles.body}>dakika</Text><View style={styles.flex}><PrimaryButton label="Adım ekle" quiet onPress={addRoutine} /></View></View>
        <Text style={styles.hint}>Bir adımı kapatmak için dokunun, silmek için basılı tutun.</Text>
      </Card>
      <SectionTitle title="Hedef saatler" />
      <Card><View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Yatış</Text><TextInput value={bedtime} onChangeText={setBedtime} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View><View style={styles.timeField}><Text style={styles.muted}>Sabah</Text><TextInput value={wakeTime} onChangeText={setWakeTime} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View></View><View style={styles.spacer12} /><PrimaryButton label="Hedef saatleri kaydet" quiet onPress={saveSchedule} /></Card>
      <Card tone="peach">
        <Text style={styles.cardTitle}>Sabah check-in</Text><Text style={styles.body}>{plan.checkIn}</Text>
        <Text style={styles.inputLabel}>Uykuya geçişin kolaylığı</Text>
        <View style={styles.easeRow}>{([1, 2, 3, 4, 5] as const).map((ease) => <Pressable accessibilityRole="button" accessibilityLabel={`Kolaylık ${ease}/5`} key={ease} onPress={() => app.saveCheckIn({ ...todayCheckIn, date: today, ease })} style={[styles.easeButton, todayCheckIn?.ease === ease && styles.easeButtonActive]}><Text style={[styles.easeText, todayCheckIn?.ease === ease && styles.easeTextActive]}>{ease}</Text></Pressable>)}</View>
        <Text style={styles.easeLabels}><Text>Zordu</Text><Text>                                      Kolaydı</Text></Text>
        <Text style={styles.inputLabel}>Gece uyanma sayısı</Text>
        <View style={styles.easeRow}>{([0, 1, 2, 3, 4, 5] as const).map((count) => <Pressable accessibilityRole="button" accessibilityLabel={count === 5 ? "5 veya daha fazla uyanma" : `${count} gece uyanması`} key={count} onPress={() => app.saveCheckIn({ ...todayCheckIn, date: today, nightWakings: count })} style={[styles.easeButton, todayCheckIn?.nightWakings === count && styles.easeButtonActive]}><Text style={[styles.easeText, todayCheckIn?.nightWakings === count && styles.easeTextActive]}>{count === 5 ? "5+" : count}</Text></Pressable>)}</View>
        <Text style={styles.hint}>Uyanma sayısı isteğe bağlıdır; son yedi değerlendirmenin ortalaması koçluk özetinde görünür.</Text>
      </Card>
      <PrimaryButton label={app.state.sleepPlan.day >= 14 ? "Plan tamamlandı" : "Günü tamamla"} onPress={app.advancePlan} />
      <Text style={styles.disclaimer}>Yoğun ağlama, beslenme güçlüğü, solunum sorunu veya sağlık endişesinde planı durdurun ve sağlık uzmanınıza danışın.</Text>
    </ScrollView>
  );
}

async function shareDoctorPdf(state: ReturnType<typeof useUykuvaState>["state"]) {
  try {
    const file = await Print.printToFileAsync({ html: createDoctorSummaryHtml(state), base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return Alert.alert("Paylaşım kullanılamıyor", "PDF hazırlandı ancak bu cihazda paylaşım menüsü açılamadı.");
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Uykuva doktor özetini paylaş" });
  } catch {
    Alert.alert("PDF oluşturulamadı", "Doktor özeti PDF olarak hazırlanırken bir sorun oluştu. Metin özeti paylaşımını kullanabilirsiniz.");
  }
}

function InsightsScreen({ app, openTask }: { app: ReturnType<typeof useUykuvaState>; openTask: (mode: TaskMode) => void }) {
  const state = app.state;
  const events = state.events;
  const today = new Date().toDateString();
  const recent = events.filter((event) => new Date(event.startedAt).toDateString() === today);
  const sleeps = recent.filter((event) => event.kind === "sleep" && event.endedAt);
  const sleepMinutes = sleeps.reduce((sum, event) => sum + (new Date(event.endedAt!).getTime() - new Date(event.startedAt).getTime()) / 60_000, 0);
  const feeds = recent.filter((event) => event.kind === "feed");
  const feedingTotals = todayFeedingTotals(events);
  const diapers = recent.filter((event) => event.kind === "diaper");
  const health = recent.filter((event) => event.kind === "health");
  const weeklySleep = weeklySleepTotals(events);
  const maxDailySleep = Math.max(0, ...weeklySleep.map((day) => day.totalMinutes));
  const recordedSleepDays = weeklySleep.filter((day) => day.sleepCount > 0);
  const averageWeeklySleep = recordedSleepDays.length ? Math.round(recordedSleepDays.reduce((sum, day) => sum + day.totalMinutes, 0) / recordedSleepDays.length) : 0;
  const latestGrowth = events.find((event) => event.kind === "growth");
  const upcoming = [...state.careTasks].filter((task) => !task.completedAt).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Günlük özet</Text><Text style={styles.pageIntro}>Rakamları yorumlamak için değil, değişimi fark etmek için.</Text>
      <View style={styles.statGrid}>
        <Stat value={`${Math.floor(sleepMinutes / 60)}s ${Math.round(sleepMinutes % 60)}d`} label="Toplam uyku" tone="mint" />
        <Stat value={`${feeds.length}`} label="Beslenme" tone="peach" />
        <Stat value={`${diapers.length}`} label="Bez" tone="lavender" />
        <Stat value={`${health.length}`} label="Sağlık kaydı" tone="white" />
      </View>
      <SectionTitle title="Son 7 gün · uyku süreleri" action={recordedSleepDays.length ? `Kayıtlı gün ort. ${Math.floor(averageWeeklySleep / 60)} sa ${averageWeeklySleep % 60} dk` : "Kayıt yok"} />
      <Card>
        {maxDailySleep ? <View style={styles.weeklyChart}>{weeklySleep.map((day) => {
          const hours = Math.floor(day.totalMinutes / 60);
          const minutes = day.totalMinutes % 60;
          return <View key={day.date} style={styles.weeklyColumn} accessibilityLabel={day.sleepCount ? `${day.label}: ${hours} saat ${minutes} dakika uyku, ${day.sleepCount} dönem` : `${day.label}: uyku kaydı yok`}><View style={styles.weeklyTrack}><View style={[styles.weeklyBar, { height: day.totalMinutes ? `${Math.max(3, day.totalMinutes / maxDailySleep * 100)}%` : "0%" }]} /></View><Text style={styles.weeklyValue}>{day.sleepCount ? hours ? `${hours}s` : `${minutes}d` : "—"}</Text><Text style={styles.weeklyLabel}>{day.label}</Text></View>;
        })}</View> : <Text style={styles.body}>Grafik oluşturmak için uyku başlangıç ve bitiş kayıtları ekleyin.</Text>}
        <Text style={styles.hint}>Gün sınırını aşan uyku dönemleri iki güne süreleri oranında dağıtılır. Görsel yalnızca girilen kayıtları gösterir.</Text>
      </Card>
      <SectionTitle title="Bugünkü beslenme" />
      <Card tone="peach"><View style={styles.measureRow}><Measure value={`${feedingTotals.breastMinutes} dk`} label="Emzirme" /><Measure value={`${feedingTotals.bottleMl} ml`} label="Biberon" /><Measure value={`${feedingTotals.solids}`} label="Katı öğün" /></View><Text style={styles.body}>Toplam {feedingTotals.count} beslenme kaydı. Değerler yalnızca girilen kayıtlardan hesaplanır.</Text></Card>
      {latestGrowth ? <><SectionTitle title="Son büyüme ölçümü" /><Card tone="mint"><View style={styles.measureRow}><Measure value={latestGrowth.weightG ? `${latestGrowth.weightG} g` : "—"} label="Kilo" /><Measure value={latestGrowth.lengthCm ? `${latestGrowth.lengthCm} cm` : "—"} label="Boy" /><Measure value={latestGrowth.headCm ? `${latestGrowth.headCm} cm` : "—"} label="Baş" /></View><Text style={styles.muted}>{new Date(latestGrowth.startedAt).toLocaleDateString("tr-TR")}</Text></Card></> : null}
      <SectionTitle title="Aşı ve randevular" action={`${upcoming.length} yaklaşan`} />
      <View style={styles.dualButtons}><View style={styles.dualButton}><PrimaryButton label="Aşı ekle" quiet onPress={() => openTask("vaccine")} /></View><View style={styles.dualButton}><PrimaryButton label="Randevu ekle" quiet onPress={() => openTask("appointment")} /></View></View>
      {upcoming.length ? <Card>{upcoming.slice(0, 6).map((task) => <CareTaskRow key={task.id} task={task} onToggle={() => app.toggleCareTask(task.id)} onDelete={() => app.deleteCareTask(task.id)} />)}</Card> : <Card><Text style={styles.body}>Yaklaşan aşı veya doktor randevusu eklenmedi.</Text></Card>}
      <SectionTitle title="Doktor görüşmesi" />
      <Card><Text style={styles.cardTitle}>Kısa ve düzenli bir özet</Text><Text style={styles.body}>Son yedi günün uyku, beslenme, bez, sağlık ve büyüme kayıtlarını tarafsız bir metinde toplayın.</Text><View style={styles.spacer12} /><View style={styles.dualButtons}><View style={styles.dualButton}><PrimaryButton label="PDF hazırla" onPress={() => void shareDoctorPdf(state)} /></View><View style={styles.dualButton}><PrimaryButton label="Metni paylaş" quiet onPress={() => void Share.share({ message: createDoctorSummary(state) })} /></View></View></Card>
    </ScrollView>
  );
}

function CareTaskRow({ task, onToggle, onDelete }: { task: CareTask; onToggle: () => void; onDelete: () => void }) {
  return <Pressable onPress={onToggle} onLongPress={onDelete} style={styles.eventRow}><View style={[styles.eventDot, { backgroundColor: task.type === "vaccine" ? colors.peach : colors.lavender }]} /><View style={styles.flex}><Text style={styles.eventTitle}>{task.title}</Text><Text style={styles.muted}>{task.type === "vaccine" ? "Aşı" : "Randevu"} · dokununca tamamla</Text></View><Text style={styles.taskDate}>{new Date(task.dueAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}</Text></Pressable>;
}

function Measure({ value, label }: { value: string; label: string }) {
  return <View style={styles.measure}><Text style={styles.measureValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;
}

function FamilyScreen({ app, onEditProfile, onAddCaregiver }: { app: ReturnType<typeof useUykuvaState>; onEditProfile: () => void; onAddCaregiver: () => void }) {
  const summary = handoffSummary(app.state);
  const [quietStart, setQuietStart] = useState(app.state.preferences.quietStart);
  const [quietEnd, setQuietEnd] = useState(app.state.preferences.quietEnd);
  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ notificationsEnabled: false });
      await cancelSleepReminders();
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Uyku hatırlatması için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ notificationsEnabled: true });
  };
  const toggleCareTaskNotifications = async (enabled: boolean) => {
    if (!enabled) {
      app.updatePreferences({ careTaskRemindersEnabled: false });
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) return Alert.alert("Bildirim izni kapalı", "Aşı ve randevu hatırlatmaları için cihaz ayarlarından Uykuva bildirimlerine izin verin.");
    app.updatePreferences({ careTaskRemindersEnabled: true });
  };
  const saveQuietHours = () => {
    if (!isValidClock(quietStart) || !isValidClock(quietEnd)) return Alert.alert("Saatleri kontrol edin", "Saatleri 21:00 gibi SS:DD biçiminde yazın.");
    app.updatePreferences({ quietStart, quietEnd });
    Alert.alert("Kaydedildi", "Bu saatler arasında uyku penceresi bildirimi planlanmayacak.");
  };
  const confirmDelete = () => Alert.alert(
    "Tüm cihaz verileri silinsin mi?",
    "Bebek profili, bakım kayıtları ve uyku planı bu cihazdan kalıcı olarak silinir.",
    [{ text: "Vazgeç", style: "cancel" }, { text: "Tümünü sil", style: "destructive", onPress: () => void app.clearAllData() }]
  );
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Aile ve bakım</Text><Text style={styles.pageIntro}>Devir anında arama yapmak yerine tek, güncel özet paylaşın.</Text>
      <Card tone="mint"><View style={styles.settingRow}><View style={styles.flex}><Text style={styles.cardTitle}>{app.state.baby.name} profili</Text><Text style={styles.body}>Aktif bakım veren: {app.state.caregiverName}</Text></View><Pressable onPress={onEditProfile}><Text style={styles.editLink}>Profili düzenle</Text></Pressable></View></Card>
      <SectionTitle title="Bu cihazdaki bakım verenler" action={`${app.state.caregivers.length} kişi`} />
      <Card>{app.state.caregivers.map((caregiver) => {
        const active = caregiver.id === app.state.activeCaregiverId;
        const role = { parent: "Ebeveyn", family: "Aile", caregiver: "Bakıcı" }[caregiver.role];
        return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} key={caregiver.id} onPress={() => app.setActiveCaregiver(caregiver.id)} onLongPress={() => { if (app.state.caregivers.length > 1) Alert.alert("Bakım vereni sil", `${caregiver.name} bu cihazdan kaldırılsın mı?`, [{ text: "Vazgeç", style: "cancel" }, { text: "Sil", style: "destructive", onPress: () => app.deleteCaregiver(caregiver.id) }]); }} style={styles.caregiverRow}><View style={[styles.caregiverAvatar, active && styles.caregiverAvatarActive]}><Text style={[styles.avatarText, active && styles.activeAvatarText]}>{caregiver.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text></View><View style={styles.flex}><Text style={styles.eventTitle}>{caregiver.name}</Text><Text style={styles.muted}>{role}{active ? " · aktif" : ""}</Text></View><View style={[styles.radio, active && styles.radioActive]} /></Pressable>;
      })}<View style={styles.spacer12} /><PrimaryButton label="Bu cihaza bakım veren ekle" quiet onPress={onAddCaregiver} /><Text style={styles.hint}>Kişiyi seçtiğinizde yeni kayıtlar onun adına yazılır. Silmek için basılı tutun.</Text></Card>
      <PrimaryButton label="Bakım özetini paylaş" onPress={() => void Share.share({ message: summary })} />
      <View style={styles.spacer12} />
      <PrimaryButton label="Başka telefona davet et" quiet onPress={() => Alert.alert("Bulut paylaşımı yakında", "Bu cihazda birden fazla bakım veren kullanılabilir. Telefonlar arası güvenli davet, hesap senkronizasyonuyla eklenecek.")} />
      <SectionTitle title="Hatırlatmalar" />
      <Card>
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Uyku penceresi bildirimi</Text><Text style={styles.muted}>Tahmini pencere yaklaşırken sessizce hatırlatır.</Text></View><Switch value={app.state.preferences.notificationsEnabled} onValueChange={(value) => void toggleNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.notificationsEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.notificationsEnabled ? <><Text style={styles.inputLabel}>Kaç dakika önce?</Text><View style={styles.choiceRow}>{([5, 10, 15, 20, 30] as const).map((minutes) => <Pill key={minutes} label={`${minutes} dk`} active={app.state.preferences.sleepReminderMinutes === minutes} onPress={() => app.updatePreferences({ sleepReminderMinutes: minutes })} />)}</View></> : null}
        {app.state.preferences.notificationsEnabled ? <><Text style={styles.inputLabel}>Sessiz saatler</Text><View style={styles.timeFields}><View style={styles.timeField}><Text style={styles.muted}>Başlangıç</Text><TextInput value={quietStart} onChangeText={setQuietStart} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View><View style={styles.timeField}><Text style={styles.muted}>Bitiş</Text><TextInput value={quietEnd} onChangeText={setQuietEnd} style={styles.compactInput} keyboardType="numbers-and-punctuation" /></View></View><View style={styles.spacer12} /><PrimaryButton label="Sessiz saatleri kaydet" quiet onPress={saveQuietHours} /></> : null}
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Aşı ve randevu hatırlatmaları</Text><Text style={styles.muted}>Yaklaşan görevleri seçtiğiniz zamanda hatırlatır.</Text></View><Switch accessibilityLabel="Aşı ve randevu hatırlatmaları" value={app.state.preferences.careTaskRemindersEnabled} onValueChange={(value) => void toggleCareTaskNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.careTaskRemindersEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.careTaskRemindersEnabled ? <><Text style={styles.inputLabel}>Ne zaman hatırlatılsın?</Text><View style={styles.choiceRow}>{([{ minutes: 30, label: "30 dk" }, { minutes: 120, label: "2 saat" }, { minutes: 1440, label: "1 gün" }] as const).map(({ minutes, label }) => <Pill key={minutes} label={label} active={app.state.preferences.careTaskReminderMinutes === minutes} onPress={() => app.updatePreferences({ careTaskReminderMinutes: minutes })} />)}</View><Text style={styles.hint}>Hatırlatmalar sessiz saatlere denk gelirse sessiz dönem bitiminde, görev saatinden önce gönderilir.</Text></> : null}
      </Card>
      <SectionTitle title="Verileriniz" />
      <Card><Text style={styles.cardTitle}>Kontrol sizde</Text><Text style={styles.body}>Tüm profil, bakım ve plan verilerini okunabilir JSON biçiminde paylaşabilir veya bu cihazdan silebilirsiniz.</Text><View style={styles.spacer12} /><PrimaryButton label="Verilerimi dışa aktar" quiet onPress={() => void Share.share({ title: "Uykuva veri dışa aktarımı", message: createDataExport(app.state) })} /><View style={styles.spacer12} /><Pressable onPress={confirmDelete} style={styles.dangerButton}><Text style={styles.dangerText}>Tüm cihaz verilerini sil</Text></Pressable></Card>
    </ScrollView>
  );
}

function ProfileModal({ visible, close, app }: { visible: boolean; close: () => void; app: ReturnType<typeof useUykuvaState> }) {
  const [babyName, setBabyName] = useState(app.state.baby.name);
  const [caregiverName, setCaregiverName] = useState(app.state.caregiverName);
  const [birthDate, setBirthDate] = useState(app.state.baby.birthDate);
  const [gestationalWeek, setGestationalWeek] = useState(String(app.state.baby.gestationalWeek));

  useEffect(() => {
    if (!visible) return;
    setBabyName(app.state.baby.name); setCaregiverName(app.state.caregiverName);
    setBirthDate(app.state.baby.birthDate); setGestationalWeek(String(app.state.baby.gestationalWeek));
  }, [visible, app.state.baby, app.state.caregiverName]);

  const save = () => {
    const week = Number(gestationalWeek);
    const birth = new Date(`${birthDate}T12:00:00`);
    if (!babyName.trim() || !caregiverName.trim() || Number.isNaN(birth.getTime()) || birth > new Date() || !Number.isInteger(week) || week < 22 || week > 42) {
      return Alert.alert("Bilgileri kontrol edin", "Adları, doğum tarihini ve 22–42 arasındaki gebelik haftasını kontrol edin.");
    }
    app.updateProfile({ ...app.state.baby, name: babyName.trim(), birthDate, gestationalWeek: week }, caregiverName);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Profili düzenle</Text>
        <Field label="Bebeğin adı" value={babyName} onChangeText={setBabyName} />
        <Field label="Doğum tarihi" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" />
        <Field label="Gebelik haftası" value={gestationalWeek} onChangeText={setGestationalWeek} keyboardType="number-pad" />
        <Field label="Bakım veren" value={caregiverName} onChangeText={setCaregiverName} />
        <PrimaryButton label="Değişiklikleri kaydet" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} />
      </ScrollView>
    </Modal>
  );
}

function CaregiverModal({ visible, close, add }: { visible: boolean; close: () => void; add: (caregiver: Omit<Caregiver, "id">) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Caregiver["role"]>("parent");
  useEffect(() => {
    if (visible) { setName(""); setRole("parent"); }
  }, [visible]);
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return Alert.alert("İsim gerekli", "Bakım verenin adını veya aile içindeki rolünü yazın.");
    add({ name: cleanName, role });
    close();
  };
  const roles: { value: Caregiver["role"]; label: string }[] = [
    { value: "parent", label: "Ebeveyn" },
    { value: "family", label: "Aile" },
    { value: "caregiver", label: "Bakıcı" }
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} /><Text style={styles.pageTitle}>Bakım veren ekle</Text>
        <Text style={styles.pageIntro}>Bu kişi bu cihazdaki profilde seçilebilir ve yaptığı yeni kayıtlar kendi adıyla görünür.</Text>
        <Field label="İsim veya rol" value={name} onChangeText={setName} placeholder="Örn. Baba, Anneanne, Ece" />
        <Text style={styles.inputLabel}>Rol</Text>
        <View style={styles.choiceRow}>{roles.map((item) => <Pill key={item.value} label={item.label} active={role === item.value} onPress={() => setRole(item.value)} />)}</View>
        <View style={styles.spacer24} /><PrimaryButton label="Bakım vereni ekle" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} />
      </ScrollView>
    </Modal>
  );
}

function QuickAction({ glyph, label, onPress, active }: { glyph: string; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.quick, active && styles.quickActive]}><Text style={styles.quickGlyph}>{glyph}</Text><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

function EventRow({ event, onPress, onDelete }: { event: CareEvent; onPress?: () => void; onDelete?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? `${eventTitle(event)} · saatleri düzenle` : undefined} onPress={onPress} onLongPress={onDelete} style={styles.eventRow}>
      <View style={[styles.eventDot, { backgroundColor: event.kind === "sleep" ? colors.lavender : event.kind === "feed" ? colors.peach : colors.mint }]} />
      <View style={styles.flex}><Text style={styles.eventTitle}>{eventTitle(event)}</Text><Text style={styles.muted}>{event.caregiver}{event.kind === "feed" && event.allergens?.length ? ` · etiket: ${event.allergens.join(", ")}` : ""}{event.kind === "feed" && event.reactionNote ? ` · gözlem: ${event.reactionNote}` : ""}</Text></View>
      <Text style={styles.eventTime}>{time(event.startedAt)}</Text>
    </Pressable>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "white" | "mint" | "peach" | "lavender" }) {
  return <View style={styles.stat}><Card tone={tone}><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></Card></View>;
}

function CareTaskModal({ mode, close, add }: { mode: TaskMode; close: () => void; add: ReturnType<typeof useUykuvaState>["addCareTask"] }) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [clock, setClock] = useState("10:00");
  const [note, setNote] = useState("");
  if (!mode) return null;
  const save = () => {
    const dueAt = new Date(`${date}T${clock}:00`);
    if (!title.trim()) return Alert.alert("Başlık gerekli", mode === "vaccine" ? "Aşının adını yazın." : "Randevuyu tanımlayın.");
    if (Number.isNaN(dueAt.getTime()) || !isValidClock(clock)) return Alert.alert("Tarih ve saati kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    add({ type: mode, title: title.trim(), dueAt: dueAt.toISOString(), note: note.trim() || undefined });
    setTitle(""); setNote(""); close();
  };
  return <Modal visible transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>{mode === "vaccine" ? "Aşı ekle" : "Randevu ekle"}</Text><Text style={styles.pageIntro}>Uykuva resmi takvim yerine sizin girdiğiniz tarihi hatırlar; sağlık kararını uzmanınızla verin.</Text><Field label={mode === "vaccine" ? "Aşı adı" : "Randevu başlığı"} value={title} onChangeText={setTitle} placeholder={mode === "vaccine" ? "Örn. 6. ay aşıları" : "Örn. Çocuk doktoru kontrolü"} /><Field label="Tarih" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /><Field label="Saat" value={clock} onChangeText={setClock} keyboardType="numbers-and-punctuation" placeholder="10:00" /><Field label="Not (isteğe bağlı)" value={note} onChangeText={setNote} /><PrimaryButton label="Takvime ekle" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function SleepEntryModal({ event, visible, close, add, update, bedtime, wakeTime }: { event: CareEvent | null; visible: boolean; close: () => void; add: ReturnType<typeof useUykuvaState>["addEvent"]; update: ReturnType<typeof useUykuvaState>["updateEvent"]; bedtime: string; wakeTime: string }) {
  const [startDate, setStartDate] = useState("");
  const [startClock, setStartClock] = useState("");
  const [endClock, setEndClock] = useState("");
  const [ongoing, setOngoing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (event) {
      const start = new Date(event.startedAt);
      setStartDate(localDateValue(start));
      setStartClock(time(start));
      setEndClock(event.endedAt ? time(event.endedAt) : "");
      setOngoing(!event.endedAt);
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() - 1);
    setStartDate(localDateValue(start));
    setStartClock(isValidClock(bedtime) ? bedtime : "20:00");
    setEndClock(isValidClock(wakeTime) ? wakeTime : "07:00");
    setOngoing(false);
  }, [visible, event, bedtime, wakeTime]);

  const save = () => {
    const start = new Date(`${startDate}T${startClock}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(start.getTime()) || localDateValue(start) !== startDate || !isValidClock(startClock)) {
      return Alert.alert("Yatış bilgisini kontrol edin", "Tarihi YYYY-AA-GG, saati SS:DD biçiminde yazın.");
    }
    if (start.getTime() > Date.now()) return Alert.alert("Gelecek bir saat seçildi", "Uyku başlangıcı şu andan sonra olamaz.");
    let end: Date | undefined;
    if (!ongoing) {
      if (!isValidClock(endClock)) return Alert.alert("Uyanış saatini yazın", "Saati SS:DD biçiminde girin veya uyku devam ediyorsa anahtarı açın.");
      end = new Date(`${startDate}T${endClock}:00`);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      if (end.getTime() > Date.now()) return Alert.alert("Gelecek bir saat seçildi", "Uyanış zamanı şu andan sonra olamaz.");
      if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return Alert.alert("Süreyi kontrol edin", "Bir uyku kaydı 24 saatten uzun olamaz.");
    } else if (Date.now() - start.getTime() > 24 * 60 * 60 * 1000) {
      return Alert.alert("Süreyi kontrol edin", "Devam eden bir uyku kaydı 24 saatten uzun olamaz.");
    }
    const patch = { startedAt: start.toISOString(), endedAt: end?.toISOString() };
    if (event) update(event.id, patch);
    else add({ kind: "sleep", ...patch });
    close();
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><Pressable style={styles.backdrop} onPress={close} /><ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled"><View style={styles.sheetHandle} /><Text style={styles.pageTitle}>{event ? "Uyku kaydını düzenle" : "Geçmiş uyku ekle"}</Text><Text style={styles.pageIntro}>Başlangıç tarihini ve saatlerini kontrol edin. Uyanış saati yatıştan erkense sonraki gün olarak kaydedilir.</Text><Field label="Yatış tarihi" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" /><Field label="Yatış saati" value={startClock} onChangeText={setStartClock} keyboardType="numbers-and-punctuation" placeholder="20:00" /><View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Uyku devam ediyor</Text><Text style={styles.muted}>Henüz uyanmadıysa açın.</Text></View><Switch value={ongoing} onValueChange={setOngoing} trackColor={{ true: colors.sage }} thumbColor={ongoing ? colors.sageDark : "#E2E2E2"} /></View>{!ongoing ? <Field label="Uyanış saati" value={endClock} onChangeText={setEndClock} keyboardType="numbers-and-punctuation" placeholder="07:00" /> : null}<Text style={styles.hint}>Geçmiş kayıtlar zaman çizelgesinde başlangıç saatine dokunarak düzenlenir. Silmek için basılı tutun.</Text><View style={styles.spacer12} /><PrimaryButton label="Uyku kaydını kaydet" onPress={save} /><View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} /><View style={styles.spacer24} /></ScrollView></Modal>;
}

function QuickLogModal({ mode, close, app }: { mode: LogMode; close: () => void; app: ReturnType<typeof useUykuvaState> }) {
  const add = app.addSimpleEvent;
  const [amount, setAmount] = useState("90");
  const [feedType, setFeedType] = useState<"breast" | "bottle" | "solid">("breast");
  const [foods, setFoods] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [reaction, setReaction] = useState("");
  const [note, setNote] = useState("");
  const [healthType, setHealthType] = useState<"temperature" | "medicine" | "symptom">("temperature");
  const [temperature, setTemperature] = useState("37.0");
  const [medicineName, setMedicineName] = useState("");
  const [dose, setDose] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [head, setHead] = useState("");
  if (!mode) return null;
  const save = (details: Partial<CareEvent>) => { add(mode, details); setNote(""); close(); };
  const title = { feed: "Beslenme kaydı", diaper: "Bez kaydı", note: "Bakım notu", health: "Sağlık kaydı", growth: "Büyüme ölçümü" }[mode];
  const suggestedSide = nextBreastSide(app.state.events);
  const saveHealth = () => {
    if (healthType === "temperature") {
      const value = Number(temperature.replace(",", "."));
      if (!Number.isFinite(value) || value < 30 || value > 45) return Alert.alert("Değeri kontrol edin", "Sıcaklığı 30–45 °C arasında yazın.");
      return save({ healthType, temperatureC: value, note });
    }
    if (healthType === "medicine" && !medicineName.trim()) return Alert.alert("İlaç adını yazın", "Bu alan yalnızca verdiğiniz bilgiyi kaydeder; doz önermez.");
    save({ healthType, medicineName: medicineName.trim() || undefined, doseAsEntered: dose.trim() || undefined, note: note.trim() || undefined });
  };
  const saveGrowth = () => {
    const weightG = Number(weight.replace(",", "."));
    const lengthCm = Number(length.replace(",", "."));
    const headCm = Number(head.replace(",", "."));
    if (![weightG, lengthCm, headCm].some((value) => Number.isFinite(value) && value > 0)) return Alert.alert("En az bir ölçüm yazın", "Kilo, boy veya baş çevresinden en az biri gerekli.");
    save({ weightG: weightG > 0 ? weightG : undefined, lengthCm: lengthCm > 0 ? lengthCm : undefined, headCm: headCm > 0 ? headCm : undefined });
  };
  const saveSolidMeal = () => {
    const list = foods.split(",").map((item) => item.trim()).filter(Boolean);
    if (!list.length) return Alert.alert("Yiyecekleri yazın", "En az bir yiyecek adı gerekli.");
    save({ feedType: "solid", foods: list, allergens: selectedAllergens, reactionNote: reaction.trim() || undefined });
    setFoods(""); setReaction(""); setSelectedAllergens([]);
  };
  const toggleAllergen = (allergen: string) => setSelectedAllergens((current) => current.includes(allergen) ? current.filter((item) => item !== allergen) : [...current, allergen]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <ScrollView style={[styles.sheet, styles.quickSheet]} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHandle} />
        <Text style={styles.pageTitle}>{title}</Text>
        {mode === "feed" ? <>
          {app.runningFeed ? <Card tone="peach"><Text style={styles.cardTitle}>Emzirme devam ediyor</Text><Text style={styles.body}>{app.runningFeed.breastSide === "left" ? "Sol" : app.runningFeed.breastSide === "right" ? "Sağ" : "İki taraf"} · {time(app.runningFeed.startedAt)} başlangıç</Text><View style={styles.spacer12} /><PrimaryButton label="Emzirmeyi bitir" onPress={() => { app.toggleBreastfeed("both"); close(); }} /></Card> : <>
            <View style={styles.choiceRow}><Pill label="Emzirme" active={feedType === "breast"} onPress={() => setFeedType("breast")} /><Pill label="Biberon" active={feedType === "bottle"} onPress={() => setFeedType("bottle")} /><Pill label="Katı gıda" active={feedType === "solid"} onPress={() => setFeedType("solid")} /></View>
            {feedType === "breast" ? <><Text style={styles.inputLabel}>Hangi taraf?</Text>{suggestedSide ? <Text style={styles.suggestion}>Sıradaki öneri: {suggestedSide === "left" ? "sol" : "sağ"} taraf</Text> : null}<View style={styles.choiceRow}><Pill label="Sol" active={suggestedSide === "left"} onPress={() => { app.toggleBreastfeed("left"); close(); }} /><Pill label="Sağ" active={suggestedSide === "right"} onPress={() => { app.toggleBreastfeed("right"); close(); }} /><Pill label="İki taraf" onPress={() => { app.toggleBreastfeed("both"); close(); }} /></View></> : null}
            {feedType === "bottle" ? <><Field label="Miktar (ml)" value={amount} onChangeText={setAmount} keyboardType="number-pad" /><PrimaryButton label="Biberonu kaydet" onPress={() => { const value = Number(amount); if (!Number.isFinite(value) || value <= 0 || value > 1000) return Alert.alert("Miktarı kontrol edin", "Pozitif bir ml değeri yazın."); save({ feedType: "bottle", amountMl: value }); }} /></> : null}
            {feedType === "solid" ? <><Field label="Yiyecekler" value={foods} onChangeText={setFoods} placeholder="Örn. yoğurt, muz" /><Text style={styles.inputLabel}>Takip edilen alerjen içerikleri (isteğe bağlı)</Text><View style={styles.choiceRow}>{TRACKED_ALLERGENS.map((allergen) => <Pill key={allergen} label={allergen} active={selectedAllergens.includes(allergen)} onPress={() => toggleAllergen(allergen)} />)}</View><Text style={styles.hint}>Bunlar yalnızca öğün kaydına eklenen etiketlerdir; güvenli gıda veya alerji önerisi değildir.</Text><Field label="Gözlenen tepki (isteğe bağlı)" value={reaction} onChangeText={setReaction} placeholder="Gözleminizi yazın" /><PrimaryButton label="Öğünü kaydet" onPress={saveSolidMeal} /></> : null}
          </>}
        </> : null}
        {mode === "diaper" ? <View style={styles.choiceRow}><Pill label="Islak" active onPress={() => save({ diaperType: "wet" })} /><Pill label="Kirli" onPress={() => save({ diaperType: "dirty" })} /><Pill label="İkisi" onPress={() => save({ diaperType: "both" })} /></View> : null}
        {mode === "note" ? <><Text style={styles.inputLabel}>Not</Text><TextInput value={note} onChangeText={setNote} multiline placeholder="Bakımı devralan kişinin bilmesi gereken…" style={[styles.input, styles.noteInput]} /><PrimaryButton label="Notu kaydet" onPress={() => save({ note })} /></> : null}
        {mode === "health" ? <>
          <View style={styles.choiceRow}><Pill label="Ateş" active={healthType === "temperature"} onPress={() => setHealthType("temperature")} /><Pill label="İlaç" active={healthType === "medicine"} onPress={() => setHealthType("medicine")} /><Pill label="Belirti" active={healthType === "symptom"} onPress={() => setHealthType("symptom")} /></View>
          {healthType === "temperature" ? <Field label="Ölçülen sıcaklık (°C)" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" /> : null}
          {healthType === "medicine" ? <><Field label="İlaç adı" value={medicineName} onChangeText={setMedicineName} placeholder="Kutudaki adıyla" /><Field label="Verdiğiniz miktar (isteğe bağlı)" value={dose} onChangeText={setDose} placeholder="Örn. 2 ml — öneri değildir" /></> : null}
          <Text style={styles.inputLabel}>{healthType === "symptom" ? "Belirti notu" : "Not (isteğe bağlı)"}</Text><TextInput value={note} onChangeText={setNote} multiline style={[styles.input, styles.noteInput]} placeholder="Gözleminizi yazın" />
          <PrimaryButton label="Sağlık kaydını ekle" onPress={saveHealth} />
          <Text style={styles.disclaimer}>Uykuva miktar veya tekrar zamanı önermez; yalnızca yazdığınız bilgiyi saklar.</Text>
        </> : null}
        {mode === "growth" ? <><Field label="Kilo (gram)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Örn. 6450" /><Field label="Boy (cm)" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="Örn. 63,5" /><Field label="Baş çevresi (cm)" value={head} onChangeText={setHead} keyboardType="decimal-pad" placeholder="Örn. 41" /><PrimaryButton label="Ölçümü kaydet" onPress={saveGrowth} /></> : null}
        <View style={styles.spacer12} /><PrimaryButton label="Vazgeç" quiet onPress={close} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: StatusBar.currentHeight ?? 0 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: colors.inkSoft, fontSize: 13, marginTop: 12 },
  onboarding: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 26, paddingTop: 80 },
  onboardingMark: { width: 74, height: 74, borderRadius: 26, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  onboardingMoon: { color: colors.sageDark, fontSize: 38 },
  onboardingBrand: { color: colors.sageDark, fontSize: 18, fontWeight: "800", letterSpacing: 2, marginTop: 28 },
  onboardingTitle: { color: colors.ink, fontSize: 38, lineHeight: 44, fontWeight: "800", letterSpacing: -1.5, marginTop: 16 },
  onboardingBody: { color: colors.inkSoft, fontSize: 16, lineHeight: 25, marginTop: 16 },
  onboardingBottom: { marginTop: "auto", paddingBottom: 28 },
  privacyLine: { color: colors.inkSoft, fontSize: 11, textAlign: "center", marginTop: 13 },
  formPage: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },
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
  feedForecast: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.8, marginTop: 12, marginBottom: 7 },
  heroSmall: { color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -1, marginVertical: 10 },
  body: { color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
  awake: { color: colors.sageDark, fontSize: 13, fontWeight: "700", marginTop: 14 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 4, rowGap: 10 },
  quick: { width: "31.5%", minHeight: 82, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  quickActive: { backgroundColor: colors.peachSoft },
  quickGlyph: { color: colors.sageDark, fontSize: 25, marginBottom: 8 },
  quickLabel: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  spacer12: { height: 12 },
  spacer24: { height: 24 },
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
  readinessNote: { color: colors.sageDark, fontSize: 12, lineHeight: 18, marginTop: 14 },
  suggestion: { color: colors.sageDark, fontSize: 12, fontWeight: "700", marginTop: 2 },
  routineRow: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  routineDisabled: { opacity: 0.45 },
  miniCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.sage, alignItems: "center", justifyContent: "center", marginRight: 8 },
  routineNo: { width: 28, color: colors.sageDark, fontSize: 12, fontWeight: "800" },
  inlineForm: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  minutesInput: { width: 62, marginTop: 0 },
  hint: { color: colors.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 10 },
  easeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  easeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,.58)", alignItems: "center", justifyContent: "center" },
  easeButtonActive: { backgroundColor: colors.sageDark },
  easeText: { color: colors.ink, fontWeight: "700" },
  easeTextActive: { color: "white" },
  easeLabels: { color: colors.inkSoft, fontSize: 10, marginTop: 7 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  stat: { width: "50%", paddingHorizontal: 5 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.7 },
  weeklyChart: { flexDirection: "row", alignItems: "flex-end", minHeight: 126, gap: 6 },
  weeklyColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  weeklyTrack: { width: 26, height: 92, backgroundColor: "#F0F2ED", borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" },
  weeklyBar: { width: "100%", backgroundColor: colors.sageDark, borderRadius: 10 },
  weeklyValue: { color: colors.inkSoft, fontSize: 9, fontWeight: "700", marginTop: 5 },
  weeklyLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 2 },
  measureRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  measure: { flex: 1 },
  measureValue: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  dualButtons: { flexDirection: "row", gap: 10, marginBottom: 14 },
  dualButton: { flex: 1 },
  taskDate: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  nav: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, borderRadius: 24, backgroundColor: "#FFFFFFF2", flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderColor: colors.line },
  navItem: { alignItems: "center", justifyContent: "center", minWidth: 54 },
  navGlyph: { color: colors.inkSoft, fontSize: 20, fontWeight: "600" },
  navLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 4, fontWeight: "600" },
  navActive: { color: colors.sageDark, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(18,31,27,.34)" },
  sheet: { backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  quickSheet: { maxHeight: "78%" },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 4 },
  inputLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: "700", marginTop: 20, marginBottom: 7 },
  field: { marginBottom: 2 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 15, color: colors.ink, fontSize: 17 },
  noteInput: { height: 100, paddingTop: 14, textAlignVertical: "top", marginBottom: 14 },
  choiceRow: { flexDirection: "row", marginTop: 16, flexWrap: "wrap", rowGap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  editLink: { color: colors.sageDark, fontSize: 13, fontWeight: "700" },
  timeFields: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  compactInput: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 12, marginTop: 6, color: colors.ink },
  dangerButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: "#E8C7C7", alignItems: "center", justifyContent: "center" },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
  caregiverRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  caregiverAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  caregiverAvatarActive: { backgroundColor: colors.sageDark },
  activeAvatarText: { color: "white" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.sage },
  radioActive: { borderWidth: 6, borderColor: colors.sageDark }
});
