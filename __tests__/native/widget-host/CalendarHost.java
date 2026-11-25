import expo.modules.widgets.WordWidgetCalendar;
import expo.modules.widgets.WordRevealFrame;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

class CalendarHost {
    private static long ms(String timestamp) { return Instant.parse(timestamp).toEpochMilli(); }

    public static void main(String[] args) {
        var time = ms("2026-11-25T10:55:00Z");
        var rotation = Map.of("firstUse", ms("2026-11-25T10:10:00Z"), "faces",
            List.of(RevealHost.seed, Map.of("generation", "", "key", "tomorrow", "arabic", "وَلَقَدْ",
                "gloss", "and indeed", "due", false)));
        var calendar = WordWidgetCalendar.INSTANCE;
        var stockholm = calendar.day(rotation, time, ZoneId.of("Europe/Stockholm"));
        var chatham = calendar.day(rotation, time, ZoneId.of("Pacific/Chatham"));
        RevealHost.check(stockholm.getFace().get("key").equals("public"));
        RevealHost.check(chatham.getFace().get("key").equals("tomorrow"));
        RevealHost.check(stockholm.getMidnight() == ms("2026-11-25T23:00:00Z"));
        RevealHost.check(chatham.getMidnight() == ms("2026-11-26T10:15:00Z"));

        var spring = calendar.day(rotation, ms("2026-03-29T00:00:00Z"), ZoneId.of("Europe/Stockholm"));
        RevealHost.check(spring.getFace().get("key").equals("public"));
        RevealHost.check(spring.getMidnight() == ms("2026-03-29T22:00:00Z"));

        var guest = WordRevealFrame.Companion.select(RevealHost.seed, RevealHost.seed, "", false, time, "", chatham);
        RevealHost.check(guest.getFace().get("key").equals("tomorrow"));
        RevealHost.check(guest.getBoundary() == chatham.getMidnight());
        var owned = RevealHost.word("current", "saved", time + 1000);
        var personal = WordRevealFrame.Companion.select(owned, RevealHost.seed, "current", false, time, "", chatham);
        RevealHost.check(personal.getFace().get("key").equals("saved") && personal.getBoundary() == time + 1000);
        var locked = WordRevealFrame.Companion.select(owned, RevealHost.seed, "current", true, time, "", chatham);
        RevealHost.check(locked.getFace().get("key").equals("tomorrow"));
    }
}
