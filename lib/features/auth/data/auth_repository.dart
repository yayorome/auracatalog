import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/app_user.dart';

class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  User? get currentUser => _client.auth.currentUser;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// Sets the password on the currently-authenticated session. Used by
  /// [SetPasswordScreen] after an invite or recovery link has already
  /// established a session (the link itself signs the user in -- this call
  /// is what actually gives the account a password the user can log in
  /// with again later).
  Future<void> updatePassword(String newPassword) {
    return _client.auth.updateUser(UserAttributes(password: newPassword));
  }

  /// Fetches the `profiles` row for the given auth user id. Returns null if
  /// the row hasn't been created yet (there's a brief window right after
  /// sign-up before the `handle_new_user` trigger commits).
  Future<AppUser?> fetchProfile(String userId) async {
    final row = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (row == null) return null;
    return AppUser.fromRow(row);
  }
}
