import 'package:flutter/material.dart';

class KukiFonts {
  const KukiFonts._();

  static const String body = 'DM Sans';
  static const String display = 'Lilita One';
}

class KukiRadius {
  const KukiRadius._();

  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 24;
  static const double pill = 999;
}

class KukiText {
  const KukiText._();

  static const TextStyle displayLarge = TextStyle(
    fontFamily: KukiFonts.display,
    fontSize: 40,
    height: 1.05,
    letterSpacing: 0.3,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle displayMedium = TextStyle(
    fontFamily: KukiFonts.display,
    fontSize: 32,
    height: 1.05,
    letterSpacing: 0.3,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle displaySmall = TextStyle(
    fontFamily: KukiFonts.display,
    fontSize: 25,
    height: 1.1,
    letterSpacing: 0.2,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle headlineLarge = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 26,
    height: 1.2,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 22,
    height: 1.25,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle headlineSmall = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 19,
    height: 1.3,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle titleLarge = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 20,
    height: 1.25,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 16,
    height: 1.35,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle titleSmall = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 14,
    height: 1.4,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 16,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 14,
    height: 1.45,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 12,
    height: 1.45,
    fontWeight: FontWeight.w400,
    color: KukiColors.muted,
  );

  static const TextStyle labelLarge = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 14,
    height: 1.3,
    fontWeight: FontWeight.w700,
    color: KukiColors.cocoa,
  );

  static const TextStyle labelMedium = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 12,
    height: 1.3,
    fontWeight: FontWeight.w500,
    color: KukiColors.cocoa,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 11,
    height: 1.3,
    fontWeight: FontWeight.w500,
    color: KukiColors.muted,
  );

  static const TextStyle section = TextStyle(
    fontFamily: KukiFonts.display,
    fontSize: 19,
    height: 1.1,
    letterSpacing: 0.2,
    fontWeight: FontWeight.w400,
    color: KukiColors.cocoa,
  );

  static const TextStyle amount = TextStyle(
    fontFamily: KukiFonts.display,
    fontSize: 27,
    height: 1.1,
    letterSpacing: 0.2,
    fontWeight: FontWeight.w400,
    color: KukiColors.mocha,
  );

  static const TextStyle onDark = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 14,
    height: 1.45,
    fontWeight: FontWeight.w400,
    color: KukiColors.cream,
  );

  static const TextStyle captionOnDark = TextStyle(
    fontFamily: KukiFonts.body,
    fontSize: 12,
    height: 1.4,
    fontWeight: FontWeight.w400,
    color: KukiColors.peach,
  );
}

class KukiSpace {
  const KukiSpace._();

  static double width(
    BuildContext context,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) =>
      (MediaQuery.sizeOf(context).width * percent / 100)
          .clamp(min, max)
          .toDouble();

  static double height(
    BuildContext context,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) =>
      (MediaQuery.sizeOf(context).height * percent / 100)
          .clamp(min, max)
          .toDouble();

  static double of(
    double total,
    double percent, {
    double min = 0,
    double max = double.infinity,
  }) =>
      (total * percent / 100).clamp(min, max).toDouble();

  static double tight(BuildContext context) =>
      width(context, 0.6, min: 6, max: 10);

  static double normal(BuildContext context) =>
      width(context, 0.9, min: 10, max: 16);

  static double loose(BuildContext context) =>
      width(context, 1.4, min: 14, max: 24);

  static double section(BuildContext context) =>
      width(context, 2, min: 18, max: 32);

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
  const KukiColors._();

  static const cream = Color(0xFFFFF6D9);
  static const paper = Color(0xFFFFFDF4);
  static const cocoa = Color(0xFF180803);
  static const mocha = Color(0xFF6E2B1A);
  static const brownDeep = Color(0xFF4E1B0D);
  static const caramel = Color(0xFFF6A000);
  static const orangeDark = Color(0xFFD98A00);
  static const peach = Color(0xFFFAD296);
  static const line = Color(0xFFD8C7A8);
  static const muted = Color(0xFF7A6448);
  static const inkSoft = Color(0xFF594334);
  static const success = Color(0xFF376B48);
  static const successSurface = Color(0xFFEEF5E9);
  static const danger = Color(0xFFA63828);
  static const dangerSurface = Color(0xFFFBede9);
  static const barrier = Color(0x99180803);
}

