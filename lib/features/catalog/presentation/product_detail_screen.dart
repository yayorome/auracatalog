import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../../auth/domain/auth_providers.dart';
import '../../cart/domain/cart_providers.dart';
import '../domain/catalog_providers.dart';

/// Visual reference: Stitch screen "Detalle del Producto"
/// (projects/17428257875776255847/screens/e3c04f79e3a347f09755a94f224ddf0c).
class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productProvider(productId));
    final isOwner = ref.watch(isOwnerProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (isOwner)
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Editar producto',
              onPressed: () =>
                  context.push(RoutePaths.productEditPath(productId)),
            ),
        ],
      ),
      body: productAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) =>
            Center(child: Text('Error al cargar el producto: $error')),
        data: (product) {
          final priceFormat = NumberFormat.simpleCurrency(
            name: product.currency,
          );
          return ResponsivePage(
            maxWidth: 720,
            child: SingleChildScrollView(
              padding: auraPagePadding(context),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.imageUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AuraRadii.lg),
                      child: AspectRatio(
                        aspectRatio: 1,
                        child: CachedNetworkImage(
                          imageUrl: product.imageUrl!,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  const SizedBox(height: AuraSpacing.unit * 3),
                  BentoTile(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (product.brand != null)
                          Text(
                            product.brand!.toUpperCase(),
                            style: textTheme.labelSmall?.copyWith(
                              color: AuraColors.onSurfaceVariant,
                            ),
                          ),
                        Text(product.name, style: textTheme.displayLarge),
                        const SizedBox(height: AuraSpacing.unit),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              priceFormat.format(product.price),
                              style: textTheme.headlineMedium,
                            ),
                            if (product.milliliters != null) ...[
                              const SizedBox(width: AuraSpacing.unit),
                              Text(
                                '${product.milliliters} ml',
                                style: textTheme.bodyMedium?.copyWith(
                                  color: AuraColors.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        if (product.description != null)
                          Text(
                            product.description!,
                            style: textTheme.bodyMedium,
                          ),
                        if (product.fragranceNotes.isNotEmpty) ...[
                          const SizedBox(height: AuraSpacing.unit * 2),
                          Text(
                            'NOTAS OLFATIVAS',
                            style: textTheme.labelSmall?.copyWith(
                              color: AuraColors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: AuraSpacing.unit),
                          Wrap(
                            spacing: AuraSpacing.unit,
                            runSpacing: AuraSpacing.unit,
                            children: product.fragranceNotes
                                .map((note) => _GlassChip(label: note))
                                .toList(),
                          ),
                        ],
                        const SizedBox(height: AuraSpacing.unit * 2),
                        Text(
                          product.inStock
                              ? '${product.stockQuantity} en stock'
                              : 'Agotado',
                          style: textTheme.labelLarge?.copyWith(
                            color: product.inStock
                                ? AuraColors.onSurfaceVariant
                                : AuraColors.error,
                          ),
                        ),
                        const SizedBox(height: AuraSpacing.unit * 3),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: product.inStock
                                ? () {
                                    ref
                                        .read(cartProvider.notifier)
                                        .addProduct(product);
                                    context.push(RoutePaths.cart);
                                  }
                                : null,
                            child: Text(
                              product.inStock
                                  ? 'Agregar al carrito · ${priceFormat.format(product.price)}'
                                  : 'Agotado',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _GlassChip extends StatelessWidget {
  const _GlassChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AuraRadii.full),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AuraSpacing.unit * 1.5,
            vertical: AuraSpacing.unit / 2,
          ),
          decoration: BoxDecoration(
            color: AuraColors.glassTile,
            borderRadius: BorderRadius.circular(AuraRadii.full),
            border: Border.all(color: AuraColors.outlineVariant),
          ),
          child: Text(label, style: Theme.of(context).textTheme.labelSmall),
        ),
      ),
    );
  }
}
