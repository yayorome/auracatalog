/// Central route path constants — no raw route strings anywhere else.
abstract class RoutePaths {
  static const login = '/login';
  static const setPassword = '/set-password';
  static const catalog = '/catalog';
  static const productDetail = '/catalog/:productId';
  static const productNew = '/catalog/new';
  static const productEdit = '/catalog/:productId/edit';
  static const cart = '/cart';
  static const quoteDetail = '/quotes/:quoteId';
  static const reports = '/reports';
  static const users = '/users';

  static String productDetailPath(String productId) => '/catalog/$productId';
  static String productEditPath(String productId) => '/catalog/$productId/edit';
  static String quoteDetailPath(String quoteId) => '/quotes/$quoteId';
}
