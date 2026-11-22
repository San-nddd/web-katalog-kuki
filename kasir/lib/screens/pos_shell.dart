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
          resizeToAvoidBottomInset: true,
          drawer: Drawer(
            width: KukiSpace.width(context, 19, min: 200, max: 300),
            backgroundColor: KukiColors.paper,
            child: _sidebar(context, ctrl, inDrawer: true),
          ),
          body: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        height: KukiSpace.height(context, 8, min: 56, max: 76),
                        padding: KukiSpace.symmetric(
                          context,
                          horizontalPercent: 1.7,
                          verticalPercent: 0,
                          min: 10,
                          max: 28,
                        ),
                        decoration: const BoxDecoration(
                          color: KukiColors.paper,
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
                            SizedBox(width: KukiSpace.tight(context)),
                            Flexible(
                              child: Text(
                                titles[selected],
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: KukiText.headlineMedium,
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
                            SizedBox(width: KukiSpace.normal(context)),
                            if (constraints.maxWidth >= 900)
                              Flexible(
                                child: Text(
                                  DateFormat(
                                    'dd MMM yyyy',
                                  ).format(DateTime.now()),
                                  maxLines: 1,
                                 overflow: TextOverflow.ellipsis,
                                 style: KukiText.bodySmall,
                               ),
                              ),
                            SizedBox(width: KukiSpace.tight(context)),
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
                            Flexible(
                              child: Text(
                                '${ctrl.pending} tertunda · ${ctrl.unresolved} belum selesai',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                 style: KukiText.bodySmall,
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

  Widget _sidebar(BuildContext context, PosController ctrl,
          {bool inDrawer = false}) =>
      Container(
    color: KukiColors.paper,
    padding: EdgeInsets.fromLTRB(
      KukiSpace.normal(context),
      KukiSpace.loose(context),
      KukiSpace.normal(context),
      KukiSpace.normal(context),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: KukiSpace.tight(context)),
          child: Row(
            children: [
              Image.asset(
                'assets/branding/Mascot.png',
                width: KukiSpace.width(context, 3.1, min: 36, max: 48),
                height: KukiSpace.height(context, 5, min: 36, max: 52),
                fit: BoxFit.contain,
              ),
              SizedBox(width: KukiSpace.tight(context)),
              const Expanded(
                child: Text('KUKI', style: KukiText.displaySmall),
              ),
            ],
          ),
        ),
        SizedBox(height: KukiSpace.loose(context)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: KukiSpace.tight(context)),
          child: Text(
            'KASIR AKTIF',
            style: KukiText.labelSmall.copyWith(letterSpacing: 1.4),
          ),
        ),
        SizedBox(height: KukiSpace.tight(context)),
        Container(
          padding: EdgeInsets.symmetric(
            horizontal: KukiSpace.tight(context),
            vertical: KukiSpace.height(context, 1.4, min: 8, max: 14),
          ),
          decoration: BoxDecoration(
            color: KukiColors.cream,
            borderRadius: BorderRadius.circular(KukiRadius.md),
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
                  style: KukiText.titleSmall,
                ),
              ),
              SizedBox(width: KukiSpace.tight(context)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ctrl.cashierName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: KukiText.titleSmall,
                    ),
                    Text(
                      ctrl.shiftOpen
                          ? 'Shift sedang aktif'
                          : 'Shift belum dibuka',
                      style: KukiText.labelSmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: KukiSpace.loose(context)),
        Padding(
          padding: EdgeInsets.only(
            left: KukiSpace.normal(context),
            bottom: KukiSpace.tight(context),
          ),
          child: Text(
            'MENU',
            style: KukiText.labelSmall.copyWith(letterSpacing: 1.4),
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
                  borderRadius: BorderRadius.circular(KukiRadius.sm),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(KukiRadius.sm),
                    onTap: () => navigate(index, closeDrawer: inDrawer),
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: KukiSpace.normal(context),
                        vertical: KukiSpace.normal(context),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            icons[index],
                            size: 19,
                            color: active ? KukiColors.cream : KukiColors.muted,
                          ),
                          SizedBox(width: KukiSpace.normal(context)),
                          Expanded(
                            child: Text(
                              titles[index],
                              style: KukiText.labelLarge.copyWith(
                                color: active
                                    ? KukiColors.cream
                                    : KukiColors.muted,
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
          padding: EdgeInsets.only(
            left: KukiSpace.tight(context),
            top: KukiSpace.tight(context),
            bottom: KukiSpace.tight(context),
          ),
          child: Text(
            'Where Crumbs Become Art',
            style: KukiText.labelSmall,
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
    padding: EdgeInsets.symmetric(
      horizontal: KukiSpace.tight(context),
      vertical: KukiSpace.height(context, 0.8, min: 5, max: 9),
    ),
    decoration: BoxDecoration(
      color: color,
      border: Border.all(color: KukiColors.line),
      borderRadius: BorderRadius.circular(KukiRadius.pill),
    ),
    child: Text(
      text,
      style: KukiText.labelSmall.copyWith(color: KukiColors.cocoa),
    ),
  );
}
