package android.content;
import java.util.concurrent.*;
public abstract class BroadcastReceiver {
    public final CompletableFuture<Void> finished = new CompletableFuture<>();
    public abstract void onReceive(Context context, Intent intent);
    public final PendingResult goAsync() { return new PendingResult(finished); }
    public static class PendingResult {
        private final CompletableFuture<Void> finished;
        PendingResult(CompletableFuture<Void> finished) { this.finished = finished; }
        public void finish() { finished.complete(null); }
    }
}
