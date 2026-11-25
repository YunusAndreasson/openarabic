package android.content;

import java.util.HashMap;
import java.util.Map;

public class Context {
    public volatile String generation = "old";
    public final Map<String, String> disk = new HashMap<>();
    private final SharedPreferences state = new SharedPreferences() {
        public String getString(String key, String fallback) {
            return key.equals("generation") ? generation : disk.getOrDefault(key, fallback);
        }
        public Editor edit() {
            return new Editor() {
                public Editor putString(String key, String value) { disk.put(key, value); return this; }
                public Editor remove(String key) { disk.remove(key); return this; }
                public boolean commit() { return true; }
            };
        }
    };
    public SharedPreferences getSharedPreferences(String name, int mode) { return state; }
    public Context getApplicationContext() { return this; }
    public android.content.res.Resources getResources() { return new android.content.res.Resources(); }
    public String getPackageName() { return "qa"; }
    public android.content.pm.PackageManager getPackageManager() {
        return new android.content.pm.PackageManager();
    }
    public final android.app.AlarmManager alarms = new android.app.AlarmManager();
    public Object getSystemService(Class<?> type) {
        if (type == android.app.KeyguardManager.class) return new android.app.KeyguardManager();
        if (type == android.app.AlarmManager.class) return alarms;
        throw new AssertionError(type);
    }
}
