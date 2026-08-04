import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../domain/reports_providers.dart';
import '../domain/sales_report.dart';

/// Visual reference: no matching Stitch screen yet -- generate one via
/// `generate_screen_from_text` against the "Aura Essence" design system
/// when refining this screen's design.
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(reportRangeProvider);
    final summaryAsync = ref.watch(salesSummaryProvider);
    final trendAsync = ref.watch(revenueTrendProvider);
    final dailyAsync = ref.watch(dailySalesProvider);
    final topProductsAsync = ref.watch(topProductsProvider);
    final textTheme = Theme.of(context).textTheme;
    final priceFormat = NumberFormat.simpleCurrency(name: 'MXN');

    return Scaffold(
      appBar: AppBar(title: const Text('Reportes de ventas')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(salesSummaryProvider);
          ref.invalidate(dailySalesProvider);
          ref.invalidate(topProductsProvider);
        },
        child: ResponsivePage(
          child: ListView(
            padding: auraPagePadding(context),
            children: [
              Wrap(
                spacing: AuraSpacing.unit,
                children: [
                  for (final preset in ReportRangePreset.values)
                    ChoiceChip(
                      label: Text(preset.label),
                      selected: range == preset,
                      onSelected: (_) =>
                          ref.read(reportRangeProvider.notifier).select(preset),
                    ),
                ],
              ),
              const SizedBox(height: AuraSpacing.unit * 2),
              summaryAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, stackTrace) =>
                    Text('Error al cargar el resumen: $error'),
                data: (summary) => Row(
                  children: [
                    Expanded(
                      child: _SummaryTile(
                        label: 'Ingresos',
                        value: priceFormat.format(summary.totalRevenue),
                        trend: trendAsync.value,
                      ),
                    ),
                    const SizedBox(width: AuraSpacing.unit),
                    Expanded(
                      child: _SummaryTile(
                        label: 'Ventas',
                        value: '${summary.saleCount}',
                      ),
                    ),
                    const SizedBox(width: AuraSpacing.unit),
                    Expanded(
                      child: _SummaryTile(
                        label: 'Ticket prom.',
                        value: priceFormat.format(summary.averageTicket),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AuraSpacing.unit * 2),
              BentoTile(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Ingresos por día', style: textTheme.titleMedium),
                    const SizedBox(height: AuraSpacing.unit * 2),
                    SizedBox(
                      height: 200,
                      child: dailyAsync.when(
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (error, stackTrace) => Center(
                          child: Text('Error al cargar el gráfico: $error'),
                        ),
                        data: (daily) => daily.isEmpty
                            ? const Center(
                                child: Text('Aún no hay ventas pagadas.'),
                              )
                            : _DailyRevenueChart(daily: daily),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AuraSpacing.unit * 2),
              BentoTile(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Productos más vendidos',
                      style: textTheme.titleMedium,
                    ),
                    const SizedBox(height: AuraSpacing.unit),
                    topProductsAsync.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.all(AuraSpacing.unit * 2),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (error, stackTrace) =>
                          Text('Error al cargar los productos: $error'),
                      data: (products) => products.isEmpty
                          ? const Padding(
                              padding: EdgeInsets.symmetric(
                                vertical: AuraSpacing.unit * 2,
                              ),
                              child: Text('Aún no hay ventas pagadas.'),
                            )
                          : Column(
                              children: [
                                for (final product in products)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: AuraSpacing.unit / 2,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            product.productName,
                                            style: textTheme.bodyMedium,
                                          ),
                                        ),
                                        Text(
                                          '${product.unitsSold} unidades',
                                          style: textTheme.bodySmall,
                                        ),
                                        const SizedBox(width: AuraSpacing.unit),
                                        Text(
                                          priceFormat.format(product.revenue),
                                          style: textTheme.labelLarge,
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({required this.label, required this.value, this.trend});

  final String label;
  final String value;
  final double? trend;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return BentoTile(
      padding: const EdgeInsets.all(AuraSpacing.unit * 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(label, style: textTheme.labelMedium),
              if (trend != null) ...[
                const SizedBox(width: AuraSpacing.unit / 2),
                _TrendPill(trend: trend!),
              ],
            ],
          ),
          const SizedBox(height: AuraSpacing.unit / 2),
          Text(value, style: textTheme.headlineSmall),
        ],
      ),
    );
  }
}

/// Matches the Stitch admin dashboard's revenue-trend pill -- green/up for
/// growth vs. the prior period of equal length, red/down for a decline.
class _TrendPill extends StatelessWidget {
  const _TrendPill({required this.trend});

  final double trend;

  @override
  Widget build(BuildContext context) {
    final isPositive = trend >= 0;
    final color = isPositive ? AuraColors.tertiary : AuraColors.error;
    final percent = (trend.abs() * 100).toStringAsFixed(1);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AuraRadii.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isPositive ? Icons.arrow_upward : Icons.arrow_downward,
            size: 10,
            color: color,
          ),
          Text(
            '$percent%',
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: color, fontSize: 10),
          ),
        ],
      ),
    );
  }
}

class _DailyRevenueChart extends StatelessWidget {
  const _DailyRevenueChart({required this.daily});

  final List<DailySales> daily;

  @override
  Widget build(BuildContext context) {
    final maxRevenue = daily
        .map((d) => d.revenue)
        .reduce((a, b) => a > b ? a : b);
    final dateFormat = DateFormat.Md();
    return BarChart(
      BarChartData(
        maxY: maxRevenue == 0 ? 1 : maxRevenue * 1.2,
        barTouchData: BarTouchData(enabled: true),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= daily.length) {
                  return const SizedBox.shrink();
                }
                // Thin out labels so they don't overlap on wide ranges.
                if (daily.length > 10 && index % (daily.length ~/ 6 + 1) != 0) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    dateFormat.format(daily[index].day),
                    style: const TextStyle(fontSize: 10),
                  ),
                );
              },
            ),
          ),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: [
          for (var i = 0; i < daily.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: daily[i].revenue,
                  color: AuraColors.tertiary,
                  width: 12,
                  borderRadius: BorderRadius.circular(AuraRadii.sm),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
