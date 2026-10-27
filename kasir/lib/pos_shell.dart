import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'api_client.dart';
import 'models.dart';
import 'login_page.dart';
import 'orders_page.dart';
import 'history_page.dart';
import 'report_page.dart';

class PosShell extends StatefulWidget {
  final VoidCallback onLogout;
  const PosShell({super.key, required this.onLogout});
  @override State<PosShell> createState() => _PosShellState();
}
class _PosShellState extends State<PosShell> {
  String page = 'Kasir';
  bool loading = true, shiftActive = false, busy = false;
  String? error;
  final List<LocalOrder> orders = [LocalOrder('Order 1', const Uuid().v4())];
  int activeOrder = 0;

  @override void initState() { super.initState(); refreshShift(); }
  Future<void> refreshShift() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.instance.shift();
      if(mounted) setState(() => shiftActive = data['active'] != null);
    } catch (e) { if(mounted) setState(() => error = '$e'); }
    finally { if(mounted) setState(() => loading = false); }
  }
  Future<void> changeShift(bool start) async {
    if(busy) return;
    setState(() { busy = true; error = null; });
    try {
      if(start) { await ApiClient.instance.startShift(); }
      else { await ApiClient.instance.endShift(); }
      await refreshShift();
    } catch(e) { if(mounted) setState(() => error = '$e'); }
    finally { if(mounted) setState(() => busy = false); }
  }
  Future<void> logout() async {
    if(shiftActive) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Akhiri shift terlebih dahulu sebelum logout.')));
      return;
    }
    try { await ApiClient.instance.logout(); widget.onLogout(); }
    catch (e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
  }
  void newOrder() {
    setState(() { orders.add(LocalOrder('Order ${orders.length+1}', const Uuid().v4())); activeOrder = orders.length-1; });
  }
  void doneOrder(PosReceipt receipt) {
    setState(() {
      orders.removeAt(activeOrder);
      if (orders.isEmpty) orders.add(LocalOrder('Order 1', const Uuid().v4()));
      activeOrder = activeOrder.clamp(0, orders.length-1).toInt();
    });
  }
  @override Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 850;
    final content = loading ? const Center(child: CircularProgressIndicator())
      : error != null ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.wifi_off, size: 46, color: Colors.orange),
          const SizedBox(height: 10), Text(error!, textAlign: TextAlign.center),
          FilledButton(onPressed: refreshShift, child: const Text('Coba lagi'))]))
      : !shiftActive ? Center(child: Card(child: Padding(padding: const EdgeInsets.all(35),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.access_time_filled_rounded, color: kukiOrange, size: 52),
            const SizedBox(height: 13), const Text('Mulai Shift Kasir',
              style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8), Text('Halo, ${ApiClient.instance.staffName ?? '-'}'),
            const SizedBox(height: 18), FilledButton.icon(
              onPressed: busy ? null : () => changeShift(true),
              icon: const Icon(Icons.play_arrow), label: const Text('Mulai Shift')),
          ]))))
      : switch (page) {
        'Riwayat' => const HistoryPage(),
        'Laporan' => const ReportPage(),
        _ => OrdersPage(orders: orders, active: activeOrder, onTab: (i) => setState(() => activeOrder = i),
            onNew: newOrder, onChanged: () => setState(() {}), onPaid: doneOrder),
      };
    final menu = Container(width: 205, color: Colors.white, child: Column(children: [
      const SizedBox(height: 22),
      Image.asset('assets/branding/kuki_logo.png', height: 72),
      const SizedBox(height: 8), const Text('Kuki POS', style: TextStyle(color: kukiNavy, fontSize: 19, fontWeight: FontWeight.w800)),
      const Divider(height: 30),
      ListTile(leading: const Icon(Icons.person_outline), title: Text(ApiClient.instance.staffName ?? 'Kasir'),
        subtitle: Text(ApiClient.instance.staffCode ?? '')),
      const Divider(),
      ...['Kasir','Riwayat','Laporan'].map((name) {
        final icon = switch(name) { 'Kasir' => Icons.point_of_sale, 'Riwayat' => Icons.history,
            _ => Icons.bar_chart_rounded };
        return Padding(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          child: ListTile(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: page == name ? kukiOrange : null,
            textColor: page == name ? Colors.white : kukiNavy,
            iconColor: page == name ? Colors.white : kukiNavy,
            leading: Icon(icon), title: Text(name),
            onTap: () { setState(() => page = name); if (compact) Navigator.maybePop(context); }));
      }),
      const Spacer(),
      ListTile(leading: const Icon(Icons.access_time), title: Text(shiftActive ? 'Akhiri Shift' : 'Shift Belum Aktif'),
        onTap: shiftActive && !busy ? () async {
          final yes = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
            title: const Text('Akhiri shift?'), content: const Text('Pastikan semua pesanan sudah diselesaikan.'),
            actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Akhiri'))]));
          if(yes == true) await changeShift(false);
        } : null),
      ListTile(leading: const Icon(Icons.logout), title: const Text('Keluar'), onTap: logout),
      const SizedBox(height: 15),
    ]));
    return Scaffold(
      appBar: compact ? AppBar(title: const Text('Kuki POS'), backgroundColor: Colors.white) : null,
      drawer: compact ? Drawer(child: menu) : null,
      body: Row(children: [if (!compact) menu, Expanded(child: Column(children: [
        Container(height: 60, color: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [Text(page, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
            const Spacer(), if(shiftActive) const Chip(avatar: Icon(Icons.circle, size: 9, color: Colors.green),
              label: Text('Shift aktif')), const SizedBox(width: 8),
            IconButton(onPressed: refreshShift, tooltip: 'Refresh shift', icon: const Icon(Icons.refresh))])),
        Expanded(child: content),
      ]))]));
  }
}
