/// A line in the in-memory cart. Not persisted until checkout — the sale
/// only becomes a `sales`/`sale_items` row when the seller completes it
/// (see `SalesRepository.completeCashSale`).
class CartItem {
  const CartItem({
    required this.productId,
    required this.name,
    required this.unitPrice,
    required this.currency,
    required this.quantity,
  });

  final String productId;
  final String name;
  final double unitPrice;
  final String currency;
  final int quantity;

  double get lineTotal => unitPrice * quantity;

  CartItem copyWith({int? quantity}) => CartItem(
    productId: productId,
    name: name,
    unitPrice: unitPrice,
    currency: currency,
    quantity: quantity ?? this.quantity,
  );
}
