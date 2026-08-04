import 'dart:ui';

import 'package:flutter/material.dart';

import '../../app/theme/aura_essence_tokens.dart';

/// The primary layout building block of the "Aura Essence" design system:
/// a translucent, blurred, thin-outlined container used across catalog,
/// cart, and dashboard bento-grid layouts instead of drop-shadow cards.
class BentoTile extends StatelessWidget {
  const BentoTile({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
    this.borderRadius = AuraRadii.lg,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: AuraColors.glassTile,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(color: AuraColors.outlineVariant, width: 1),
          ),
          child: child,
        ),
      ),
    );
  }
}
