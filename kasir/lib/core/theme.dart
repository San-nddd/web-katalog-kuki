import 'package:flutter/material.dart';

class KukiSpace {
  const KukiSpace._();

  static double width(
    BuildContext context,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) => (MediaQuery.sizeOf(context).width * percent / 100)
      .clamp(min, max)
      .toDouble();

  static double height(
    BuildContext context,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) => (MediaQuery.sizeOf(context).height * percent / 100)
      .clamp(min, max)
      .toDouble();

  static double of(
    double total,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) => (total * percent / 100).clamp(min, max).toDouble();

  static double tight(BuildContext context) =>
      width(context, 0.6, min: 5, max: 10);

  static double normal(BuildContext context) =>
      width(context, 0.9, min: 8, max: 16);

  static double loose(BuildContext context) =>
      width(context, 1.4, min: 12, max: 24);

  static double section(BuildContext context) =>
      width(context, 2, min: 16, max: 32);

  static EdgeInsets all(
    BuildContext context, {
    double percent = 1.5,
    double min = 12,
    double max = 32,
  }) => EdgeInsets.all(width(context, percent, min: min, max: max));

  static EdgeInsets symmetric(
    BuildContext context, {
    double horizontalPercent = 1.5,
    double verticalPercent = 1.5,
    double min = 8,
    double max = 32,
  }) => EdgeInsets.symmetric(
    horizontal: width(context, horizontalPercent, min: min, max: max),
    vertical: height(context, verticalPercent, min: min, max: max),
  );
}

class KukiColors {
  static const cream = Color(0xFFFFF6D9);
  static const paper = Color(0xFFFFFDF4);
  static const cocoa = Color(0xFF180803);
  static const mocha = Color(0xFF6E2B1A);
  static const caramel = Color(0xFFF6A000);
  static const peach = Color(0xFFFAD296);
  static const line = Color(0xFFD8C7A8);
  static const muted = Color(0xFF7A6448);
}

ThemeData kukiTheme() => ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: KukiColors.cream,
  colorScheme: ColorScheme.fromSeed(
    seedColor: KukiColors.caramel,
    surface: KukiColors.paper,
    onSurface: KukiColors.cocoa,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: KukiColors.paper,
    foregroundColor: KukiColors.cocoa,
    centerTitle: false,
  ),
  cardTheme: CardThemeData(
    color: KukiColors.paper,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: KukiColors.line),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: KukiColors.paper,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: KukiColors.line),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: KukiColors.line),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: KukiColors.cocoa,
      foregroundColor: Colors.white,
      minimumSize: const Size(0, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  ),
);
