import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../data/reports_repository.dart';
import 'sales_report.dart';

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) {
  return ReportsRepository(ref.watch(supabaseClientProvider));
});

enum ReportRangePreset {
  last7Days('Últimos 7 días', 7),
  last30Days('Últimos 30 días', 30),
  last90Days('Últimos 90 días', 90);

  const ReportRangePreset(this.label, this.days);

  final String label;
  final int days;
}

class ReportRangeNotifier extends Notifier<ReportRangePreset> {
  @override
  ReportRangePreset build() => ReportRangePreset.last30Days;

  void select(ReportRangePreset preset) => state = preset;
}

/// Selected report window, exclusive of the upper bound so "today" is
/// always included regardless of time-of-day. Defaults to the last 30 days.
final reportRangeProvider =
    NotifierProvider<ReportRangeNotifier, ReportRangePreset>(
      ReportRangeNotifier.new,
    );

(DateTime, DateTime) _boundsFor(ReportRangePreset preset) {
  final now = DateTime.now();
  // .toUtc() here (not just at the RPC-call boundary) matters because
  // revenueTrendProvider derives previousStart by subtracting further from
  // this start -- doing the conversion once up front keeps every downstream
  // bound UTC, rather than relying on each call site to convert correctly.
  final end = DateTime(
    now.year,
    now.month,
    now.day,
  ).add(const Duration(days: 1)).toUtc();
  final start = end.subtract(Duration(days: preset.days));
  return (start, end);
}

final salesSummaryProvider = FutureProvider<SalesSummary>((ref) {
  final (start, end) = _boundsFor(ref.watch(reportRangeProvider));
  return ref
      .watch(reportsRepositoryProvider)
      .fetchSummary(start: start, end: end);
});

/// Revenue trend vs. the immediately preceding period of equal length (e.g.
/// last 30 days vs. the 30 days before that) -- reuses the same summary RPC
/// with a shifted window rather than a new endpoint. Returns null on the
/// first period of the current preset's history (previous-period revenue is
/// 0), since a percentage change against zero isn't meaningful.
final revenueTrendProvider = FutureProvider<double?>((ref) async {
  final preset = ref.watch(reportRangeProvider);
  final (start, _) = _boundsFor(preset);
  final previousStart = start.subtract(Duration(days: preset.days));
  final current = await ref.watch(salesSummaryProvider.future);
  final previous = await ref
      .watch(reportsRepositoryProvider)
      .fetchSummary(start: previousStart, end: start);
  if (previous.totalRevenue <= 0) return null;
  return (current.totalRevenue - previous.totalRevenue) / previous.totalRevenue;
});

final dailySalesProvider = FutureProvider<List<DailySales>>((ref) {
  final (start, end) = _boundsFor(ref.watch(reportRangeProvider));
  return ref
      .watch(reportsRepositoryProvider)
      .fetchDaily(start: start, end: end);
});

final topProductsProvider = FutureProvider<List<TopProduct>>((ref) {
  final (start, end) = _boundsFor(ref.watch(reportRangeProvider));
  return ref
      .watch(reportsRepositoryProvider)
      .fetchTopProducts(start: start, end: end);
});
