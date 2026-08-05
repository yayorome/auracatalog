import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/router/app_router.dart';
import 'app/theme/aura_essence_theme.dart';
import 'core/supabase/supabase_env.dart';
import 'features/auth/domain/auth_providers.dart';

class AuraApp extends ConsumerWidget {
  const AuraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'Aura Research Fragrance',
      theme: AuraEssenceTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

/// Reads `type` from the boot URL's query string or `#`-fragment (Supabase
/// invite/recovery links use one or the other depending on flow type) --
/// mirrors the normalization `gotrue`'s own `getSessionFromUrl` does
/// internally, since that value isn't exposed back to app code and
/// `type=invite` doesn't get its own `AuthChangeEvent` (see
/// [needsPasswordSetupProvider]'s doc comment). Must run before
/// `Supabase.initialize()` clears the URL and before go_router mounts and
/// rewrites it -- both of which only happen later in `main()`, after this
/// synchronous read of [Uri.base].
bool _bootUrlNeedsPasswordSetup() {
  if (!kIsWeb) return false;
  final uri = Uri.base;
  final params = {...uri.queryParameters, ...Uri.splitQueryString(uri.fragment)};
  return params['type'] == 'invite' || params['type'] == 'recovery';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final needsPasswordSetup = _bootUrlNeedsPasswordSetup();

  if (SupabaseEnv.isConfigured) {
    await Supabase.initialize(
      url: SupabaseEnv.url,
      publishableKey: SupabaseEnv.publishableKey,
    );
  }

  runApp(
    ProviderScope(
      overrides: [
        needsPasswordSetupProvider.overrideWith(
          () => NeedsPasswordSetupNotifier(initialValue: needsPasswordSetup),
        ),
      ],
      child: const AuraApp(),
    ),
  );
}
