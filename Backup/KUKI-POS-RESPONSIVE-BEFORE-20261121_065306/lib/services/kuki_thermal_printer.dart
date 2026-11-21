import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

enum KukiPrinterTransport { bluetooth, usb }

class KukiPrinterException implements Exception {
  const KukiPrinterException(this.message);
  final String message;

  @override
  String toString() => message;
}

class KukiPrinterErrors {
  const KukiPrinterErrors._();

  static String messageFor(Object error) {
    if (error is KukiPrinterException) return error.message;
    if (error is TimeoutException) {
      return 'Koneksi printer waktu habis. Periksa printer, izin Bluetooth, kabel OTG, dan daya printer.';
    }
    if (error is PlatformException) {
      switch (error.code) {
        case 'USB_DEVICE_NOT_FOUND':
          return 'Printer USB tidak terdeteksi. Colokkan kabel OTG data dan nyalakan printer.';
        case 'USB_PERMISSION_DENIED':
          return 'Izin USB printer ditolak. Setujui izin saat aplikasi meminta.';
        case 'USB_PRINTER_UNSUPPORTED':
          return 'Perangkat USB tidak memiliki endpoint cetak ESC/POS yang didukung.';
        case 'USB_OPEN_FAILED':
          return 'Gagal membuka koneksi USB printer. Cabut dan pasang kembali printer.';
        case 'USB_BUSY':
          return 'Proses koneksi USB masih berjalan. Tunggu hingga selesai.';
        case 'USB_CONNECTION_CANCELLED':
          return 'Koneksi USB dibatalkan. Coba lagi dari pengaturan printer.';
        case 'USB_EMPTY_PRINT_JOB':
          return 'Data struk kosong. Tidak ada yang dikirim ke printer.';
        case 'USB_WRITE_FAILED':
          return 'Gagal mengirim data ke printer USB. Periksa kabel dan daya printer.';
        case 'USB_NOT_CONNECTED':
          return 'Printer USB terputus. Hubungkan kembali dari pengaturan printer.';
      }
      return error.message?.isNotEmpty == true
          ? 'Printer: ${error.message}'
          : 'Gagal menghubungi printer (${error.code}).';
    }
    final text = error.toString().replaceFirst('Exception: ', '').replaceFirst('Bad state: ', '');
    return 'Printer: $text';
  }
}

class KukiUsbPrinter {
  const KukiUsbPrinter({
    required this.name,
    required this.deviceId,
    required this.vendorId,
    required this.productId,
  });

  final String name;
  final int deviceId;
  final int vendorId;
  final int productId;

  factory KukiUsbPrinter.fromMap(Map<dynamic, dynamic> json) {
    int toInt(dynamic value) => value is num
        ? value.toInt()
        : int.tryParse(value?.toString() ?? '') ?? 0;
    return KukiUsbPrinter(
      name: json['name']?.toString() ?? 'Printer USB',
      deviceId: toInt(json['deviceId']),
      vendorId: toInt(json['vendorId']),
      productId: toInt(json['productId']),
    );
  }
}

/// Satu koneksi aktif untuk seluruh POS: halaman pengaturan, checkout, dan
/// cetak ulang memakai jalur koneksi dan pengiriman data yang sama.
class KukiThermalPrinter {
  KukiThermalPrinter._();
  static final instance = KukiThermalPrinter._();

  static const MethodChannel _usb = MethodChannel('kuki/usb_thermal_printer');
  KukiPrinterTransport? transport;
  String? bluetoothAddress;
  int? usbDeviceId;
  String? printerName;
  int paperWidthMm = 58;

  Future<T> _guard<T>(String action, Future<T> Function() body) async {
    try {
      return await body();
    } on KukiPrinterException {
      rethrow;
    } on TimeoutException {
      throw KukiPrinterException(
        '$action waktu habis. Periksa printer, izin Bluetooth, kabel OTG, dan daya printer.',
      );
    } on PlatformException catch (error) {
      throw KukiPrinterException('$action: ${KukiPrinterErrors.messageFor(error)}');
    } catch (error) {
      throw KukiPrinterException('$action: ${KukiPrinterErrors.messageFor(error)}');
    }
  }

