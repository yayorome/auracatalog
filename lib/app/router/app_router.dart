import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/domain/auth_providers.dart';
import '../../features/auth/presentation/auth_gate.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/set_password_screen.dart';
import '../../features/cart/presentation/cart_screen.dart';
import '../../features/catalog/presentation/product_detail_screen.dart';
import '../../features/inventory/presentation/product_form_screen.dart';
import '../../features/payments/presentation/payment_status_screen.dart';
import '../../features/quotes/presentation/quote_detail_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/users/presentation/user_management_screen.dart';
import 'go_router_refresh_stream.dart';
import 'route_paths.dart';

/// The single global [GoRouter], exposed as a provider so it can depend on
/// [authRepositoryProvider] and rebuild routes reactively.
///
/// Only authenticated-vs-not is enforced here (redirect unauthenticated ->
/// /login, authenticated away from /login -> /catalog), plus a mandatory
/// detour to /set-password when [needsPasswordSetupProvider] is set (see
/// its doc comment -- an invite/recovery link signs the user in without
/// ever giving them a password). Owner-only routes (productNew/productEdit)
/// are not redirect-gated yet — their screens are unreachable from Seller
/// UI (no button navigates there) and every write they perform is enforced
/// server-side by RLS regardless. Add an explicit redirect check once a
/// Seller-hostile deep link becomes a real concern.
final goRouterProvider = Provider<GoRouter>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);

  return GoRouter(
    initialLocation: RoutePaths.catalog,
    refreshListenable: GoRouterRefreshStream(authRepository.authStateChanges),
    redirect: (context, state) {
      final isAuthenticated = authRepository.currentUser != null;
      final isGoingToLogin = state.matchedLocation == RoutePaths.login;
      final isGoingToSetPassword =
          state.matchedLocation == RoutePaths.setPassword;

      if (!isAuthenticated && !isGoingToLogin) return RoutePaths.login;
      if (isAuthenticated && isGoingToLogin) return RoutePaths.catalog;
      if (isAuthenticated &&
          ref.read(needsPasswordSetupProvider) &&
          !isGoingToSetPassword) {
        return RoutePaths.setPassword;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: RoutePaths.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.setPassword,
        builder: (context, state) => const SetPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.catalog,
        builder: (context, state) => const AuthGate(),
      ),
      GoRoute(
        path: RoutePaths.productNew,
        builder: (context, state) => const ProductFormScreen(),
      ),
      GoRoute(
        path: RoutePaths.productDetail,
        builder: (context, state) =>
            ProductDetailScreen(productId: state.pathParameters['productId']!),
      ),
      GoRoute(
        path: RoutePaths.productEdit,
        builder: (context, state) =>
            ProductFormScreen(productId: state.pathParameters['productId']!),
      ),
      GoRoute(
        path: RoutePaths.cart,
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: RoutePaths.paymentStatus,
        builder: (context, state) => PaymentStatusScreen(
          saleId: state.pathParameters['saleId']!,
          checkoutUrl: state.extra as String?,
        ),
      ),
      GoRoute(
        path: RoutePaths.quoteDetail,
        builder: (context, state) =>
            QuoteDetailScreen(quoteId: state.pathParameters['quoteId']!),
      ),
      GoRoute(
        path: RoutePaths.reports,
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: RoutePaths.users,
        builder: (context, state) => const UserManagementScreen(),
      ),
    ],
  );
});
