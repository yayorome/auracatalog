import 'package:supabase_flutter/supabase_flutter.dart';

import '../../cart/domain/cart_item.dart';

/// `sale_items.unit_price`/`product_name_snapshot`/`line_total` are
/// deliberately NOT sent from here — the `sale_items_set_pricing` trigger
/// overwrites them from the current `products` row server-side, so a
/// tampered client request can't set an arbitrary sale price.
class SalesRepository {
  SalesRepository(this._client);

  final SupabaseClient _client;

  Future<String> _createPendingSale({
    required String sellerId,
    required List<CartItem> items,
    required String paymentMethod,
    String? clientName,
    String? clientEmail,
    String? clientPhone,
  }) async {
    assert(items.isNotEmpty, 'Cannot complete a sale with an empty cart');

    final saleRow = await _client
        .from('sales')
        .insert({
          'seller_id': sellerId,
          'status': 'pending_payment',
          'payment_method': paymentMethod,
          'currency': items.first.currency,
          'client_name': clientName,
          'client_email': clientEmail,
          'client_phone': clientPhone,
        })
        .select('id')
        .single();
    final saleId = saleRow['id'] as String;

    await _client.from('sale_items').insert([
      for (final item in items)
        {
          'sale_id': saleId,
          'product_id': item.productId,
          'quantity': item.quantity,
        },
    ]);

    return saleId;
  }

  /// Creates a sale + its line items, then calls `mark_sale_paid` to
  /// atomically decrement stock and mark it paid. Cash-only: the seller has
  /// already collected payment in person, so there's no async confirmation
  /// step (contrast [createMercadoPagoSale], which stays `pending_payment`
  /// until the webhook confirms).
  ///
  /// Throws a [PostgrestException] (e.g. `insufficient_stock for product
  /// ...`) if `mark_sale_paid` fails; the sale row is left in
  /// `pending_payment` rather than being rolled back — the caller should
  /// surface the error and let the seller retry or adjust the cart.
  Future<String> completeCashSale({
    required String sellerId,
    required List<CartItem> items,
    String? clientName,
    String? clientEmail,
    String? clientPhone,
  }) async {
    final saleId = await _createPendingSale(
      sellerId: sellerId,
      items: items,
      paymentMethod: 'cash',
      clientName: clientName,
      clientEmail: clientEmail,
      clientPhone: clientPhone,
    );
    await _client.rpc('mark_sale_paid', params: {'p_sale_id': saleId});
    return saleId;
  }

  /// Creates a sale + its line items in `pending_payment` and leaves it
  /// there — the caller opens the Mercado Pago checkout URL
  /// (`PaymentsRepository.createCheckoutUrl`), and `mark_sale_paid` is
  /// called later by the `mercadopago-webhook` Edge Function once payment
  /// is confirmed, not by the client.
  Future<String> createMercadoPagoSale({
    required String sellerId,
    required List<CartItem> items,
    String? clientName,
    String? clientEmail,
    String? clientPhone,
  }) {
    return _createPendingSale(
      sellerId: sellerId,
      items: items,
      paymentMethod: 'mercado_pago',
      clientName: clientName,
      clientEmail: clientEmail,
      clientPhone: clientPhone,
    );
  }
}
