package expo.modules.widgets;
import android.content.Context;
import android.appwidget.AppWidgetManager;
import android.widget.RemoteViews;
import androidx.glance.appwidget.AppWidgetId;
import kotlin.coroutines.Continuation;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public class ExpoWidgetsPeekWidget {
    public static final CountDownLatch started = new CountDownLatch(1);
    public static final CountDownLatch composed = new CountDownLatch(1);
    public static final CountDownLatch allowBinder = new CountDownLatch(1);
    public static final CompletableFuture<Void> published = new CompletableFuture<>();
    private static final AtomicBoolean first = new AtomicBoolean(true);
    public ExpoWidgetsPeekWidget(String name) {}
    public ExpoWidgetsPeekWidget(String name, WordRevealFrame frame, boolean revealed, int defaults,
            kotlin.jvm.internal.DefaultConstructorMarker marker) {}
    public Object composeSnapshot(Context context, AppWidgetId id, Continuation<?> continuation) throws Exception {
        String token = context.generation;
        RemoteViews rendered = new RemoteViews(context.getPackageName(), 1);
        if (WidgetsLayoutRegistry.snapshot != null) {
            var frame = WordWidgetReveal.INSTANCE.current(context);
            boolean revealed = WordWidgetReveal.INSTANCE.read(context, id.id(), frame);
            String text = (String)frame.getFace().get(revealed ? "gloss" : "arabic");
            rendered.setTextViewText(1, text);
            return new RenderedWord(token, rendered, frame.getBoundary(), revealed ? frame.getIdentity() : null);
        }
        rendered.setTextViewText(1, token.equals("old") ? "private" : "public");
        started.countDown();
        if (id.id() == 1 && first.getAndSet(false)) {
            composed.countDown();
            if (!allowBinder.await(10, TimeUnit.SECONDS)) throw new AssertionError("Renderer blocked");
        }
        return new RenderedWord(token, rendered, Long.MAX_VALUE, null);
    }
    public Object refresh(Context context, AppWidgetId id, Continuation<?> continuation) {
        started.countDown();
        // Peek increments the revision and sends UpdateGlanceState. Glance
        // publishes the translated tree in its separate AppWidgetSession.
        if (id.id() == 1 && first.getAndSet(false)) {
            Thread.startVirtualThread(() -> {
                try {
                    RemoteViews previous = new RemoteViews(context.getPackageName(), 1);
                    previous.setTextViewText(1, "private");
                    composed.countDown();
                    allowBinder.await();
                    AppWidgetManager.getInstance(context).updateAppWidget(id.id(), previous);
                    published.complete(null);
                } catch (Throwable t) { published.completeExceptionally(t); }
            });
        }
        return kotlin.Unit.INSTANCE;
    }
}
