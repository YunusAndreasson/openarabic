package android.net;
import java.util.ArrayList;
import java.util.List;
public class Uri {
    private final String value;
    Uri(String value) { this.value = value; }
    public String getLastPathSegment() { return value.substring(value.lastIndexOf('/') + 1); }
    @Override public String toString() { return value; }
    public static class Builder {
        private final List<String> parts = new ArrayList<>();
        public Builder scheme(String part) { parts.add(part); return this; }
        public Builder authority(String part) { parts.add(part); return this; }
        public Builder appendPath(String part) { parts.add(part); return this; }
        public Uri build() { return new Uri(String.join("/", parts)); }
    }
}
