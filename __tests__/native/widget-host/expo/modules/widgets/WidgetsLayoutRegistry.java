package expo.modules.widgets;

import android.content.Context;
import java.util.Map;

public class WidgetsLayoutRegistry {
    public static final WidgetsLayoutRegistry INSTANCE = new WidgetsLayoutRegistry();
    public static Map<String,Object> snapshot;
    public Map<String,Object> props(Context context, String name) { return snapshot; }
    public Map<String,Object> initialProps(Context context, String name) {
        return Map.of("arabic", "public");
    }
}
