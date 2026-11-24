import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import expo.modules.wordwidget.PinResultReceiver;
import java.util.HashMap;
import java.util.Map;

/** Exercises the compiled receiver with a launcher that removes the instance before delivery. */
class Pin extends Context implements SharedPreferences, SharedPreferences.Editor {
    private final Map<String, Object> saved = new HashMap<>();

    public SharedPreferences getSharedPreferences(String key, int mode) { return this; }
    public boolean contains(String key) { return saved.containsKey(key); }
    public Editor edit() { return this; }
    public Editor putLong(String key, long value) { saved.put(key, value); return this; }
    public Editor putString(String key, String value) { saved.put(key, value); return this; }
    public boolean commit() { return true; }

    static void assertPin(int[] existing, String expectedFamily) {
        var receiver = new PinResultReceiver();
        var context = new Pin();
        AppWidgetManager.ids = existing;
        receiver.onReceive(context, new Intent()); // Callback for instance 6.
        Object time = context.saved.get("pinObservedAt");
        if (!(time instanceof Long) || (long) time <= 0
                || !expectedFamily.equals(context.saved.get("pinFamily"))) {
            throw new AssertionError(context.saved);
        }
        AppWidgetManager.ids = new int[0];
        receiver.onReceive(context, new Intent());
        if (!time.equals(context.saved.get("pinObservedAt"))
                || !expectedFamily.equals(context.saved.get("pinFamily"))) {
            throw new AssertionError("Duplicate callback changed the first observation");
        }
    }

    public static void main(String[] args) {
        int flags = expo.modules.wordwidget.WordWidgetModuleKt.pinCallback(new Pin()).flags;
        Intent.PinCallbackState.mutable = (flags & 0x02000000) != 0 && (flags & 0x04000000) == 0;
        assertPin(new int[]{6}, "compact");
        assertPin(new int[0], "home");
        assertPin(new int[]{8}, "home"); // A different instance cannot supply the removed one's size.
        System.out.println("Pin callback preserved after removal and redelivery");
    }
}
