/// Domain model for a row in `public.products`, optionally joined with its
/// primary (position 0) image's public URL.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.brand,
    required this.sku,
    required this.price,
    required this.currency,
    required this.stockQuantity,
    required this.category,
    required this.fragranceNotes,
    required this.isActive,
    required this.imageUrl,
    required this.unitsSold,
    this.milliliters,
  });

  factory Product.fromRow(Map<String, dynamic> row, {String? imageUrl}) {
    return Product(
      id: row['id'] as String,
      name: row['name'] as String,
      description: row['description'] as String?,
      brand: row['brand'] as String?,
      sku: row['sku'] as String?,
      price: (row['price'] as num).toDouble(),
      currency: row['currency'] as String,
      stockQuantity: row['stock_quantity'] as int,
      category: row['category'] as String?,
      fragranceNotes:
          (row['fragrance_notes'] as List<dynamic>?)?.cast<String>() ??
          const [],
      isActive: row['is_active'] as bool,
      imageUrl: imageUrl,
      unitsSold: row['units_sold'] as int? ?? 0,
      milliliters: row['milliliters'] as int?,
    );
  }

  final String id;
  final String name;
  final String? description;
  final String? brand;
  final String? sku;
  final double price;
  final String currency;
  final int stockQuantity;
  final String? category;
  final List<String> fragranceNotes;
  final bool isActive;
  final String? imageUrl;
  final int unitsSold;
  final int? milliliters;

  bool get inStock => stockQuantity > 0;
}
