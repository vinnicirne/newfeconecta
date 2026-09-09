# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Capacitor & WebView interface classes
-keep class com.getcapacitor.** { *; }
-keep class com.feconecta.myapp.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Plugin annotations & Bridge
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public void *(com.getcapacitor.PluginCall);
}

# Keep MediaSession and Media3
-keep class androidx.media3.** { *; }
-keep class io.github.jofr.capacitor.mediasessionplugin.** { *; }

# Preserve line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

