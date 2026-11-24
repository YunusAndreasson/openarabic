import android.content.Context;
import expo.modules.widgets.*;
import kotlin.coroutines.*;
import java.nio.file.*;
import java.util.concurrent.*;

class Host {
    public static void main(String[] args) throws Exception {
        Context context = new Context();
        for (int id : new int[]{1,2}) Files.writeString(Path.of("instance-" + id), "private");
        if ("legacy".equals(args[0])) {
            WidgetsUpdater.INSTANCE.reload(context, "WordInContext");
        } else {
            var completed = new CompletableFuture<Object>();
            var result = WidgetsUpdater.INSTANCE.publishPublic(context, "WordInContext", "public",
                new Continuation<kotlin.Unit>() {
                    public CoroutineContext getContext() { return EmptyCoroutineContext.INSTANCE; }
                    public void resumeWith(Object value) { completed.complete(value); }
                });
            if (result == kotlin.coroutines.intrinsics.IntrinsicsKt.getCOROUTINE_SUSPENDED())
                kotlin.ResultKt.throwOnFailure(completed.get(5, TimeUnit.SECONDS));
        }
        if (!ExpoWidgetsPeekWidget.started.await(5,TimeUnit.SECONDS)) throw new AssertionError("No worker");
        Runtime.getRuntime().halt(0); // The system host survives this process.
    }
}
