import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/presentation/catalog_screen.dart';
import '../domain/auth_providers.dart';

/// Waits for [currentProfileProvider] (the `profiles` row fetch) before
/// rendering the authenticated app shell, so role-gated content never
/// flashes the wrong state. Currently the shell is just the catalog;
/// once a bottom-nav shell exists (Phase 6+), this becomes its builder.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(currentProfileProvider);
    return profileAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, stackTrace) => Scaffold(
        body: Center(child: Text('Error al cargar el perfil: $error')),
      ),
      data: (user) {
        if (user == null) {
          // Signed in but the profiles row hasn't landed yet (trigger race)
          // or the session just ended — the router's redirect will move us
          // to /login on the next auth state event.
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CatalogScreen(user: user);
      },
    );
  }
}
