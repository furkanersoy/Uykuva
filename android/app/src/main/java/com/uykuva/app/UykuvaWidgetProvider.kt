package com.uykuva.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
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
    private const val IS_SLEEPING = "is_sleeping"
    internal const val EXTRA_SLEEP_ACTION = "uykuva_widget_sleep_action"

    fun saveSleepWindow(context: Context, babyName: String, sleepWindow: String, status: String, feedingWindow: String, isSleeping: Boolean) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(BABY_NAME, babyName)
        .putString(SLEEP_WINDOW, sleepWindow)
        .putString(STATUS, status)
        .putString(FEEDING_WINDOW, feedingWindow)
        .putBoolean(IS_SLEEPING, isSleeping)
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

      val isSleeping = prefs.getBoolean(IS_SLEEPING, false)
      views.setTextViewText(R.id.widget_sleep_action, if (isSleeping) "Uykuyu bitir" else "Uykuyu başlat")
      views.setContentDescription(R.id.widget_sleep_action, if (isSleeping) "Uyku kaydını bitir ve gerçek uyanış saatini ekle" else "Uyku sayacını başlat")
      views.setViewVisibility(R.id.widget_sleep_action, if (prefs.contains(BABY_NAME)) View.VISIBLE else View.GONE)

      val sleepActionIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        putExtra(EXTRA_SLEEP_ACTION, if (isSleeping) "stop" else "start")
      }
      if (sleepActionIntent != null) {
        val sleepActionPendingIntent = PendingIntent.getActivity(
          context,
          appWidgetId + 20_000,
          sleepActionIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_sleep_action, sleepActionPendingIntent)
      }

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
