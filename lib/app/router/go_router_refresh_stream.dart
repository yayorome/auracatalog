import 'dart:async';

import 'package:flutter/foundation.dart';

/// Bridges a [Stream] (here, Supabase's auth state stream) into a
/// [Listenable] that `GoRouter.refreshListenable` can consume, so the
/// router's `redirect` re-evaluates on every sign-in/sign-out.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