ThemeData kukiTheme() {
  final scheme = ColorScheme.light(
    primary: KukiColors.caramel,
    onPrimary: KukiColors.cocoa,
    primaryContainer: KukiColors.peach,
    onPrimaryContainer: KukiColors.cocoa,
    secondary: KukiColors.mocha,
    onSecondary: KukiColors.cream,
    secondaryContainer: KukiColors.peach,
    onSecondaryContainer: KukiColors.cocoa,
    tertiary: KukiColors.orangeDark,
    onTertiary: KukiColors.paper,
    error: KukiColors.danger,
    onError: KukiColors.paper,
    surface: KukiColors.paper,
    onSurface: KukiColors.cocoa,
    surfaceContainerHighest: KukiColors.cream,
    onSurfaceVariant: KukiColors.muted,
    outline: KukiColors.line,
    outlineVariant: KukiColors.peach,
    shadow: KukiColors.cocoa,
    scrim: KukiColors.cocoa,
    inverseSurface: KukiColors.cocoa,
    onInverseSurface: KukiColors.cream,
    inversePrimary: KukiColors.peach,
  );
  final border = BorderSide(color: KukiColors.line);
  final shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(KukiRadius.md),
    side: border,
  );
  final pill = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(KukiRadius.pill),
  );

  return ThemeData(
    useMaterial3: true,
    fontFamily: KukiFonts.body,
    colorScheme: scheme,
    scaffoldBackgroundColor: KukiColors.cream,
    canvasColor: KukiColors.cream,
    textTheme: const TextTheme(
      displayLarge: KukiText.displayLarge,
      displayMedium: KukiText.displayMedium,
      displaySmall: KukiText.displaySmall,
      headlineLarge: KukiText.headlineLarge,
      headlineMedium: KukiText.headlineMedium,
      headlineSmall: KukiText.headlineSmall,
      titleLarge: KukiText.titleLarge,
      titleMedium: KukiText.titleMedium,
      titleSmall: KukiText.titleSmall,
      bodyLarge: KukiText.bodyLarge,
      bodyMedium: KukiText.bodyMedium,
      bodySmall: KukiText.bodySmall,
      labelLarge: KukiText.labelLarge,
      labelMedium: KukiText.labelMedium,
      labelSmall: KukiText.labelSmall,
    ),
    iconTheme: const IconThemeData(color: KukiColors.cocoa, size: 22),
    appBarTheme: AppBarTheme(
      backgroundColor: KukiColors.paper,
      foregroundColor: KukiColors.cocoa,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: KukiText.headlineMedium,
      iconTheme: const IconThemeData(color: KukiColors.cocoa, size: 22),
    ),
    cardTheme: CardThemeData(
      color: KukiColors.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: shape,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: KukiColors.paper,
      labelStyle: KukiText.labelMedium,
      hintStyle: KukiText.labelSmall,
      floatingLabelStyle: KukiText.labelMedium.copyWith(
        color: KukiColors.brownDeep,
      ),
      helperStyle: KukiText.labelSmall,
      errorStyle: KukiText.labelSmall.copyWith(color: KukiColors.danger),
      prefixIconColor: KukiColors.muted,
      suffixIconColor: KukiColors.muted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
        borderSide: border,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
        borderSide: border,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
        borderSide: const BorderSide(color: KukiColors.brownDeep, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
        borderSide: const BorderSide(color: KukiColors.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
        borderSide: const BorderSide(color: KukiColors.danger, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: KukiColors.caramel,
        foregroundColor: KukiColors.cocoa,
        disabledBackgroundColor: KukiColors.peach,
        disabledForegroundColor: KukiColors.muted,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        textStyle: KukiText.labelLarge,
        shape: pill.copyWith(
          side: const BorderSide(color: KukiColors.brownDeep),
        ),
        elevation: 0,
        shadowColor: Colors.transparent,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: KukiColors.caramel,
        foregroundColor: KukiColors.cocoa,
        disabledBackgroundColor: KukiColors.peach,
        disabledForegroundColor: KukiColors.muted,
        surfaceTintColor: Colors.transparent,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        textStyle: KukiText.labelLarge,
        shape: pill.copyWith(
          side: const BorderSide(color: KukiColors.brownDeep),
        ),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: KukiColors.brownDeep,
        disabledForegroundColor: KukiColors.muted,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        textStyle: KukiText.labelLarge,
        side: const BorderSide(color: KukiColors.line),
        shape: pill,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: KukiColors.brownDeep,
        disabledForegroundColor: KukiColors.muted,
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        textStyle: KukiText.labelLarge,
        shape: pill,
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        foregroundColor: KukiColors.cocoa,
        disabledForegroundColor: KukiColors.muted,
        minimumSize: const Size(44, 44),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith<Color>((states) =>
            states.contains(WidgetState.selected)
                ? KukiColors.caramel
                : KukiColors.paper),
        foregroundColor: WidgetStateProperty.resolveWith<Color>((states) =>
            states.contains(WidgetState.selected)
                ? KukiColors.cocoa
                : KukiColors.muted),
        side: WidgetStateProperty.resolveWith<BorderSide>((states) => BorderSide(
              color: states.contains(WidgetState.selected)
                  ? KukiColors.brownDeep
                  : KukiColors.line,
            )),
        textStyle: WidgetStatePropertyAll<TextStyle>(KukiText.labelMedium),
        padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
        shape: WidgetStatePropertyAll<OutlinedBorder>(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(KukiRadius.sm)),
        ),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: KukiColors.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shadowColor: KukiColors.barrier,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.lg),
        side: border,
      ),
      titleTextStyle: KukiText.headlineSmall,
      contentTextStyle: KukiText.bodyMedium,
      actionsPadding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      insetPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      constraints: const BoxConstraints(maxWidth: 560),
      barrierColor: KukiColors.barrier,
      clipBehavior: Clip.antiAlias,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: KukiColors.paper,
      modalBackgroundColor: KukiColors.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(KukiRadius.lg)),
        side: border,
      ),
      constraints: const BoxConstraints(maxWidth: 720),
      modalBarrierColor: KukiColors.barrier,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: KukiColors.cocoa,
      contentTextStyle: KukiText.onDark,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
      ),
      insetPadding: const EdgeInsets.all(16),
    ),
    dividerTheme: const DividerThemeData(
      color: KukiColors.line,
      thickness: 1,
      space: 16,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: KukiColors.paper,
      selectedColor: KukiColors.caramel,
      disabledColor: KukiColors.cream,
      labelStyle: KukiText.labelMedium,
      secondaryLabelStyle: KukiText.labelMedium,
      secondarySelectedColor: KukiColors.peach,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      shape: const StadiumBorder(),
      side: border,
      showCheckmark: false,
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith<Color>((states) =>
          states.contains(WidgetState.selected)
              ? KukiColors.caramel
              : Colors.transparent),
      checkColor: const WidgetStatePropertyAll<Color>(KukiColors.cocoa),
      side: const BorderSide(color: KukiColors.line, width: 2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.xs / 2),
      ),
    ),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith<Color>((states) =>
          states.contains(WidgetState.selected)
              ? KukiColors.caramel
              : KukiColors.muted),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith<Color>((states) =>
          states.contains(WidgetState.selected)
              ? KukiColors.caramel
              : KukiColors.paper),
      trackColor: WidgetStateProperty.resolveWith<Color>((states) =>
          states.contains(WidgetState.selected)
              ? KukiColors.brownDeep
              : KukiColors.line),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: KukiColors.caramel,
      linearTrackColor: KukiColors.peach,
      circularTrackColor: KukiColors.peach,
    ),
    listTileTheme: ListTileThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.sm),
      ),
      titleTextStyle: KukiText.titleSmall,
      subtitleTextStyle: KukiText.bodySmall,
      iconColor: KukiColors.cocoa,
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: KukiColors.cocoa,
      unselectedLabelColor: KukiColors.muted,
      indicatorColor: KukiColors.brownDeep,
      dividerColor: KukiColors.line,
      labelStyle: KukiText.labelLarge,
      unselectedLabelStyle: KukiText.labelMedium,
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: KukiColors.cocoa,
        borderRadius: BorderRadius.circular(KukiRadius.xs),
      ),
      textStyle: KukiText.captionOnDark,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: KukiColors.caramel,
      foregroundColor: KukiColors.cocoa,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KukiRadius.md),
        side: const BorderSide(color: KukiColors.brownDeep),
      ),
    ),
  );
}
