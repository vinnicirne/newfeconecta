package com.feconecta.myapp;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Pip")
public class PipPlugin extends Plugin {

    public static boolean isPipEnabled = false;

    @PluginMethod
    public void enablePip(PluginCall call) {
        isPipEnabled = true;
        call.resolve();
    }

    @PluginMethod
    public void disablePip(PluginCall call) {
        isPipEnabled = false;
        call.resolve();
    }
}
