import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:aura_research_fragrance/main.dart';

void main() {
  setUpAll(() async {
    // No real backend needed for this smoke test — signed-out state is
    // enough to reach the login screen, which is all we assert here.
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'https://test.supabase.co',
      publishableKey: 'test-key',
    );
  });

  testWidgets('Signed-out user lands on the login screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: AuraApp()));
    await tester.pumpAndSettle();

    expect(find.text('Aura Research'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
  });
}
