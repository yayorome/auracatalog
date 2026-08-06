import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../sales/domain/sales_providers.dart';

/// Reached from the cart right after a Mercado Pago sale is created
/// (`checkoutUrl` passed via go_router `extra`, so the seller can copy/share
/// it) and from Mercado Pago's own redirect once the client pays
/// (`back_urls` in create-payment-preference; no `extra` in that case).
/// Payment confirmation is async -- the `mercadopago-webhook` Edge Function
/// is what actually calls `mark_sale_paid`, on its own schedule after MP
/// notifies it -- so this screen just reflects whatever `saleStreamProvider`
/// reports right now via Realtime, it doesn't poll or drive the transition
/// itself.
class PaymentStatusScreen extends ConsumerWidget {
  const PaymentStatusScreen({super.key, required this.saleId, this.checkoutUrl});

  final String saleId;
  final String? checkoutUrl;

  Future<void> _copyLink(BuildContext context) async {
    final url = checkoutUrl;
    if (url == null) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enlace copiado')));
    }
  }

  Future<void> _shareViaWhatsApp(Map<String, dynamic>? sale) async {
    final url = checkoutUrl;
    if (url == null) return;
    final message = Uri.encodeComponent(
      'Aquí tienes tu enlace de pago de Aura Research Fragrance: $url',
    );
    final phone = (sale?['client_phone'] as String?)?.replaceAll(
      RegExp(r'[^0-9]'),
      '',
    );
    final waUri = Uri.parse(
      (phone == null || phone.isEmpty)
          ? 'https://wa.me/?text=$message'
          : 'https://wa.me/$phone?text=$message',
    );
    await launchUrl(waUri, webOnlyWindowName: '_blank');
  }

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
                final showShareLink = checkoutUrl != null && status == 'pending_payment';
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _statusContent(status, textTheme),
                    if (showShareLink) ...[
                      const SizedBox(height: AuraSpacing.unit * 3),
                      Text('Enlace de pago', style: textTheme.titleMedium),
                      const SizedBox(height: AuraSpacing.unit),
                      SelectableText(checkoutUrl!, style: textTheme.bodySmall),
                      const SizedBox(height: AuraSpacing.unit * 2),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _copyLink(context),
                              icon: const Icon(Icons.copy_outlined),
                              label: const Text('Copiar'),
                            ),
                          ),
                          const SizedBox(width: AuraSpacing.unit),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _shareViaWhatsApp(sale),
                              icon: const Icon(Icons.chat_outlined),
                              label: const Text('WhatsApp'),
                            ),
                          ),
                        ],
                      ),
                    ],
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
