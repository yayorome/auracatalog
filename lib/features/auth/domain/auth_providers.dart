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
