import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../../auth/domain/app_user.dart';
import '../data/user_management_repository.dart';

final userManagementRepositoryProvider = Provider<UserManagementRepository>((
  ref,
) {
  return UserManagementRepository(ref.watch(supabaseClientProvider));
});

final allProfilesProvider = FutureProvider<List<AppUser>>((ref) {
  return ref.watch(userManagementRepositoryProvider).fetchAllProfiles();
});
