import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../sales/domain/sales_providers.dart';

/// Reached both from the cart (after opening the Mercado Pago checkout tab)
/// and from Mercado Pago's own redirect (`back_urls` in
/// create-payment-preference). Payment confirmation is async — the
/// `mercadopago-webhook` Edge Function is what actually calls
/// `mark_sale_paid`, on its own schedule after MP notifies it — so this
/// screen just reflects whatever `saleStreamProvider` reports right now via
/// Realtime, it doesn't poll or drive the transition itself.
class PaymentStatusScreen extends ConsumerWidget {
  const PaymentStatusScreen({super.key, required this.saleId});

  final String saleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saleAsync = ref.watch(saleStreamProvider(saleId));
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Estado del pago')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AuraSpacing.marginMobile),
          child: BentoTile(
            child: saleAsync.when(
              loading: () => const SizedBox(
                height: 80,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, stackTrace) => Text('Error: $error'),
              data: (sale) {
                final status = sale?['status'] as String?;
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _statusContent(status, textTheme),
                    const SizedBox(height: AuraSpacing.unit * 3),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.go(RoutePaths.catalog),
                        child: const Text('Volver al catálogo'),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _statusContent(String? status, TextTheme textTheme) {
    switch (status) {
      case 'paid':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_outline,
              color: AuraColors.tertiary,
              size: 40,
            ),
            const SizedBox(height: AuraSpacing.unit),
            Text('Pago confirmado', style: textTheme.headlineMedium),
            Text(
              'El inventario ha sido actualizado.',
              style: textTheme.bodyMedium,
            ),
          ],
        );
      case 'pending_payment':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(height: AuraSpacing.unit * 2),
            Text(
              'Esperando confirmación de pago…',
              style: textTheme.headlineMedium,
            ),
            Text(
              'Esto se actualiza automáticamente cuando Mercado Pago confirme el pago.',
              style: textTheme.bodyMedium,
            ),
          ],
        );
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AuraColors.error, size: 40),
            const SizedBox(height: AuraSpacing.unit),
            Text('Venta no encontrada', style: textTheme.headlineMedium),
          ],
        );
    }
  }
}
