import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../state/pos_controller.dart';
import 'register_screen.dart';
import 'inventory_screen.dart';
import 'history_screen.dart';
import 'shift_screen.dart';
import 'report_screen.dart';
import 'settings_screen.dart';

class PosShell extends StatefulWidget {
  final PosController controller;
  const PosShell({super.key, required this.controller});

  @override
  State<PosShell> createState() => _PosShellState();
}

class _PosShellState extends State<PosShell> {
  int selected = 0;
  static const titles = [
    'Kasir',
    'Riwayat',
    'Laporan',
    'Stok Produk',
    'Shift Kasir',
    'Pengaturan',
  ];
  static const icons = [
    Icons.point_of_sale_outlined,
    Icons.receipt_long_outlined,
    Icons.bar_chart_outlined,
    Icons.inventory_2_outlined,
    Icons.schedule_outlined,
    Icons.settings_outlined,
  ];

  void navigate(int index, {bool closeDrawer = false}) {
    if (closeDrawer) Navigator.of(context).pop();
    if (!mounted || selected == index) return;
    setState(() => selected = index);
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = widget.controller;
    final pages = [
      RegisterScreen(controller: ctrl),
      HistoryScreen(controller: ctrl),
      ReportScreen(controller: ctrl),
      InventoryScreen(controller: ctrl),
      ShiftScreen(controller: ctrl),
      SettingsScreen(controller: ctrl),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        return Scaffold(
          drawer: Drawer(
            width: 240,
            backgroundColor: KukiColors.paper,
            child: _sidebar(ctrl, inDrawer: true),
          ),
          body: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        height: 66,
                        padding: const EdgeInsets.symmetric(horizontal: 22),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          border: Border(
                            bottom: BorderSide(color: KukiColors.line),
                          ),
                        ),
                        child: Row(
                          children: [
                            Builder(
                              builder: (ctx) => IconButton(
                                icon: const Icon(Icons.menu_rounded),
                                tooltip: 'Buka menu',
                                onPressed: () => Scaffold.of(ctx).openDrawer(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                titles[selected],
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: KukiColors.cocoa,
                                ),
                              ),
                            ),
                            if (ctrl.demo)
                              const _StatusTag('DEMO', KukiColors.peach),
                            if (!ctrl.demo)
                              _StatusTag(
                                ctrl.serverReachable == null
                                    ? 'CEK SERVER'
                                    : ctrl.serverReachable!
                                    ? 'ONLINE'
                                    : 'SERVER OFFLINE',
                                ctrl.serverReachable == true
                                    ? KukiColors.cream
                                    : KukiColors.peach,
                              ),
                            const SizedBox(width: 12),
                            if (constraints.maxWidth >= 760)
                              Text(
                                DateFormat(
                                  'dd MMM yyyy',
                                ).format(DateTime.now()),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: KukiColors.muted,
                                ),
                              ),
                            const SizedBox(width: 10),
                            IconButton(
                              tooltip: 'Sinkronisasi transaksi',
                              onPressed: ctrl.demo || ctrl.syncing
                                  ? null
                                  : () => ctrl.syncPending(),
                              icon: ctrl.syncing
                                  ? const SizedBox(
                                      width: 19,
                                      height: 19,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.sync_rounded),
                            ),
                            Text(
                              '${ctrl.pending} tertunda',
                              style: const TextStyle(
                                color: KukiColors.muted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(child: pages[selected]),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _sidebar(PosController ctrl, {bool inDrawer = false}) => Container(
    color: KukiColors.paper,
    padding: const EdgeInsets.fromLTRB(12, 22, 12, 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            children: [
              Image.asset(
                'assets/branding/Mascot.png',
                width: 40,
                height: 40,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'KUKI',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: KukiColors.cocoa,
                    letterSpacing: .4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 26),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            'KASIR AKTIF',
            style: TextStyle(
              color: KukiColors.muted.withValues(alpha: .85),
              fontSize: 10,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 9),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
          decoration: BoxDecoration(
            color: KukiColors.paper,
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: KukiColors.line),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: KukiColors.peach,
                child: Text(
                  ctrl.cashierName.isEmpty
                      ? 'K'
                      : ctrl.cashierName[0].toUpperCase(),
                  style: const TextStyle(
                    color: KukiColors.cocoa,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ctrl.cashierName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      ctrl.shiftOpen
                          ? 'Shift sedang aktif'
                          : 'Shift belum dibuka',
                      style: const TextStyle(
                        color: KukiColors.muted,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 23),
        const Padding(
          padding: EdgeInsets.only(left: 12, bottom: 10),
          child: Text(
            'MENU',
            style: TextStyle(
              color: KukiColors.muted,
              fontSize: 10,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: titles.length,
            itemBuilder: (_, index) {
              final active = index == selected;
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Material(
                  color: active ? KukiColors.cocoa : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () => navigate(index, closeDrawer: inDrawer),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            icons[index],
                            size: 19,
                            color: active ? Colors.white : KukiColors.muted,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              titles[index],
                              style: TextStyle(
                                fontSize: 13,
                                color: active ? Colors.white : KukiColors.cocoa,
                                fontWeight: active
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const Divider(color: KukiColors.line),
        Padding(
          padding: const EdgeInsets.only(left: 8, top: 8, bottom: 8),
          child: Text(
            'Where Crumbs Become Art',
            style: TextStyle(
              fontSize: 11,
              color: KukiColors.muted.withValues(alpha: .85),
            ),
          ),
        ),
      ],
    ),
  );
}

class _StatusTag extends StatelessWidget {
  final String text;
  final Color color;
  const _StatusTag(this.text, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(7),
    ),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: KukiColors.cocoa,
      ),
    ),
  );
}
