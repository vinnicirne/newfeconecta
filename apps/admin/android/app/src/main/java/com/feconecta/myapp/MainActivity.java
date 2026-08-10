package com.feconecta.myapp;

import android.os.Bundle;
import android.os.Build;
import android.app.PictureInPictureParams;
import android.util.Rational;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(PipPlugin.class);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (PipPlugin.isPipEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
            // Proporção de tela horizontal do video da live (16:9)
            Rational aspectRatio = new Rational(16, 9);
            pipBuilder.setAspectRatio(aspectRatio);
            enterPictureInPictureMode(pipBuilder.build());
        }
    }
}
