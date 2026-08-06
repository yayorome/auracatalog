import 'package:flutter/foundation.dart' show kIsWeb;

/// The running app's own origin, used as the `redirect_to` for Supabase Auth
/// action links (e.g. user invites). On web this is derived from the
/// current browser origin (works unmodified in local dev and once deployed
/// to Vercel). Mobile has no browser origin to derive this from -- resuming
/// the app from a link there needs a registered deep link (App
/// Links/Associated Domains); this placeholder scheme is a known gap, not a
/// working redirect, until that platform config is added.
abstract class AppReturnUrl {
  static String current() {
    if (kIsWeb) {
      final uri = Uri.base;
      return '${uri.scheme}://${uri.authority}/';
    }
    return 'auraresearch://payment-return/';
  }
}
