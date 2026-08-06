import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

/// Owner-only writes to `products`/`product_images`/Storage. RLS backs this
/// up server-side (`products_write_owner`, `product_photos_owner_write`) —
/// this repository doesn't re-check the role, it just calls the API and
/// lets a non-owner request fail server-side.
class InventoryRepository {
  InventoryRepository(this._client);

  final SupabaseClient _client;
  static const _bucket = 'product-photos';
  static const _uuid = Uuid();

  Future<String> createProduct({
    required String name,
    required String? description,
    required String? brand,
    required String? sku,
    required double price,
    required String currency,
    required int stockQuantity,
    required String? category,
    required List<String> fragranceNotes,
    required int? milliliters,
  }) async {
    final row = await _client
        .from('products')
        .insert({
          'name': name,
          'description': description,
          'brand': brand,
          'sku': sku,
          'price': price,
          'currency': currency,
          'stock_quantity': stockQuantity,
          'category': category,
          'fragrance_notes': fragranceNotes,
          'milliliters': milliliters,
        })
        .select('id')
        .single();
    return row['id'] as String;
  }

  Future<void> updateProduct({
    required String productId,
    required String name,
    required String? description,
    required String? brand,
    required String? sku,
    required double price,
    required String currency,
    required int stockQuantity,
    required String? category,
    required List<String> fragranceNotes,
    required int? milliliters,
  }) async {
    await _client
        .from('products')
        .update({
          'name': name,
          'description': description,
          'brand': brand,
          'sku': sku,
          'price': price,
          'currency': currency,
          'stock_quantity': stockQuantity,
          'category': category,
          'fragrance_notes': fragranceNotes,
          'milliliters': milliliters,
        })
        .eq('id', productId);
  }

  /// Soft-deletes the product by hiding it from the catalog
  /// (`CatalogRepository.fetchProducts` filters on `is_active`), keeping
  /// sale/quote/inventory history intact — a hard `DELETE` would violate
  /// the `NO ACTION` foreign keys those tables hold on `products.id` for any
  /// product that has ever been sold or quoted. Blocked server-side by the
  /// `products_prevent_deactivate_with_stock` trigger unless stock is 0
  /// (throws a `product_has_stock` [PostgrestException] otherwise), mirroring
  /// how `mark_sale_paid` throws `insufficient_stock`.
  Future<void> deactivateProduct(String productId) async {
    await _client
        .from('products')
        .update({'is_active': false})
        .eq('id', productId);
  }

  /// Replaces the product's photo set with a single primary image (Phase-2
  /// scope is one photo per product; `product_images.position` leaves room
  /// for a multi-photo gallery later without a schema change).
  Future<void> replacePrimaryPhoto({
    required String productId,
    required Uint8List bytes,
    required String fileExtension,
  }) async {
    final path = '$productId/${_uuid.v4()}.$fileExtension';
    await _client.storage
        .from(_bucket)
        .uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: 'image/$fileExtension',
            upsert: true,
          ),
        );

    final existing = await _client
        .from('product_images')
        .select('id, storage_path')
        .eq('product_id', productId);

    await _client.from('product_images').insert({
      'product_id': productId,
      'storage_path': path,
      'position': 0,
    });

    for (final row in existing) {
      await _client.from('product_images').delete().eq('id', row['id']);
      await _client.storage.from(_bucket).remove([
        row['storage_path'] as String,
      ]);
    }
  }
}
