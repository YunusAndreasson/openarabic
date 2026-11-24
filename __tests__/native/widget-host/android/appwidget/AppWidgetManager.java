package android.appwidget;
import android.content.*;
import android.widget.RemoteViews;
import java.nio.file.*;

public class AppWidgetManager {
    public static final java.util.concurrent.CompletableFuture<String> firstAfterRelease = new java.util.concurrent.CompletableFuture<>();
    public static volatile boolean observe;
    public static AppWidgetManager getInstance(Context context) { return new AppWidgetManager(); }
    public int[] getAppWidgetIds(ComponentName name) { return new int[]{1,2}; }
    public void updateAppWidget(int id, RemoteViews view) throws Exception {
        Files.writeString(Path.of("instance-" + id), view.word);
        if (observe && id == 1) firstAfterRelease.complete(view.word.toString());
    }
}
