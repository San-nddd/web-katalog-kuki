import 'package:flutter/material.dart';
import 'api_client.dart';
import 'login_page.dart';
import 'models.dart';
import 'receipt.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});
  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  bool loading = true;
  String? error;
  int page = 1, lastPage = 1, total = 0;
  List<PosReceipt> items = [];
  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await ApiClient.instance.history(page: page);
      if (mounted) {
        setState(() {
          items = (result['items'] as List? ?? [])
              .map((e) => PosReceipt(e))
              .toList();
          lastPage = asInt(result['last_page']);
          total = asInt(result['total']);
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> open(PosReceipt tx) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tx.number),
        content: SizedBox(
          width: 430,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kasir: ${tx.cashier}'),
                Text('Pelanggan: ${tx.customer}'),
                Text(tx.date),
                const Divider(),
                ...tx.items.map(
                  (line) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text('${line['nama']} ×${line['jumlah']}'),
                        ),
                        Text(rupiah(asInt(line['total']))),
                      ],
                    ),
                  ),
                ),
                const Divider(),
                Text(
                  'TOTAL: ${rupiah(tx.total)}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                Text('Metode: ${tx.method.toUpperCase()}'),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup'),
          ),
          FilledButton.icon(
            onPressed: () async {
              try {
                await printReceipt(tx);
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(
                    ctx,
                  ).showSnackBar(SnackBar(content: Text('$e')));
                }
              }
            },
            icon: const Icon(Icons.print),
            label: const Text('Cetak Ulang'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(18),
    child: Card(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                const Text(
                  'Riwayat Transaksi',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: kukiNavy,
                  ),
                ),
                const Spacer(),
                Text('$total transaksi'),
                IconButton(onPressed: refresh, icon: const Icon(Icons.refresh)),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                ? Center(child: Text(error!))
                : items.isEmpty
                ? const Center(child: Text('Belum ada transaksi'))
                : ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (ctx, i) {
                      final tx = items[i];
                      return ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.receipt_long),
                        ),
                        title: Text(tx.number),
                        subtitle: Text(
                          '${tx.cashier} • ${tx.date} • ${tx.method.toUpperCase()}',
                        ),
                        trailing: Text(
                          rupiah(tx.total),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        onTap: () => open(tx),
                      );
                    },
                  ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: page > 1
                    ? () {
                        page--;
                        refresh();
                      }
                    : null,
                icon: const Icon(Icons.chevron_left),
              ),
              Text('Halaman $page / ${lastPage < 1 ? 1 : lastPage}'),
              IconButton(
                onPressed: page < lastPage
                    ? () {
                        page++;
                        refresh();
                      }
                    : null,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
