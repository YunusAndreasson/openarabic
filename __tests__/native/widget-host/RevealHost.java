import android.content.Context;
import android.content.Intent;
import expo.modules.widgets.*;
import java.util.Map;

class RevealHost {
    static final WordWidgetReveal actions = WordWidgetReveal.INSTANCE;
    static final Map<String,Object> seed = Map.of("generation", "", "key", "public", "arabic", "كَنْزٍ",
            "gloss", "a treasure", "due", false);
    static Map<String,Object> word(String generation, String key, long dueAt) {
        return Map.of("generation", generation, "key", key, "arabic", "word", "gloss", "meaning",
                "due", false, "dueAt", dueAt);
    }
    static WordRevealFrame frame(Context context, Map<String,Object> props, long now) {
        return WordRevealFrame.Companion.select(props, seed, context.generation, false, now, context.disk.getOrDefault("revealEpoch", ""));
    }
    static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    static void show(Context context, int id, Intent intent, WordRevealFrame frame) {
        check(intent.receiver == WordWidgetActionReceiver.class);
        check(intent.getIntExtra("appWidgetId", -1) == id);
        actions.interact(context, id, intent, frame);
    }
    public static void main(String[] args) {
        var c = new Context();
        c.generation = "";
        var guest = frame(c, seed, 100);
        var first = actions.tap(c, 1, guest, false);
        check(!first.getData().toString().contains("treasure"));
        check(!first.getData().toString().equals(actions.tap(c, 2, guest, false).getData().toString()));
        check(!actions.read(c, 1, guest));
        show(c, 1, first, guest);
        show(c, 1, first, guest); // Duplicate delivery still means "show".
        check(actions.read(c, 1, guest) && !actions.read(c, 2, guest));
        show(c, 1, actions.tap(c, 1, guest, true), guest);
        check(!actions.read(c, 1, guest));
        show(c, 1, first, guest);
        c.generation = "owner-a";
        check(!actions.read(c, 1, frame(c, seed, 101)));
        var saved = word(c.generation, "one", 200);
        var before = frame(c, saved, 150);
        var reveal = actions.tap(c, 1, before, false);
        show(c, 1, reveal, before);
        check(actions.read(c, 1, before) && before.getBoundary() == 200);
        var republished = new java.util.HashMap<>(saved);
        republished.put("occurrenceKey", "one");
        republished.put("key", "later snapshot of the same word");
        check(actions.read(c, 1, frame(c, republished, 160)));
        var atDue = frame(c, saved, 200);
        check(actions.tap(c, 1, atDue, false) == null && !actions.read(c, 1, atDue));
        show(c, 1, reveal, atDue);
        check(!actions.read(c, 1, atDue));
        show(c, 1, reveal, before);
        var nextWord = frame(c, word(c.generation, "two", 200), 150);
        show(c, 1, reveal, nextWord); // Tap delivered after the displayed word changed.
        check(!actions.read(c, 1, nextWord) && !actions.read(c, 1, before));
        show(c, 1, reveal, before);
        c.generation = "replacement";
        var revoked = frame(c, saved, 151);
        check(revoked.getFace().equals(seed));
        show(c, 1, reveal, revoked);
        check(!actions.read(c, 1, revoked) && c.disk.isEmpty());
        c.generation = "";
        c.disk.put("revealEpoch", "new guest session");
        var newGuest = frame(c, seed, 300);
        show(c, 1, first, newGuest);
        check(!actions.read(c, 1, newGuest));
    }
}
