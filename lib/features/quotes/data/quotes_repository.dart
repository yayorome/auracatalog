import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../cart/domain/cart_item.dart';
import '../domain/quote.dart';

/// `quote_items.unit_price`/`product_name_snapshot`/`line_total` are
/// deliberately not sent from here — the `set_quote_item_pricing` trigger
/// overwrites them from the current `products` row, same protection as
/// `sale_items`.
class QuotesRepository {
  QuotesRepository(this._client);

  final SupabaseClient _client;
  static const _bucket = 'documents';

  /// How long a quoted price is honored -- past this, `isExpired` hides the
  /// PDF/share/convert actions and `convert_quote_to_sale` rejects the
  /// conversion server-side even if the client is bypassed.
  static const _validityPeriod = Duration(days: 14);

  Future<String> createQuote({
    required String sellerId,
    required List<CartItem> items,
    String? clientName,
    String? clientEmail,
    String? clientPhone,
  }) async {
    assert(items.isNotEmpty, 'Cannot create a quote with no items');

    final quoteRow = await _client
        .from('quotes')
        .insert({
          'seller_id': sellerId,
          'status': 'draft',
          'currency': items.first.currency,
          'client_name': clientName,
          'client_email': clientEmail,
          'client_phone': clientPhone,
          'expires_at': DateTime.now().add(_validityPeriod).toIso8601String(),
        })
        .select('id')
        .single();
    final quoteId = quoteRow['id'] as String;

    final itemRows = await _client
        .from('quote_items')
        .insert([
          for (final item in items)
            {
              'quote_id': quoteId,
              'product_id': item.productId,
              'quantity': item.quantity,
            },
        ])
        .select('line_total');

    final total = itemRows.fold<double>(
      0,
      (sum, row) => sum + (row['line_total'] as num).toDouble(),
    );
    await _client
        .from('quotes')
        .update({'subtotal': total, 'total': total})
        .eq('id', quoteId);

    return quoteId;
  }

  /// Converts a draft/sent, non-expired quote into a paid cash sale via the
  /// `convert_quote_to_sale` RPC: it creates the sale + sale_items honoring
  /// the quote's snapshotted prices, atomically decrements stock through the
  /// same `mark_sale_paid` path every other sale uses, and only then marks
  /// the quote `converted` -- all in one transaction, so a failure (e.g.
  /// `insufficient_stock`) leaves the quote untouched rather than stuck in a
  /// half-converted state. Returns the new sale's id.
  Future<String> convertToSale(String quoteId) async {
    final saleId = await _client.rpc(
      'convert_quote_to_sale',
      params: {'p_quote_id': quoteId},
    );
    return saleId as String;
  }

  Future<Quote> fetchQuote(String quoteId) async {
    final row = await _client
        .from('quotes')
        .select()
        .eq('id', quoteId)
        .single();
    final itemRows = await _client
        .from('quote_items')
        .select()
        .eq('quote_id', quoteId);
    return Quote.fromRow(row, itemRows.map(QuoteLineItem.fromRow).toList());
  }

  Future<String> uploadQuotePdf({
    required String quoteId,
    required Uint8List bytes,
  }) async {
    final path = 'quotes/$quoteId.pdf';
    await _client.storage
        .from(_bucket)
        .uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(
            contentType: 'application/pdf',
            upsert: true,
          ),
        );
    await _client
        .from('quotes')
        .update({'quote_pdf_path': path, 'status': 'sent'})
        .eq('id', quoteId);
    return path;
  }

  /// Signed URL valid for 7 days — long enough that a link sent via
  /// WhatsApp today still resolves if the client opens it weeks later,
  /// short enough to not be a permanent public link. Regenerate on demand
  /// rather than storing it (Storage objects are durable; only the URL
  /// expires).
  Future<String> createSignedUrl(String storagePath) async {
    return _client.storage
        .from(_bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  }
}
