/// Aggregate row from `report_sales_summary(p_start, p_end)`.
class SalesSummary {
  const SalesSummary({
    required this.totalRevenue,
    required this.saleCount,
    required this.averageTicket,
  });

  factory SalesSummary.fromRow(Map<String, dynamic> row) {
    return SalesSummary(
      totalRevenue: (row['total_revenue'] as num).toDouble(),
      saleCount: (row['sale_count'] as num).toInt(),
      averageTicket: (row['average_ticket'] as num).toDouble(),
    );
  }

  static const zero = SalesSummary(
    totalRevenue: 0,
    saleCount: 0,
    averageTicket: 0,
  );

  final double totalRevenue;
  final int saleCount;
  final double averageTicket;
}

/// One row from `report_sales_daily(p_start, p_end)` — a single day's total,
/// used to plot the revenue trend chart.
class DailySales {
  const DailySales({
    required this.day,
    required this.revenue,
    required this.saleCount,
  });

  factory DailySales.fromRow(Map<String, dynamic> row) {
    return DailySales(
      day: DateTime.parse(row['day'] as String),
      revenue: (row['revenue'] as num).toDouble(),
      saleCount: (row['sale_count'] as num).toInt(),
    );
  }

  final DateTime day;
  final double revenue;
  final int saleCount;
}

/// One row from `report_top_products(p_start, p_end, p_limit)`.
class TopProduct {
  const TopProduct({
    required this.productId,
    required this.productName,
    required this.unitsSold,
    required this.revenue,
  });

  factory TopProduct.fromRow(Map<String, dynamic> row) {
    return TopProduct(
      productId: row['product_id'] as String,
      productName: row['product_name'] as String,
      unitsSold: (row['units_sold'] as num).toInt(),
      revenue: (row['revenue'] as num).toDouble(),
    );
  }

  final String productId;
  final String productName;
  final int unitsSold;
  final double revenue;
}
