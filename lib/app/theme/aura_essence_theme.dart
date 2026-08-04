import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'aura_essence_tokens.dart';

/// Flutter [ThemeData] translated from the "Aura Essence" Stitch design
/// system. Stitch doesn't export Flutter code, so this is a manual mapping
/// of the design-md tokens (colors/typography/spacing/radii) — keep it in
/// sync by hand if the Stitch design system is updated.
abstract class AuraEssenceTheme {
  static ThemeData get light {
    final colorScheme = const ColorScheme.light(
      surface: AuraColors.surface,
      onSurface: AuraColors.onSurface,
      onSurfaceVariant: AuraColors.onSurfaceVariant,
      outline: AuraColors.outline,
      outlineVariant: AuraColors.outlineVariant,
      primary: AuraColors.primary,
      onPrimary: AuraColors.onPrimary,
      primaryContainer: AuraColors.primaryContainer,
      onPrimaryContainer: AuraColors.onPrimaryContainer,
      secondary: AuraColors.secondary,
      onSecondary: AuraColors.onSecondary,
      secondaryContainer: AuraColors.secondaryContainer,
      onSecondaryContainer: AuraColors.onSecondaryContainer,
      tertiary: AuraColors.tertiary,
      onTertiary: AuraColors.onTertiary,
      tertiaryContainer: AuraColors.tertiaryContainer,
      onTertiaryContainer: AuraColors.onTertiaryContainer,
      error: AuraColors.error,
      onError: AuraColors.onError,
      errorContainer: AuraColors.errorContainer,
      onErrorContainer: AuraColors.onErrorContainer,
    );

    final headlineStyle = GoogleFonts.libreCaslonText(
      color: AuraColors.onSurface,
      fontWeight: FontWeight.w400,
    );
    final bodyStyle = GoogleFonts.hankenGrotesk(
      color: AuraColors.onSurface,
      fontWeight: FontWeight.w400,
    );

    final textTheme = TextTheme(
      displayLarge: headlineStyle.copyWith(
        fontSize: 48,
        height: 56 / 48,
        letterSpacing: -0.02 * 48,
      ),
      headlineLarge: headlineStyle.copyWith(fontSize: 32, height: 40 / 32),
      headlineMedium: headlineStyle.copyWith(fontSize: 24, height: 32 / 24),
      headlineSmall: headlineStyle.copyWith(fontSize: 28, height: 36 / 28),
      bodyLarge: bodyStyle.copyWith(fontSize: 18, height: 28 / 18),
      bodyMedium: bodyStyle.copyWith(fontSize: 16, height: 24 / 16),
      labelLarge: bodyStyle.copyWith(
        fontSize: 14,
        height: 20 / 14,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.05 * 14,
      ),
      labelSmall: bodyStyle.copyWith(
        fontSize: 12,
        height: 16 / 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.08 * 12,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AuraColors.background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AuraColors.background,
        foregroundColor: AuraColors.onBackground,
        elevation: 0,
        titleTextStyle: textTheme.headlineMedium,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AuraColors.primary,
          foregroundColor: AuraColors.onPrimary,
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(
            horizontal: AuraSpacing.unit * 3,
            vertical: AuraSpacing.unit * 1.5,
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AuraColors.onSurface,
          side: const BorderSide(color: AuraColors.outline),
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(
            horizontal: AuraSpacing.unit * 3,
            vertical: AuraSpacing.unit * 1.5,
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AuraColors.surfaceContainerLow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AuraRadii.base),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AuraRadii.base),
          borderSide: const BorderSide(color: AuraColors.primary, width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: AuraColors.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AuraRadii.lg),
          side: const BorderSide(color: AuraColors.outlineVariant, width: 1),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AuraColors.outlineVariant),
    );
  }
}
