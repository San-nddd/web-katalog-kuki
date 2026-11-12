import 'package:connectivity_plus/connectivity_plus.dart';

class NetworkConnectivity {
  final Connectivity _connectivity;

  NetworkConnectivity({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity();

  Future<bool> get isConnected async =>
      _isConnected(await _connectivity.checkConnectivity());

  Stream<bool> get changes =>
      _connectivity.onConnectivityChanged.map(_isConnected).distinct();

  static bool _isConnected(List<ConnectivityResult> results) =>
      results.any((result) => result != ConnectivityResult.none);
}
