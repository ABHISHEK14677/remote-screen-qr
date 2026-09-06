package com.example.screensharing

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private val captureConsent = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            startForegroundService(Intent(this, ScreenStreamService::class.java).apply {
                putExtra(ScreenStreamService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenStreamService.EXTRA_RESULT_DATA, result.data)
            })
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Replace with a consent-forward UI: Scan QR, then Start sharing / Cancel.
    }

    fun requestScreenCapture() {
        val manager = getSystemService(MediaProjectionManager::class.java)
        captureConsent.launch(manager.createScreenCaptureIntent())
    }
}
