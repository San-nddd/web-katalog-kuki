import 'package:flutter/material.dart';

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
