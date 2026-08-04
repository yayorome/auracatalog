/// Central route path constants — no raw route strings anywhere else.
abstract class RoutePaths {
  static const login = '/login';
  static const catalog = '/catalog';
  static const productDetail = '/catalog/:productId';
  static const productNew = '/catalog/new';
  static const productEdit = '/catalog/:productId/edit';
  static const cart = '/cart';
  static const paymentStatus = '/sales/:saleId/payment-status';
  static const quoteDetail = '/quotes/:quoteId';
  static const reports = '/reports';
  static const users = '/users';

  static String productDetailPath(String productId) => '/catalog/$productId';
  static String productEditPath(String productId) => '/catalog/$productId/edit';
  static String paymentStatusPath(String saleId) =>
      '/sales/$saleId/payment-status';
  static String quoteDetailPath(String quoteId) => '/quotes/$quoteId';
}
