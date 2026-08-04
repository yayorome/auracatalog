import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../data/sales_repository.dart';

final salesRepositoryProvider = Provider<SalesRepository>((ref) {
  return SalesRepository(ref.watch(supabaseClientProvider));
});

/// Live status of a single sale row, for the payment-status screen. The
/// Mercado Pago webhook confirms payment asynchronously — often after the
/// seller has already returned from the checkout browser tab — so this
/// Realtime subscription (not a one-shot fetch) is what flips the UI from
/// "waiting" to "paid".
final saleStreamProvider = StreamProvider.family<Map<String, dynamic>?, String>(
  (ref, saleId) {
    final client = ref.watch(supabaseClientProvider);
    return client
        .from('sales')
        .stream(primaryKey: ['id'])
        .eq('id', saleId)
        .map((rows) => rows.isEmpty ? null : rows.first);
  },
);
