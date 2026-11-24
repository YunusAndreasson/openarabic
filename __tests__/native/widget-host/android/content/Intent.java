package android.content;
import android.net.Uri;
public class Intent {
    private Uri data;
    private String action;
    private int widgetId;
    public final Class<?> receiver;
    public Intent(Context context, Class<?> receiver) { this.receiver = receiver; }
    public Intent setData(Uri data) { this.data = data; return this; }
    public Uri getData() { return data; }
    public Intent setAction(String action) { this.action = action; return this; }
    public String getAction() { return action; }
    public Intent putExtra(String name, int value) { widgetId = value; return this; }
    public int getIntExtra(String name, int fallback) { return widgetId; }
}
