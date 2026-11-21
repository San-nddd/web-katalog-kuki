package com.example.kasir

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.IOException

internal class UsbThermalPrinterChannel(
    private val activity: Activity,
    private val channel: MethodChannel,
) : MethodChannel.MethodCallHandler {
    private val usbManager =
        activity.getSystemService(Context.USB_SERVICE) as UsbManager
    private val connectionLock = Any()
    private var connection: UsbDeviceConnection? = null
    private var printerInterface: UsbInterface? = null
    private var outputEndpoint: UsbEndpoint? = null
    private var connectedDeviceId: Int? = null
    private var pendingConnectResult: MethodChannel.Result? = null
    private var receiverRegistered = false

    private val permissionAction = "${activity.packageName}.USB_PRINTER_PERMISSION"

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                permissionAction -> onPermissionResult(intent)
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    if (intent.usbDevice()?.deviceId == connectedDeviceId) {
                        closeConnection()
                    }
                }
            }
        }
    }

    init {
        channel.setMethodCallHandler(this)
        registerReceiver()
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "listUsbPrinters" -> result.success(listUsbPrinters())
            "connectUsbPrinter" -> connectUsbPrinter(call, result)
            "isUsbPrinterConnected" -> result.success(isUsbPrinterConnected())
            "writeUsbPrinterBytes" -> writeUsbPrinterBytes(call, result)
            "disconnectUsbPrinter" -> {
                closeConnection()
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    fun dispose() {
        channel.setMethodCallHandler(null)
        pendingConnectResult?.error(
            "USB_CONNECTION_CANCELLED",
            "The printer screen was closed.",
            null,
        )
        pendingConnectResult = null
        closeConnection()
        if (receiverRegistered) {
            activity.unregisterReceiver(usbReceiver)
            receiverRegistered = false
        }
    }

    private fun registerReceiver() {
        val filter = IntentFilter(permissionAction).apply {
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            activity.registerReceiver(usbReceiver, filter)
        }
        receiverRegistered = true
    }

    private fun listUsbPrinters(): List<Map<String, Any>> =
        usbManager.deviceList.values.map { device ->
            mapOf(
                "name" to (device.productName?.takeIf { it.isNotBlank() }
                    ?: "Printer ${device.vendorId}:${device.productId}"),
                "deviceId" to device.deviceId,
                "vendorId" to device.vendorId,
                "productId" to device.productId,
            )
        }

    private fun isUsbPrinterConnected(): Boolean = synchronized(connectionLock) {
        connection != null && connectedDeviceId != null && outputEndpoint != null
    }

    private fun connectUsbPrinter(call: MethodCall, result: MethodChannel.Result) {
        val deviceId = call.argument<Int>("deviceId")
        val vendorId = call.argument<Int>("vendorId")
        val productId = call.argument<Int>("productId")
        if (deviceId == null && (vendorId == null || productId == null)) {
            result.error("USB_INVALID_DEVICE", "USB device information is missing.", null)
            return
        }

        val device = usbManager.deviceList.values.firstOrNull { candidate ->
            if (deviceId != null) candidate.deviceId == deviceId
            else candidate.vendorId == vendorId && candidate.productId == productId
        }
        if (device == null) {
            result.error("USB_DEVICE_NOT_FOUND", "The USB printer is not connected.", null)
            return
        }

        if (usbManager.hasPermission(device)) {
            openPrinter(device, result)
            return
        }
        if (pendingConnectResult != null) {
            result.error("USB_BUSY", "A USB permission request is already in progress.", null)
            return
        }

        pendingConnectResult = result
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE
            } else {
                0
            }
        val permissionIntent = PendingIntent.getBroadcast(
            activity,
            0,
            Intent(permissionAction).setPackage(activity.packageName),
            flags,
        )
        usbManager.requestPermission(device, permissionIntent)
    }

    private fun onPermissionResult(intent: Intent) {
        val result = pendingConnectResult ?: return
        pendingConnectResult = null

        val device = intent.usbDevice()
        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false) &&
            device != null
        ) {
            openPrinter(device, result)
        } else {
            result.error(
                "USB_PERMISSION_DENIED",
                "USB permission was not granted.",
                null,
            )
        }
    }

    private fun openPrinter(device: UsbDevice, result: MethodChannel.Result) {
        var targetInterface: UsbInterface? = null
        var targetEndpoint: UsbEndpoint? = null

        search@ for (interfaceIndex in 0 until device.interfaceCount) {
            val candidateInterface = device.getInterface(interfaceIndex)
            for (endpointIndex in 0 until candidateInterface.endpointCount) {
                val candidateEndpoint = candidateInterface.getEndpoint(endpointIndex)
                if (candidateEndpoint.direction == UsbConstants.USB_DIR_OUT &&
                    candidateEndpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK
                ) {
                    targetInterface = candidateInterface
                    targetEndpoint = candidateEndpoint
                    break@search
                }
            }
        }

        if (targetInterface == null || targetEndpoint == null) {
            result.error(
                "USB_PRINTER_UNSUPPORTED",
                "No USB bulk output endpoint was found on this device.",
                null,
            )
            return
        }

        val deviceConnection = usbManager.openDevice(device)
        if (deviceConnection == null) {
            result.error("USB_OPEN_FAILED", "Could not open the USB printer.", null)
            return
        }
        if (!deviceConnection.claimInterface(targetInterface, true)) {
            deviceConnection.close()
            result.error("USB_OPEN_FAILED", "Could not claim the USB printer interface.", null)
            return
        }

        closeConnection()
        synchronized(connectionLock) {
            connection = deviceConnection
            printerInterface = targetInterface
            outputEndpoint = targetEndpoint
            connectedDeviceId = device.deviceId
        }
        result.success(true)
    }

    private fun writeUsbPrinterBytes(call: MethodCall, result: MethodChannel.Result) {
        val bytes = call.argument<ByteArray>("bytes")
            ?: call.argument<List<Int>>("bytes")?.map { it.toByte() }?.toByteArray()
        if (bytes == null || bytes.isEmpty()) {
            result.error("USB_EMPTY_PRINT_JOB", "There are no bytes to print.", null)
            return
        }

        Thread {
            try {
                synchronized(connectionLock) {
                    val activeConnection = connection
                        ?: throw IllegalStateException("Connect a USB printer first.")
                    val activeEndpoint = outputEndpoint
                        ?: throw IllegalStateException("The USB printer output is not ready.")
                    var offset = 0
                    while (offset < bytes.size) {
                        val length = minOf(16 * 1024, bytes.size - offset)
                        val written = activeConnection.bulkTransfer(
                            activeEndpoint,
                            bytes,
                            offset,
                            length,
                            6000,
                        )
                        if (written <= 0) {
                            throw IOException("The USB printer did not accept the print data.")
                        }
                        offset += written
                    }
                }
                activity.runOnUiThread { result.success(true) }
            } catch (error: IOException) {
                activity.runOnUiThread {
                    result.error("USB_WRITE_FAILED", error.message, null)
                }
            } catch (error: IllegalStateException) {
                activity.runOnUiThread {
                    result.error("USB_NOT_CONNECTED", error.message, null)
                }
            } catch (error: Exception) {
                activity.runOnUiThread {
                    result.error("USB_WRITE_FAILED", error.message, null)
                }
            }
        }.start()
    }

    private fun closeConnection() {
        synchronized(connectionLock) {
            connection?.let { activeConnection ->
                printerInterface?.let(activeConnection::releaseInterface)
                activeConnection.close()
            }
            connection = null
            printerInterface = null
            outputEndpoint = null
            connectedDeviceId = null
        }
    }

    @Suppress("DEPRECATION")
    private fun Intent.usbDevice(): UsbDevice? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }
}
