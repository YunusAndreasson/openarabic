package android.widget;
public class RemoteViews {
    public CharSequence word;
    public RemoteViews(String app, int layout) {}
    public void setTextViewText(int id, CharSequence text) { word = text; }
}