  Future<List<BluetoothInfo>> pairedBluetoothPrinters() => _guard('Mencari Bluetooth', () async {
    if (!await PrintBluetoothThermal.bluetoothEnabled) {
      throw const KukiPrinterException('Bluetooth HP belum aktif. Aktifkan Bluetooth terlebih dahulu.');
    }
    if (!await PrintBluetoothThermal.isPermissionBluetoothGranted) {
      throw const KukiPrinterException('Izin Perangkat di sekitar belum diberikan. Setujui izin Bluetooth.');
    }
    return PrintBluetoothThermal.pairedBluetooths.timeout(
      const Duration(seconds: 15),
    );
  });

  Future<List<KukiUsbPrinter>> usbPrinters() => _guard('Mencari USB OTG', () async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      throw const KukiPrinterException('USB OTG hanya tersedia pada Android.');
    }
    final raw = await _usb.invokeListMethod<dynamic>('listUsbPrinters');
    return (raw ?? [])
        .map((item) => KukiUsbPrinter.fromMap(item as Map))
        .toList(growable: false);
  });

  Future<void> connectBluetooth(BluetoothInfo printer) => _guard('Koneksi Bluetooth', () async {
    final ok = await PrintBluetoothThermal.connect(
      macPrinterAddress: printer.macAdress,
    ).timeout(const Duration(seconds: 20));
    if (!ok) {
      throw KukiPrinterException('Bluetooth gagal tersambung ke ${printer.name}.');
    }
    transport = KukiPrinterTransport.bluetooth;
    bluetoothAddress = printer.macAdress;
    usbDeviceId = null;
    printerName = printer.name;
  });

  Future<void> connectUsb(KukiUsbPrinter printer) => _guard('Koneksi USB', () async {
    if (printer.deviceId <= 0) {
      throw const KukiPrinterException('Data perangkat USB tidak lengkap. Cari ulang printer USB.');
    }
    final ok = await _usb.invokeMethod<bool>('connectUsbPrinter', {
      'deviceId': printer.deviceId,
    }).timeout(const Duration(seconds: 25));
    if (ok != true) {
      throw KukiPrinterException('USB gagal tersambung ke ${printer.name}.');
    }
    transport = KukiPrinterTransport.usb;
    usbDeviceId = printer.deviceId;
    bluetoothAddress = null;
    printerName = printer.name;
  });

  Future<bool> isUsbConnected() => _guard('Cek USB', () async {
    if (usbDeviceId == null) return false;
    final raw = await _usb.invokeMethod<bool>('isUsbPrinterConnected');
    return raw ?? false;
  });

  Future<void> ensureConnected() => _guard('Cek printer', () async {
    if (transport == KukiPrinterTransport.usb) {
      if (usbDeviceId == null || !await isUsbConnected()) {
        throw const KukiPrinterException(
          'Printer USB tidak terhubung. Hubungkan kembali dari pengaturan printer.',
        );
      }
      return;
    }
    if (transport == KukiPrinterTransport.bluetooth) {
      if (!await PrintBluetoothThermal.connectionStatus) {
        throw const KukiPrinterException(
          'Printer Bluetooth terputus. Hubungkan kembali dari pengaturan printer.',
        );
      }
      return;
    }
    throw const KukiPrinterException(
      'Belum ada printer dipilih. Buka ikon printer di kanan atas untuk memilih Bluetooth atau USB.',
    );
  });

  Future<void> write(List<int> bytes) => _guard('Mencetak', () async {
    await ensureConnected();
    if (bytes.isEmpty) {
      throw const KukiPrinterException('Data struk kosong. Tidak ada yang dikirim ke printer.');
    }
    if (transport == KukiPrinterTransport.usb) {
      final ok = await _usb.invokeMethod<bool>('writeUsbPrinterBytes', {
        'bytes': Uint8List.fromList(bytes),
      }).timeout(const Duration(seconds: 45));
      if (ok != true) {
        throw const KukiPrinterException('Gagal mengirim data ke printer USB.');
      }
      return;
    }
    final ok = await PrintBluetoothThermal.writeBytes(bytes)
        .timeout(const Duration(seconds: 35));
    if (!ok) {
      throw const KukiPrinterException('Gagal mengirim data ke printer Bluetooth.');
    }
  });

  Future<void> disconnect() => _guard('Memutus printer', () async {
    if (transport == KukiPrinterTransport.usb) {
      await _usb.invokeMethod<void>('disconnectUsbPrinter');
    } else if (transport == KukiPrinterTransport.bluetooth) {
      await PrintBluetoothThermal.disconnect;
    }
    transport = null;
    usbDeviceId = null;
    bluetoothAddress = null;
    printerName = null;
  });
}
