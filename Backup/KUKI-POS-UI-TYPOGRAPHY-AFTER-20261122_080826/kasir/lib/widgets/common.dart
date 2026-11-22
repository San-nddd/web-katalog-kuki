import 'package:flutter/material.dart';
import '../core/theme.dart';

class SectionLabel extends StatelessWidget {
  final String title;
  final String? caption;
  const SectionLabel(this.title, {super.key, this.caption});
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: KukiText.section),
      if (caption != null) ...[
        SizedBox(height: KukiSpace.tight(context) / 2),
        Text(caption!, style: KukiText.bodySmall),
      ],
    ],
  );
}

void showError(BuildContext context, Object error) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(error.toString()),
      backgroundColor: KukiColors.danger,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
      ),
    ),
  );
}

Future<int?> askAmount(BuildContext context, {required String title, String initial = '0', bool allowZero = true}) async {
  var typedAmount = initial;
  final result = await showDialog<int>(
    context: context,
    builder: (ctx) => AlertDialog(
      scrollable: true,
      title: Text(title, style: KukiText.headlineSmall),
      contentPadding: EdgeInsets.fromLTRB(
        KukiSpace.loose(ctx),
        KukiSpace.tight(ctx),
        KukiSpace.loose(ctx),
        KukiSpace.loose(ctx),
      ),
      content: SizedBox(
        width: KukiSpace.width(ctx, 34, min: 260, max: 420),
        child: TextFormField(
          initialValue: initial,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Jumlah (rupiah)'),
          onChanged: (value) => typedAmount = value,
          onFieldSubmitted: (input) {
            final value = int.tryParse(input);
            if (value != null && (allowZero ? value >= 0 : value > 0)) Navigator.pop(ctx, value);
          },
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
        FilledButton(onPressed: () {
          final value = int.tryParse(typedAmount);
          if (value != null && (allowZero ? value >= 0 : value > 0)) Navigator.pop(ctx, value);
        }, child: const Text('Simpan')),
      ],
    ),
  );
  return result;
}
