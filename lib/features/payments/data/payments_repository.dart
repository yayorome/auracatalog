import 'package:supabase_flutter/supabase_flutter.dart';

/// Calls the `create-payment-preference` Edge Function, which holds the
/// Mercado Pago access token server-side and returns a hosted checkout URL.
/// This repository never sees the access token itself.
class PaymentsRepository {
  PaymentsRepository(this._client);

  final SupabaseClient _client;

  Future<String> createCheckoutUrl({
    required String saleId,
    required String returnBaseUrl,
  }) async {
    final response = await _client.functions.invoke(
      'create-payment-preference',
      body: {'sale_id': saleId, 'return_base_url': returnBaseUrl},
    );
    if (response.status != 200) {
      throw Exception(
        'No se pudo crear la preferencia de pago: ${response.data}',
      );
    }
    final data = response.data as Map<String, dynamic>;
    final url =
        data['init_point'] as String? ?? data['sandbox_init_point'] as String?;
    if (url == null) {
      throw Exception(
        'La respuesta de Mercado Pago no incluyó una URL de pago',
      );
    }
    return url;
  }
}
