import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/utils/app_return_url.dart';
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

  /// Removes/restores a user's access via the `set_user_active` RPC
  /// (SECURITY DEFINER, Owner-only, rejects targeting yourself -- same
  /// shape as `promote_user`). This deactivates rather than hard-deletes:
  /// `sale_items`/`sales.seller_id` reference `profiles`, so actually
  /// deleting the row would orphan historical sales/report data. The row
  /// and its sales history stay intact; the user just loses app access
  /// ([AuthGate] signs out / blocks anyone whose profile comes back with
  /// `is_active: false`).
  Future<void> setUserActive({
    required String targetUserId,
    required bool isActive,
  }) {
    return _client.rpc(
      'set_user_active',
      params: {'target_user_id': targetUserId, 'active': isActive},
    );
  }

  /// Calls the `admin-create-user` Edge Function, which holds the service
  /// role key server-side and re-checks the caller is an Owner before
  /// inviting -- this repository never has admin credentials itself. The
  /// new user starts as 'seller' (via the `handle_new_user` trigger) and
  /// gets a Supabase-managed invite email to set their own password; the
  /// Owner never sees or sets it.
  ///
  /// `redirect_to` is the Owner's own current origin (same
  /// [AppReturnUrl.current] used for Mercado Pago's return URL) -- without
  /// it, Supabase's `inviteUserByEmail` falls back to the project's Auth
  /// "Site URL" setting, which points at whatever was last configured
  /// there (e.g. `localhost` from local dev) regardless of where the
  /// invite was actually sent from. Passing it explicitly makes the link
  /// correct whether the Owner is inviting from local dev, a Vercel
  /// preview, or production -- as long as that origin is also present in
  /// the project's Auth "Redirect URLs" allow-list (Dashboard-only, not
  /// settable via this repository).
  Future<void> inviteUser({required String email, String? fullName}) async {
    final response = await _client.functions.invoke(
      'admin-create-user',
      body: {
        'email': email,
        if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
        'redirect_to': AppReturnUrl.current(),
      },
    );
    if (response.status != 200) {
      final error = (response.data is Map) ? response.data['error'] : null;
      throw Exception(error ?? 'No se pudo invitar al usuario');
    }
  }
}
