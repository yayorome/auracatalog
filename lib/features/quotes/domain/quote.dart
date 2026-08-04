enum QuoteStatus {
  draft,
  sent,
  converted,
  expired;

  static QuoteStatus fromDb(String value) => switch (value) {
    'draft' => QuoteStatus.draft,
    'sent' => QuoteStatus.sent,
    'converted' => QuoteStatus.converted,
    'expired' => QuoteStatus.expired,
    _ => throw ArgumentError('Unknown quote_status: $value'),
  };
}

class QuoteLineItem {
  const QuoteLineItem({
    required this.productId,
    required this.productNameSnapshot,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  factory QuoteLineItem.fromRow(Map<String, dynamic> row) => QuoteLineItem(
    productId: row['product_id'] as String,
    productNameSnapshot: row['product_name_snapshot'] as String,
    unitPrice: (row['unit_price'] as num).toDouble(),
    quantity: row['quantity'] as int,
    lineTotal: (row['line_total'] as num).toDouble(),
  );

  final String productId;
  final String productNameSnapshot;
  final double unitPrice;
  final int quantity;
  final double lineTotal;
}

class Quote {
  const Quote({
    required this.id,
    required this.status,
    required this.total,
    required this.currency,
    required this.clientName,
    required this.clientEmail,
    required this.clientPhone,
    required this.items,
  });

  factory Quote.fromRow(Map<String, dynamic> row, List<QuoteLineItem> items) {
    return Quote(
      id: row['id'] as String,
      status: QuoteStatus.fromDb(row['status'] as String),
      total: (row['total'] as num).toDouble(),
      currency: row['currency'] as String,
      clientName: row['client_name'] as String?,
      clientEmail: row['client_email'] as String?,
      clientPhone: row['client_phone'] as String?,
      items: items,
    );
  }

  final String id;
  final QuoteStatus status;
  final double total;
  final String currency;
  final String? clientName;
  final String? clientEmail;
  final String? clientPhone;
  final List<QuoteLineItem> items;
}
