import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/sales_report.dart';

/// All three RPCs are `security invoker`, so results are scoped by the
/// existing `sales`/`sale_items` RLS (Owner sees every sale, a Seller would
/// only see their own) -- see migration 0010_reports_rpc. The UI only links
/// here for Owner profiles.
class ReportsRepository {
  ReportsRepository(this._client);

  final SupabaseClient _client;

  Future<SalesSummary> fetchSummary({
    required DateTime start,
    required DateTime end,
  }) async {
    final row = await _client
        .rpc(
          'report_sales_summary',
          params: {
            'p_start': start.toIso8601String(),
            'p_end': end.toIso8601String(),
          },
        )
        .single();
    return SalesSummary.fromRow(row);
  }

  Future<List<DailySales>> fetchDaily({
    required DateTime start,
    required DateTime end,
  }) async {
    final rows = await _client.rpc(
      'report_sales_daily',
      params: {
        'p_start': start.toIso8601String(),
        'p_end': end.toIso8601String(),
      },
    );
    return (rows as List)
        .map((row) => DailySales.fromRow(row as Map<String, dynamic>))
        .toList();
  }

  Future<List<TopProduct>> fetchTopProducts({
    required DateTime start,
    required DateTime end,
    int limit = 5,
  }) async {
    final rows = await _client.rpc(
      'report_top_products',
      params: {
        'p_start': start.toIso8601String(),
        'p_end': end.toIso8601String(),
        'p_limit': limit,
      },
    );
    return (rows as List)
        .map((row) => TopProduct.fromRow(row as Map<String, dynamic>))
        .toList();
  }
}
