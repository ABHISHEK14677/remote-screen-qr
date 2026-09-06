package com.example.screensharing

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.journeyapps.barcodescanner.CaptureActivity
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

class QrScannerActivity : Activity() {

    private val launcher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents != null) {
            val data = Intent().apply { putExtra(EXTRA_URL, result.contents) }
            setResult(RESULT_OK, data)
            // Hand straight to MainActivity
            val main = Intent(this, MainActivity::class.java).apply {
                putExtra(EXTRA_URL, result.contents)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            startActivity(main)
        }
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val opts = ScanOptions().apply {
            setPrompt("Scan the pairing QR from the dashboard")
            setBeepEnabled(true)
            setOrientationLocked(true)
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        }
        launcher.launch(opts)
    }

    companion object { const val EXTRA_URL = "qr_url" }
}
