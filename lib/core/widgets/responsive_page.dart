import 'package:flutter/material.dart';

import '../../app/theme/aura_essence_tokens.dart';

/// Width at which a page switches from mobile to desktop spacing --
/// matches Flutter's own conventional tablet/desktop breakpoint.
const double auraDesktopBreakpoint = 900;

/// Page padding that grows from [AuraSpacing.marginMobile] to
/// [AuraSpacing.marginDesktop] once the viewport crosses
/// [auraDesktopBreakpoint]. Pass to a scrollable's own `padding:` (not a
/// wrapping `Padding`) so it stays scroll-aware, matching the rest of the
/// app's screens.
EdgeInsets auraPagePadding(BuildContext context) {
  final isDesktop = MediaQuery.sizeOf(context).width >= auraDesktopBreakpoint;
  return isDesktop
      ? const EdgeInsets.symmetric(
          horizontal: AuraSpacing.marginDesktop,
          vertical: AuraSpacing.marginMobile,
        )
      : const EdgeInsets.all(AuraSpacing.marginMobile);
}

/// Centers a page's body and caps its width on wide (desktop web)
/// viewports, so bento tiles and lists don't stretch edge-to-edge -- a
/// no-op below [auraDesktopBreakpoint].
class ResponsivePage extends StatelessWidget {
  const ResponsivePage({super.key, required this.child, this.maxWidth = 1120});

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
