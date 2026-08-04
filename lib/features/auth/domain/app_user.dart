/// Role stored in `public.profiles.role`. Mirrors the Postgres
/// `user_role` enum ('owner', 'seller') applied in migration
/// 0001_profiles_and_roles.
enum UserRole {
  owner,
  seller;

  static UserRole fromDb(String value) => switch (value) {
    'owner' => UserRole.owner,
    'seller' => UserRole.seller,
    _ => throw ArgumentError('Unknown user_role: $value'),
  };

  /// UI-facing Spanish label. Never use in place of [name] for RPC calls or
  /// anywhere the raw `user_role` DB value is expected -- [name] stays
  /// 'owner'/'seller' for that.
  String get displayLabel => switch (this) {
    UserRole.owner => 'Propietario',
    UserRole.seller => 'Vendedor',
  };
}

/// Domain model for a row in `public.profiles`, joined with the
/// authenticated user's id.
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    required this.fullName,
    required this.isActive,
  });

  factory AppUser.fromRow(Map<String, dynamic> row) {
    return AppUser(
      id: row['id'] as String,
      email: row['email'] as String?,
      role: UserRole.fromDb(row['role'] as String),
      fullName: row['full_name'] as String?,
      isActive: row['is_active'] as bool? ?? true,
    );
  }

  final String id;
  final String? email;
  final UserRole role;
  final String? fullName;
  final bool isActive;

  bool get isOwner => role == UserRole.owner;
}
