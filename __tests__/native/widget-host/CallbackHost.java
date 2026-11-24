import android.content.*;
import expo.modules.widgets.*;
import java.nio.file.*;
import java.util.concurrent.*;

class CallbackHost {
    static void broadcast(Context context, Intent intent) throws Exception {
        var receiver = new WordWidgetActionReceiver();
        receiver.onReceive(context, intent);
        receiver.finished.get(5, TimeUnit.SECONDS);
    }
    public static void main(String[] args) throws Exception {
        var context = new Context();
        var path = Path.of("instance-1");
        var other = Path.of("instance-2");
        Files.writeString(other, "untouched");
        var actions = WordWidgetReveal.INSTANCE;
        long due = System.currentTimeMillis() + 60_000;
        WidgetsLayoutRegistry.snapshot = RevealHost.word(context.generation, "original", due);
        var frame = actions.current(context);
        var reveal = actions.tap(context, 1, frame, false);
        broadcast(context, reveal);
        RevealHost.check(Files.readString(path).equals("meaning") && Files.readString(other).equals("untouched"));
        RevealHost.check(context.alarms.at == due && !context.alarms.exactRequested);
        var deadline = context.alarms.scheduled.intent;
        context.alarms.exactAllowed = true;
        broadcast(context, reveal);
        RevealHost.check(context.alarms.exactRequested);
        // The clock has crossed the scheduled boundary by the time Android delivers the alarm.
        WidgetsLayoutRegistry.snapshot = RevealHost.word(context.generation, "original", System.currentTimeMillis() - 1);
        broadcast(context, deadline);
        RevealHost.check(Files.readString(path).equals("word") && context.disk.isEmpty());
        broadcast(context, reveal);
        RevealHost.check(Files.readString(path).equals("word") && Files.readString(other).equals("untouched"));
    }
}
