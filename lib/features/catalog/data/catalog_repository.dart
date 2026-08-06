import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/product.dart';

class CatalogRepository {
  CatalogRepository(this._client);

  final SupabaseClient _client;

  static const _bucket = 'product-photos';

  String? _primaryImageUrl(List<dynamic>? images) {
    if (images == null || images.isEmpty) return null;
    final sorted = [...images]
      ..sort((a, b) => (a['position'] as int).compareTo(b['position'] as int));
    final path = sorted.first['storage_path'] as String;
    return _client.storage.from(_bucket).getPublicUrl(path);
  }

  /// Ordered by `units_sold` descending (ties broken alphabetically) so
  /// `CatalogScreen` can just take the first row of the (optionally
  /// category-filtered) list as the featured/"destacado" product -- the
  /// best seller, not whichever name happens to sort first.
  Future<List<Product>> fetchProducts() async {
    final rows = await _client
        .from('products')
        .select('*, product_images(storage_path, position)')
        .eq('is_active', true)
        .order('units_sold', ascending: false)
        // supabase's .order() defaults to ascending: false -- without this
        // explicit true, the tiebreaker silently sorted Z-A instead of A-Z.
        .order('name', ascending: true);
    return rows
        .map(
          (row) => Product.fromRow(
            row,
            imageUrl: _primaryImageUrl(row['product_images'] as List<dynamic>?),
          ),
        )
        .toList();
  }

  Future<Product> fetchProduct(String productId) async {
    final row = await _client
        .from('products')
        .select('*, product_images(storage_path, position)')
        .eq('id', productId)
        .single();
    return Product.fromRow(
      row,
      imageUrl: _primaryImageUrl(row['product_images'] as List<dynamic>?),
    );
  }
}
