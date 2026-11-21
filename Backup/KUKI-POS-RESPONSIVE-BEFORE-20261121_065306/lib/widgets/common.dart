import 'package:flutter/material.dart';
import '../core/theme.dart';

class SectionLabel extends StatelessWidget {
  final String title;
  final String? caption;
  const SectionLabel(this.title, {super.key, this.caption});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start,
    children: [Text(title, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
      if (caption != null) Text(caption!, style: const TextStyle(color: KukiColors.muted))]);
}

void showError(BuildContext context, Object error) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()), backgroundColor: Colors.red.shade800));
}

Future<int?> askAmount(BuildContext context, {required String title, String initial = '0', bool allowZero = true}) async {
  var typedAmount = initial;
  final result = await showDialog<int>(context: context, builder: (ctx) => AlertDialog(
    title: Text(title),
    content: TextFormField(initialValue: initial, autofocus: true, keyboardType: TextInputType.number,
      decoration: const InputDecoration(labelText: 'Jumlah (rupiah)'),
      onChanged: (value) => typedAmount = value,
      onFieldSubmitted: (input) {
        final value = int.tryParse(input);
        if (value != null && (allowZero ? value >= 0 : value > 0)) Navigator.pop(ctx, value);
      }),
    actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
      FilledButton(onPressed: () {
        final value = int.tryParse(typedAmount);
        if (value != null && (allowZero ? value >= 0 : value > 0)) Navigator.pop(ctx, value);
      }, child: const Text('Simpan'))],
  ));
  return result;
}
