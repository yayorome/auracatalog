import 'package:flutter/foundation.dart' show kIsWeb;

/// Base URL Mercado Pago redirects back to after checkout. On web this is
/// the running app's own origin (works unmodified in local dev and once
/// deployed to Vercel). Mobile has no browser origin to derive this from —
/// `back_urls` there needs a registered deep link (App Links/Associated
/// Domains) before Mercado Pago's redirect can resume the app; this
/// placeholder scheme is a known gap, not a working redirect, until that
/// platform config is added.
abstract class AppReturnUrl {
  static String current() {
    if (kIsWeb) {
      final uri = Uri.base;
      return '${uri.scheme}://${uri.authority}/';
    }
    return 'auraresearch://payment-return/';
  }
}
