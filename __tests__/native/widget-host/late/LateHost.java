import android.content.Context;
import expo.modules.widgets.*;
import kotlin.coroutines.*;
import java.nio.file.*;
import java.util.concurrent.*;

class LateHost {
    public static void main(String[] args) throws Exception {
        var context = new Context();
        WidgetsUpdater.INSTANCE.reload(context, "WordInContext");
        if (!ExpoWidgetsPeekWidget.composed.await(5, TimeUnit.SECONDS)) throw new AssertionError();
        // The snapshots are already composed. Model explicit revocation and a
        // replacement sign-in, plus the matching-generation control.
        synchronized (context.getSharedPreferences("word_widget", 0)) {
            context.generation = args[0];
        }
        var done = new CompletableFuture<Object>();
        var ret = WidgetsUpdater.INSTANCE.publishPublic(context, "WordInContext", "public", new Continuation<kotlin.Unit>() {
            public CoroutineContext getContext() { return EmptyCoroutineContext.INSTANCE; }
            public void resumeWith(Object result) { done.complete(result); }
        });
        if (ret == kotlin.coroutines.intrinsics.IntrinsicsKt.getCOROUTINE_SUSPENDED())
            kotlin.ResultKt.throwOnFailure(done.get(5, TimeUnit.SECONDS));
        if (!Files.readString(Path.of("instance-1")).equals("public")) throw new AssertionError();
        android.appwidget.AppWidgetManager.observe = true;
        ExpoWidgetsPeekWidget.allowBinder.countDown();
        String firstWrite = android.appwidget.AppWidgetManager.firstAfterRelease.get(5, TimeUnit.SECONDS);
        if (!firstWrite.equals(args[0].equals("old") ? "private" : "public"))
            throw new AssertionError("Stale final host write: " + firstWrite);

        Runtime.getRuntime().halt(0);
    }
}
