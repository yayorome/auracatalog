import 'package:supabase_flutter/supabase_flutter.dart';

import '../../auth/domain/app_user.dart';

/// `profiles_select_own_or_owner` RLS already lets an Owner see every row,
/// so [fetchAllProfiles] needs no special RPC. Role changes still go
/// through the `promote_user` RPC (SECURITY DEFINER, checked in migration
/// 0002) rather than a direct `UPDATE` -- there is no RLS policy allowing a
/// client to update another user's `profiles` row at all.
class UserManagementRepository {
  UserManagementRepository(this._client);

  final SupabaseClient _client;

  Future<List<AppUser>> fetchAllProfiles() async {
    final rows = await _client.from('profiles').select().order('created_at');
    return rows.map(AppUser.fromRow).toList();
  }

  Future<void> promoteUser({
    required String targetUserId,
    required UserRole newRole,
  }) {
    return _client.rpc(
      'promote_user',
      params: {'target_user_id': targetUserId, 'new_role': newRole.name},
    );
  }

  /// Calls the `admin-create-user` Edge Function, which holds the service
  /// role key server-side and re-checks the caller is an Owner before
  /// inviting -- this repository never has admin credentials itself. The
  /// new user starts as 'seller' (via the `handle_new_user` trigger) and
  /// gets a Supabase-managed invite email to set their own password; the
  /// Owner never sees or sets it.
  Future<void> inviteUser({required String email, String? fullName}) async {
    final response = await _client.functions.invoke(
      'admin-create-user',
      body: {
        'email': email,
        if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
      },
    );
    if (response.status != 200) {
      final error = (response.data is Map) ? response.data['error'] : null;
      throw Exception(error ?? 'No se pudo invitar al usuario');
    }
  }
}
