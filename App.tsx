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
import { useUykuvaState } from "./src/app/useUykuvaState";
import { coachingDay, createSleepForecast, handoffSummary, methodDescription } from "./src/domain/sleep";
import { CareEvent, SleepMethod } from "./src/domain/types";
import { cancelSleepReminders, requestNotificationPermission, scheduleSleepReminder } from "./src/services/notifications";
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
  const app = useUykuvaState();
  const [tab, setTab] = useState<Tab>("today");
  const [logMode, setLogMode] = useState<LogMode>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const forecast = useMemo(() => createSleepForecast(app.state.baby, app.state.events), [app.state.baby, app.state.events]);

  useEffect(() => {
    if (!app.hydrated || !app.state.onboardingComplete) return;
    if (!app.state.preferences.notificationsEnabled) {
      void cancelSleepReminders();
      return;
    }
    void scheduleSleepReminder(
      app.state.baby.name,
      forecast,
      app.state.preferences.sleepReminderMinutes
    );
  }, [app.hydrated, app.state.baby.name, app.state.onboardingComplete, app.state.preferences.notificationsEnabled, app.state.preferences.sleepReminderMinutes, forecast]);

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

        {tab === "today" && <TodayScreen app={app} forecast={forecast} openLog={setLogMode} />}
        {tab === "timeline" && <TimelineScreen events={app.state.events} onDelete={app.deleteEvent} />}
        {tab === "coach" && <CoachScreen app={app} />}
        {tab === "insights" && <InsightsScreen events={app.state.events} />}
        {tab === "family" && <FamilyScreen app={app} onEditProfile={() => setProfileOpen(true)} />}

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
      <ProfileModal visible={profileOpen} close={() => setProfileOpen(false)} app={app} />
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

function TodayScreen({ app, forecast, openLog }: { app: ReturnType<typeof useUykuvaState>; forecast: ReturnType<typeof createSleepForecast>; openLog: (mode: LogMode) => void }) {
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
      <Text style={styles.disclaimer}>Uykuva tıbbi tanı veya tedavi önermez. Endişeniz varsa sağlık uzmanınıza başvurun.</Text>
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

function CoachScreen({ app }: { app: ReturnType<typeof useUykuvaState> }) {
  const plan = coachingDay(app.state.sleepPlan.day, app.state.sleepPlan.method);
  const methods: SleepMethod[] = ["responsive", "gradual", "camping"];
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckIn = app.state.sleepPlan.checkIns.find((item) => item.date === today);
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
      <Card tone="peach">
        <Text style={styles.cardTitle}>Sabah check-in</Text><Text style={styles.body}>{plan.checkIn}</Text>
        <View style={styles.easeRow}>{([1, 2, 3, 4, 5] as const).map((ease) => <Pressable accessibilityRole="button" accessibilityLabel={`Kolaylık ${ease}/5`} key={ease} onPress={() => app.saveCheckIn({ date: today, ease })} style={[styles.easeButton, todayCheckIn?.ease === ease && styles.easeButtonActive]}><Text style={[styles.easeText, todayCheckIn?.ease === ease && styles.easeTextActive]}>{ease}</Text></Pressable>)}</View>
        <Text style={styles.easeLabels}><Text>Zordu</Text><Text>                                      Kolaydı</Text></Text>
      </Card>
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

function FamilyScreen({ app, onEditProfile }: { app: ReturnType<typeof useUykuvaState>; onEditProfile: () => void }) {
  const summary = handoffSummary(app.state);
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
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentInset}>
      <Text style={styles.pageTitle}>Aile ve bakım</Text><Text style={styles.pageIntro}>Devir anında arama yapmak yerine tek, güncel özet paylaşın.</Text>
      <Card tone="mint"><View style={styles.settingRow}><View style={styles.flex}><Text style={styles.cardTitle}>{app.state.caregiverName} · bu cihaz</Text><Text style={styles.body}>{app.state.baby.name} profilinin kayıtlarını yönetiyor.</Text></View><Pressable onPress={onEditProfile}><Text style={styles.editLink}>Düzenle</Text></Pressable></View></Card>
      <Card><Text style={styles.cardTitle}>Baba · bakım veren</Text><Text style={styles.body}>Kayıt ekleyebilir ve ortak akışı görebilir.</Text></Card>
      <PrimaryButton label="Bakım özetini paylaş" onPress={() => void Share.share({ message: summary })} />
      <View style={styles.spacer12} />
      <PrimaryButton label="Bakım veren davet et" quiet onPress={() => Alert.alert("Yakında", "Güvenli davet bağlantıları bulut senkronizasyonuyla birlikte eklenecek.")} />
      <SectionTitle title="Hatırlatmalar" />
      <Card>
        <View style={styles.settingRow}><View style={styles.flex}><Text style={styles.eventTitle}>Uyku penceresi bildirimi</Text><Text style={styles.muted}>Tahmini pencere yaklaşırken sessizce hatırlatır.</Text></View><Switch value={app.state.preferences.notificationsEnabled} onValueChange={(value) => void toggleNotifications(value)} trackColor={{ true: colors.sage }} thumbColor={app.state.preferences.notificationsEnabled ? colors.sageDark : "#E2E2E2"} /></View>
        {app.state.preferences.notificationsEnabled ? <><Text style={styles.inputLabel}>Kaç dakika önce?</Text><View style={styles.choiceRow}>{([5, 10, 15, 20, 30] as const).map((minutes) => <Pill key={minutes} label={`${minutes} dk`} active={app.state.preferences.sleepReminderMinutes === minutes} onPress={() => app.updatePreferences({ sleepReminderMinutes: minutes })} />)}</View></> : null}
      </Card>
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

function QuickLogModal({ mode, close, add }: { mode: LogMode; close: () => void; add: ReturnType<typeof useUykuvaState>["addSimpleEvent"] }) {
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
  routineRow: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  routineNo: { width: 28, color: colors.sageDark, fontSize: 12, fontWeight: "800" },
  easeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  easeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,.58)", alignItems: "center", justifyContent: "center" },
  easeButtonActive: { backgroundColor: colors.sageDark },
  easeText: { color: colors.ink, fontWeight: "700" },
  easeTextActive: { color: "white" },
  easeLabels: { color: colors.inkSoft, fontSize: 10, marginTop: 7 },
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
  field: { marginBottom: 2 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", paddingHorizontal: 15, color: colors.ink, fontSize: 17 },
  noteInput: { height: 100, paddingTop: 14, textAlignVertical: "top", marginBottom: 14 },
  choiceRow: { flexDirection: "row", marginTop: 16, flexWrap: "wrap", rowGap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  editLink: { color: colors.sageDark, fontSize: 13, fontWeight: "700" }
});
