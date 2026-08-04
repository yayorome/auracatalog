import 'package:flutter/material.dart';

/// Design tokens pulled from the "Aura Essence" Stitch design system
/// (Stitch project 17428257875776255847, "Auraresearchp Fragrance App").
/// These are raw token values only — build [ThemeData] from them in
/// `aura_essence_theme.dart`, don't reference this file directly from UI code.
abstract class AuraColors {
  static const surface = Color(0xFFFAF9F5);
  static const surfaceDim = Color(0xFFDADAD6);
  static const surfaceBright = Color(0xFFFAF9F5);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFF4F4F0);
  static const surfaceContainer = Color(0xFFEEEEEA);
  static const surfaceContainerHigh = Color(0xFFE8E8E4);
  static const surfaceContainerHighest = Color(0xFFE3E3DF);
  static const onSurface = Color(0xFF1A1C1A);
  static const onSurfaceVariant = Color(0xFF45474A);
  static const outline = Color(0xFF76777B);
  static const outlineVariant = Color(0xFFC6C6CA);

  static const primary = Color(0xFF000000);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFF1A1C1F);
  static const onPrimaryContainer = Color(0xFF838487);

  static const secondary = Color(0xFF5E5F5C);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFE0E0DD);
  static const onSecondaryContainer = Color(0xFF626361);

  /// Soft sage — the brand's "botanical/fresh" accent, used sparingly for
  /// call-to-actions and status indicators.
  static const tertiary = Color(0xFF8A9A8E);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFF111E16);
  static const onTertiaryContainer = Color(0xFF78887C);

  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);

  static const background = Color(0xFFFAF9F5);
  static const onBackground = Color(0xFF1A1C1A);

  /// Glass-tile fill used over [background] for the bento-grid layout.
  static const glassTile = Color(0x99FFFFFF); // rgba(255,255,255,0.6)
}

abstract class AuraSpacing {
  static const unit = 8.0;
  static const gutter = 16.0;
  static const marginMobile = 20.0;
  static const marginDesktop = 64.0;
  static const bentoGap = 12.0;
}

abstract class AuraRadii {
  static const sm = 4.0;
  static const base = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const full = 9999.0;
}

abstract class AuraFonts {
  static const headline = 'Libre Caslon Text';
  static const body = 'Hanken Grotesk';
}
