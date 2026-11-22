import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kuki_pos/services/network_connectivity.dart';

class FakeConnectivity implements Connectivity {
  final StreamController<List<ConnectivityResult>> controller =
      StreamController<List<ConnectivityResult>>.broadcast();
  List<ConnectivityResult> current = [ConnectivityResult.none];

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      controller.stream;

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async => current;
}

void main() {
  test(
    'memetakan jaringan terputus dan tersambung dari status platform',
    () async {
      final platform = FakeConnectivity();
      final network = NetworkConnectivity(connectivity: platform);
      addTearDown(platform.controller.close);

      expect(await network.isConnected, isFalse);

      final changes = network.changes.take(2).toList();
      platform.controller.add([ConnectivityResult.none]);
      platform.controller.add([
        ConnectivityResult.wifi,
        ConnectivityResult.mobile,
      ]);

      expect(await changes, [false, true]);
    },
  );
}
