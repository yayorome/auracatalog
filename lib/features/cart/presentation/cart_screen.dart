import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/router/app_router.dart';
import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/utils/app_return_url.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../../auth/domain/auth_providers.dart';
import '../../payments/domain/payments_providers.dart';
import '../../quotes/domain/quotes_providers.dart';
import '../../sales/domain/sales_providers.dart';
import '../domain/cart_providers.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _isSubmittingCash = false;
  bool _isSubmittingMercadoPago = false;
  bool _isSubmittingQuote = false;
  String? _errorMessage;

  bool get _isSubmitting =>
      _isSubmittingCash || _isSubmittingMercadoPago || _isSubmittingQuote;

  Future<void> _completeCashSale() async {
    final items = ref.read(cartProvider);
    final profile = ref.read(currentProfileProvider).value;
    if (items.isEmpty || profile == null) return;

    setState(() {
      _isSubmittingCash = true;
      _errorMessage = null;
    });
    try {
      await ref
          .read(salesRepositoryProvider)
          .completeCashSale(sellerId: profile.id, items: items);
      ref.read(cartProvider.notifier).clear();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Venta completada.')));
        // ref.read(goRouterProvider) rather than context.pop(): the
        // Provider-scoped GoRouter instance stays valid regardless of
        // widget-tree rebuilds triggered by the cartProvider.clear() call
        // just above, unlike a BuildContext captured across the await.
        ref.read(goRouterProvider).pop();
      }
    } on Object catch (e) {
      final message = e.toString().contains('insufficient_stock')
          ? 'No hay suficiente stock de uno de estos productos.'
          : 'No se pudo completar la venta: $e';
      setState(() => _errorMessage = message);
    } finally {
      if (mounted) setState(() => _isSubmittingCash = false);
    }
  }

  Future<void> _payWithMercadoPago() async {
    final items = ref.read(cartProvider);
    final profile = ref.read(currentProfileProvider).value;
    if (items.isEmpty || profile == null) return;

    setState(() {
      _isSubmittingMercadoPago = true;
      _errorMessage = null;
    });
    try {
      final saleId = await ref
          .read(salesRepositoryProvider)
          .createMercadoPagoSale(sellerId: profile.id, items: items);
      final checkoutUrl = await ref
          .read(paymentsRepositoryProvider)
          .createCheckoutUrl(
            saleId: saleId,
            returnBaseUrl: AppReturnUrl.current(),
          );
      await launchUrl(Uri.parse(checkoutUrl), webOnlyWindowName: '_blank');
      ref.read(cartProvider.notifier).clear();
      if (mounted) {
        ref.read(goRouterProvider).push(RoutePaths.paymentStatusPath(saleId));
      }
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo iniciar el pago: $e');
    } finally {
      if (mounted) setState(() => _isSubmittingMercadoPago = false);
    }
  }

  Future<void> _saveAsQuote() async {
    final items = ref.read(cartProvider);
    final profile = ref.read(currentProfileProvider).value;
    if (items.isEmpty || profile == null) return;

    setState(() {
      _isSubmittingQuote = true;
      _errorMessage = null;
    });
    try {
      final quoteId = await ref
          .read(quotesRepositoryProvider)
          .createQuote(sellerId: profile.id, items: items);
      // Unlike a completed sale, a quote hasn't sold anything yet -- the
      // cart stays as-is so the seller can still check out from it (or
      // adjust it) after generating/sharing the quote PDF.
      if (mounted) {
        ref.read(goRouterProvider).push(RoutePaths.quoteDetailPath(quoteId));
      }
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo guardar la cotización: $e');
    } finally {
      if (mounted) setState(() => _isSubmittingQuote = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final textTheme = Theme.of(context).textTheme;
    final priceFormat = NumberFormat.simpleCurrency(
      name: items.isEmpty ? 'MXN' : items.first.currency,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Carrito')),
      body: items.isEmpty
          ? const Center(child: Text('Tu carrito está vacío.'))
          : ResponsivePage(
              maxWidth: 640,
              child: Padding(
                padding: auraPagePadding(context),
                child: Column(
                  children: [
                    Expanded(
                      child: ListView.separated(
                        itemCount: items.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: AuraSpacing.unit),
                        itemBuilder: (context, index) {
                          final item = items[index];
                          return BentoTile(
                            padding: const EdgeInsets.all(AuraSpacing.unit * 2),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: textTheme.bodyLarge,
                                      ),
                                      Text(
                                        priceFormat.format(item.unitPrice),
                                        style: textTheme.labelLarge,
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: () => ref
                                      .read(cartProvider.notifier)
                                      .updateQuantity(
                                        item.productId,
                                        item.quantity - 1,
                                      ),
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: textTheme.bodyLarge,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline),
                                  onPressed: () => ref
                                      .read(cartProvider.notifier)
                                      .updateQuantity(
                                        item.productId,
                                        item.quantity + 1,
                                      ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: AuraSpacing.unit * 2),
                    BentoTile(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Total', style: textTheme.headlineMedium),
                              Text(
                                priceFormat.format(subtotal),
                                style: textTheme.headlineMedium,
                              ),
                            ],
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: AuraSpacing.unit),
                            Text(
                              _errorMessage!,
                              style: textTheme.bodyMedium?.copyWith(
                                color: AuraColors.error,
                              ),
                            ),
                          ],
                          const SizedBox(height: AuraSpacing.unit * 2),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : _completeCashSale,
                              child: _isSubmittingCash
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AuraColors.onPrimary,
                                      ),
                                    )
                                  : const Text('Completar venta (efectivo)'),
                            ),
                          ),
                          const SizedBox(height: AuraSpacing.unit),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : _payWithMercadoPago,
                              child: _isSubmittingMercadoPago
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text('Pagar en línea (Mercado Pago)'),
                            ),
                          ),
                          const SizedBox(height: AuraSpacing.unit),
                          SizedBox(
                            width: double.infinity,
                            child: TextButton(
                              onPressed: _isSubmitting ? null : _saveAsQuote,
                              child: _isSubmittingQuote
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text('Guardar como cotización'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
