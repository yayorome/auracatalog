import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../data/auth_repository.dart';
import 'app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

/// Raw Supabase auth stream — the router's redirect and [currentProfileProvider]
/// both key off this.
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges;
});

/// The signed-in user's `profiles` row (role, name, etc.), or null when
/// signed out. Re-fetches whenever the auth stream emits.
final currentProfileProvider = FutureProvider<AppUser?>((ref) async {
  final repository = ref.watch(authRepositoryProvider);
  // Fall back to the synchronous currentUser for the first frame, before
  // the auth stream has emitted its initial event.
  final userId =
      ref.watch(authStateChangesProvider).value?.session?.user.id ??
      repository.currentUser?.id;
  if (userId == null) return null;
  return repository.fetchProfile(userId);
});

/// Convenience boolean for role-gated UI/routing. Defaults to false while
/// loading or signed out — never grant Owner-only access optimistically.
final isOwnerProvider = Provider<bool>((ref) {
  return ref.watch(currentProfileProvider).value?.isOwner ?? false;
});

/// Whether the app booted from an invite or password-recovery link, so the
/// router should send the user to [RoutePaths.setPassword] instead of
/// straight into the catalog.
///
/// Seeded once at startup from `main.dart` (via a `ProviderScope` override
/// on the notifier's initial value, computed from the raw boot URL before
/// `runApp`/go_router exist) rather than computed here, because Supabase's
/// own SDK doesn't expose this distinction reliably: `getSessionFromUrl`
/// only fires `AuthChangeEvent.passwordRecovery` for `type=recovery` links
/// -- `type=invite` links fire the same `AuthChangeEvent.signedIn` as any
/// ordinary sign-in, so there is no auth-stream event to key off for the
/// invite case.
class NeedsPasswordSetupNotifier extends Notifier<bool> {
  NeedsPasswordSetupNotifier({this.initialValue = false});

  final bool initialValue;

  @override
  bool build() => initialValue;

  /// Called by [SetPasswordScreen] once the password is successfully set.
  void clear() => state = false;
}

final needsPasswordSetupProvider =
    NotifierProvider<NeedsPasswordSetupNotifier, bool>(
      NeedsPasswordSetupNotifier.new,
    );
