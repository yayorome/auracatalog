import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/aura_essence_tokens.dart';
import '../../catalog/presentation/catalog_screen.dart';
import '../domain/app_user.dart';
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
        if (!user.isActive) {
          return _RemovedAccountScreen(user: user);
        }
        return CatalogScreen(user: user);
      },
    );
  }
}

/// Shown instead of the app shell once an Owner removes a user's access
/// (`profiles.is_active = false` via the `set_user_active` RPC). The
/// session itself isn't revoked server-side, so this client-side gate is
/// what actually keeps the account out of the app; only an explicit
/// sign-out gets them back to /login.
class _RemovedAccountScreen extends ConsumerWidget {
  const _RemovedAccountScreen({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AuraSpacing.marginMobile),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.person_off_outlined, size: 48),
              const SizedBox(height: AuraSpacing.unit * 2),
              const Text('Tu acceso a la app ha sido eliminado.'),
              const SizedBox(height: AuraSpacing.unit),
              const Text('Contacta al propietario si crees que es un error.'),
              const SizedBox(height: AuraSpacing.unit * 3),
              FilledButton(
                onPressed: () => ref.read(authRepositoryProvider).signOut(),
                child: const Text('Cerrar sesión'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
