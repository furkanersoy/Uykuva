package com.uykuva.app

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
      UykuvaWidgetProvider.saveSleepWindow(reactApplicationContext, babyName, sleepWindow, status, feedingWindow, false)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("WIDGET_UPDATE_FAILED", error)
    }
  }

  @ReactMethod
  fun consumePendingSleepAction(promise: Promise) {
    try {
      val activity = getCurrentActivity()
      val intent = activity?.intent
      val action = intent?.getStringExtra(UykuvaWidgetProvider.EXTRA_SLEEP_ACTION)
      intent?.removeExtra(UykuvaWidgetProvider.EXTRA_SLEEP_ACTION)
      promise.resolve(action)
    } catch (error: Exception) {
      promise.reject("WIDGET_ACTION_FAILED", error)
    }
  }
}

class UykuvaWidgetPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(UykuvaWidgetModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
