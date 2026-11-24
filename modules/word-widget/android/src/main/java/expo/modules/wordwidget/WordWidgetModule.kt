package expo.modules.wordwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

private fun provider(context: Context) =
  ComponentName(context.packageName, "${context.packageName}.WordInContextProvider")

private fun family(manager: AppWidgetManager, id: Int) =
  when (manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)) {
          0 -> "home"
          in 1..207 -> "compact"
          in 208..295 -> "intermediate"
          else -> "wide"
        }

class PinResultReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Android sends this private success callback only after accepting the pin.
    // The launcher can remove the instance before this receiver runs.
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(provider(context))
    val id = ids.firstOrNull { it == intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1) }
    val prefs = context.getSharedPreferences("word_widget", Context.MODE_PRIVATE)
    if (!prefs.contains("pinObservedAt")) {
      prefs.edit().putLong("pinObservedAt", System.currentTimeMillis())
        .putString("pinFamily", id?.let { family(manager, it) } ?: "home").commit()
    }
  }
}

// The launcher fills EXTRA_APPWIDGET_ID on success. Limit the mutable token
// to a single delivery to our explicit, non-exported receiver.
fun pinCallback(context: Context): PendingIntent {
  val mutable = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
  return PendingIntent.getBroadcast(context, 0, Intent(context, PinResultReceiver::class.java),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_ONE_SHOT or mutable)
}

class WordWidgetModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  override fun definition() = ModuleDefinition {
    Name("WordWidget")
    Function("openPublications") { owner: String -> AccountPublications.open(owner) }
    Function("beginPublication") { owner: String -> AccountPublications.enter(owner) }
    Function("endPublication") { AccountPublications.leave() }
    AsyncFunction("closePublications") { promise: expo.modules.kotlin.Promise -> AccountPublications.close(promise) }
    Function("matchesOwner") { owner: String, generation: String ->
      val prefs = context.getSharedPreferences("word_widget", Context.MODE_PRIVATE)
      generation.isNotEmpty() && prefs.getString("owner", "") == owner && prefs.getString("generation", "") == generation
    }
    Function("setOwner") { owner: String ->
      val prefs = context.getSharedPreferences("word_widget", Context.MODE_PRIVATE)
      // The final RemoteViews writer uses the same app SharedPreferences monitor.
      synchronized(prefs) {
        if (owner.isEmpty() || prefs.getString("owner", "") != owner) {
          val edit = prefs.edit()
          if (prefs.getString("owner", "") != owner) {
            edit.putString("revealEpoch", UUID.randomUUID().toString())
            prefs.all.keys.filter { it.startsWith("wordReveal.") }.forEach { edit.remove(it) }
          }
          check(edit.putString("owner", owner)
            .putString("generation", if (owner.isEmpty()) "" else UUID.randomUUID().toString()).commit())
        }
        if (owner.isEmpty()) {
          check(context.getSharedPreferences("expo.modules.widgets", Context.MODE_PRIVATE)
            .edit().remove("__expo_widgets_WordInContext_props").commit())
        }
        prefs.getString("generation", "") ?: ""
      }
    }
    AsyncFunction("placement") {
      val prefs = context.getSharedPreferences("word_widget", Context.MODE_PRIVATE)
      val manager = AppWidgetManager.getInstance(context)
      val families = manager.getAppWidgetIds(provider(context)).map { id ->
        family(manager, id)
      }.distinct()
      mapOf("families" to families,
        "accountState" to (if (prefs.getString("owner", "").isNullOrEmpty()) "guest" else "signed_in"),
        "canPin" to (Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported),
        "pinFamily" to prefs.getString("pinFamily", "home"),
        "pinObservedAt" to prefs.getLong("pinObservedAt", 0))
    }
    AsyncFunction("pin") {
      val manager = AppWidgetManager.getInstance(context)
      if (Build.VERSION.SDK_INT < 26 || !manager.isRequestPinAppWidgetSupported) false
      else {
        val callback = pinCallback(context)
        manager.requestPinAppWidget(provider(context), null, callback)
      }
    }
  }
}
