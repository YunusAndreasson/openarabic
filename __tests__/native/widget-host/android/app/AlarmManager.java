package android.app;
public class AlarmManager {
    public PendingIntent scheduled;
    public long at;
    public boolean exactAllowed;
    public boolean exactRequested;
    public boolean canScheduleExactAlarms() { return exactAllowed; }
    public void setExactAndAllowWhileIdle(int type, long at, PendingIntent alarm) {
        if (!exactAllowed) throw new AssertionError("Asked for an exact alarm without access");
        this.at = at; scheduled = alarm; exactRequested = true;
    }
    public void setAndAllowWhileIdle(int type, long at, PendingIntent alarm) {
        this.at = at; scheduled = alarm; exactRequested = false;
    }
    public void cancel(PendingIntent alarm) { scheduled = null; }
}
