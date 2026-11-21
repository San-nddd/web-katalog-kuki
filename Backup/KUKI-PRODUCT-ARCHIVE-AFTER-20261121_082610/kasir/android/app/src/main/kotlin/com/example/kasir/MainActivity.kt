package com.example.kasir

import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var usbPrinterChannel: UsbThermalPrinterChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        usbPrinterChannel = UsbThermalPrinterChannel(
            this,
            MethodChannel(
                flutterEngine.dartExecutor.binaryMessenger,
                "kuki/usb_thermal_printer",
            ),
        )
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        usbPrinterChannel?.dispose()
        usbPrinterChannel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}
