import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../data/catalog_repository.dart';
import 'product.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  return CatalogRepository(ref.watch(supabaseClientProvider));
});

final productsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(catalogRepositoryProvider).fetchProducts();
});

final productProvider = FutureProvider.family<Product, String>((
  ref,
  productId,
) {
  return ref.watch(catalogRepositoryProvider).fetchProduct(productId);
});
