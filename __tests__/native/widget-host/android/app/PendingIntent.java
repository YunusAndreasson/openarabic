package android.app;
import android.content.*;
public class PendingIntent {
    public final Intent intent;
    private PendingIntent(Intent intent) { this.intent = intent; }
    public static PendingIntent getBroadcast(Context context, int requestCode, Intent intent, int flags) {
        return new PendingIntent(intent);
    }
}
