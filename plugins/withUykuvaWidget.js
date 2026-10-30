const fs = require("node:fs/promises");
const path = require("node:path");
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  withStringsXml
} = require("@expo/config-plugins");

const provider = `package com.uykuva.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class UykuvaWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    widgetIds.forEach { appWidgetId -> updateWidget(context, manager, appWidgetId) }
  }

  companion object {
    private const val PREFS = "uykuva_home_widget"
    private const val BABY_NAME = "baby_name"
    private const val SLEEP_WINDOW = "sleep_window"
    private const val STATUS = "status"
    private const val FEEDING_WINDOW = "feeding_window"

    fun saveSleepWindow(context: Context, babyName: String, sleepWindow: String, status: String, feedingWindow: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(BABY_NAME, babyName)
        .putString(SLEEP_WINDOW, sleepWindow)
        .putString(STATUS, status)
        .putString(FEEDING_WINDOW, feedingWindow)
        .apply()
      refresh(context)
    }

    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, UykuvaWidgetProvider::class.java)
      manager.getAppWidgetIds(component).forEach { appWidgetId -> updateWidget(context, manager, appWidgetId) }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val views = RemoteViews(context.packageName, R.layout.uykuva_widget)
      views.setTextViewText(R.id.widget_baby, prefs.getString(BABY_NAME, "Bebeğiniz") ?: "Bebeğiniz")
      views.setTextViewText(R.id.widget_window, prefs.getString(SLEEP_WINDOW, "Uyku aralığı bekleniyor") ?: "Uyku aralığı bekleniyor")
      views.setTextViewText(R.id.widget_status, prefs.getString(STATUS, "Güncel tahmin için Uykuva'yı açın") ?: "Güncel tahmin için Uykuva'yı açın")
      views.setTextViewText(R.id.widget_feeding, prefs.getString(FEEDING_WINDOW, "Beslenme penceresi için kayıt gerekiyor") ?: "Beslenme penceresi için kayıt gerekiyor")

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent != null) {
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pendingIntent = PendingIntent.getActivity(
          context,
          appWidgetId,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
      }
      manager.updateAppWidget(appWidgetId, views)
    }
  }
}
`;

const nativeModule = `package com.uykuva.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class UykuvaWidgetModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "UykuvaWidget"

  @ReactMethod
  fun updateSleepWindow(babyName: String, sleepWindow: String, status: String, feedingWindow: String, promise: Promise) {
    try {
      UykuvaWidgetProvider.saveSleepWindow(reactApplicationContext, babyName, sleepWindow, status, feedingWindow)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("WIDGET_UPDATE_FAILED", error)
    }
  }
}

class UykuvaWidgetPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(UykuvaWidgetModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

const widgetLayout = `<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/widget_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/uykuva_widget_background"
  android:gravity="center_vertical"
  android:orientation="vertical"
  android:padding="16dp">
  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="UYKUVA · SIRADAKİ UYKU"
    android:textColor="#447465"
    android:textSize="11sp"
    android:textStyle="bold" />
  <TextView
    android:id="@+id/widget_baby"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="5dp"
    android:ellipsize="end"
    android:maxLines="1"
    android:text="Bebeğiniz"
    android:textColor="#61716C"
    android:textSize="12sp" />
  <TextView
    android:id="@+id/widget_window"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="3dp"
    android:ellipsize="end"
    android:maxLines="1"
    android:text="Uyku aralığı bekleniyor"
    android:textColor="#20332E"
    android:textSize="22sp"
    android:textStyle="bold" />
  <TextView
    android:id="@+id/widget_status"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="3dp"
    android:ellipsize="end"
    android:maxLines="1"
    android:text="Güncel tahmin için Uykuva'yı açın"
    android:textColor="#447465"
    android:textSize="12sp" />
  <TextView
    android:id="@+id/widget_feeding"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="5dp"
    android:ellipsize="end"
    android:maxLines="1"
    android:text="Beslenme penceresi için kayıt gerekiyor"
    android:textColor="#61716C"
    android:textSize="12sp" />
</LinearLayout>
`;

const widgetBackground = `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#F3F8F4" />
  <corners android:radius="20dp" />
  <stroke android:width="1dp" android:color="#DCEBE2" />
</shape>
`;

const widgetInfo = `<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:description="@string/uykuva_widget_description"
  android:initialLayout="@layout/uykuva_widget"
  android:minHeight="125dp"
  android:minWidth="200dp"
  android:previewLayout="@layout/uykuva_widget"
  android:resizeMode="horizontal|vertical"
  android:updatePeriodMillis="1800000"
  android:widgetCategory="home_screen" />
`;

function withWidgetManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) throw new Error("Uykuva widget yapılandırması için Android application tanımı bulunamadı.");
    application.receiver ??= [];
    if (!application.receiver.some((item) => item.$?.["android:name"] === ".UykuvaWidgetProvider")) {
      application.receiver.push({
        $: { "android:name": ".UykuvaWidgetProvider", "android:exported": "true" },
        "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }] }],
        "meta-data": [{ $: { "android:name": "android.appwidget.provider", "android:resource": "@xml/uykuva_widget_info" } }]
      });
    }
    return mod;
  });
}

function withWidgetStrings(config) {
  return withStringsXml(config, (mod) => {
    const strings = mod.modResults.resources.string ?? [];
    if (!strings.some((item) => item.$?.name === "uykuva_widget_description")) {
      strings.push({ $: { name: "uykuva_widget_description" }, _: "Bebeğinizin sıradaki uyku ve kişisel beslenme pencereleri" });
    }
    mod.modResults.resources.string = strings;
    return mod;
  });
}

function withWidgetPackage(config) {
  return withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt") {
      throw new Error("Uykuva widget yerel paketi Kotlin MainApplication gerektiriyor.");
    }
    if (!mod.modResults.contents.includes("add(UykuvaWidgetPackage())")) {
      const pattern = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      if (!pattern.test(mod.modResults.contents)) {
        throw new Error("Uykuva widget paketi MainApplication içine eklenemedi.");
      }
      mod.modResults.contents = mod.modResults.contents.replace(pattern, "$1\n          add(UykuvaWidgetPackage())");
    }
    return mod;
  });
}

function withWidgetFiles(config) {
  return withDangerousMod(config, ["android", async (mod) => {
    const applicationId = mod.android?.package ?? mod.modRawConfig.android?.package;
    if (!applicationId) throw new Error("Android paket adı tanımlı olmadığı için Uykuva widget üretilemedi.");
    const sourceRoot = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main");
    const javaPackagePath = applicationId.split(".").join(path.sep);
    const files = [
      [path.join(sourceRoot, "java", javaPackagePath, "UykuvaWidgetProvider.kt"), provider.replace("package com.uykuva.app", `package ${applicationId}`)],
      [path.join(sourceRoot, "java", javaPackagePath, "UykuvaWidgetModule.kt"), nativeModule.replace("package com.uykuva.app", `package ${applicationId}`)],
      [path.join(sourceRoot, "res", "layout", "uykuva_widget.xml"), widgetLayout],
      [path.join(sourceRoot, "res", "drawable", "uykuva_widget_background.xml"), widgetBackground],
      [path.join(sourceRoot, "res", "xml", "uykuva_widget_info.xml"), widgetInfo]
    ];
    await Promise.all(files.map(async ([file, contents]) => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, contents, "utf8");
    }));
    return mod;
  }]);
}

module.exports = function withUykuvaWidget(config) {
  config = withWidgetManifest(config);
  config = withWidgetStrings(config);
  config = withWidgetPackage(config);
  return withWidgetFiles(config);
};
