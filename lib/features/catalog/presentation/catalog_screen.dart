import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/domain/auth_providers.dart';
import '../../cart/domain/cart_providers.dart';
import '../domain/catalog_providers.dart';
import '../domain/product.dart';

/// Visual reference: Stitch screen "Catálogo de Perfumes"
/// (projects/17428257875776255847/screens/9466d9a07f32473db700d8b565fae3f4).
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key, required this.user});

  final AppUser user;

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsProvider);
    final cartCount = ref.watch(cartItemCountProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.user.isOwner ? 'Panel' : 'Aura Research'),
        actions: [
          if (widget.user.isOwner) ...[
            IconButton(
              icon: const Icon(Icons.bar_chart_outlined),
              tooltip: 'Reportes',
              onPressed: () => context.push(RoutePaths.reports),
            ),
            IconButton(
              icon: const Icon(Icons.people_outline),
              tooltip: 'Usuarios',
              onPressed: () => context.push(RoutePaths.users),
            ),
          ],
          IconButton(
            icon: Badge(
              label: Text('$cartCount'),
              isLabelVisible: cartCount > 0,
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            tooltip: 'Carrito',
            onPressed: () => context.push(RoutePaths.cart),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
          ),
        ],
      ),
      floatingActionButton: widget.user.isOwner
          ? FloatingActionButton.extended(
              onPressed: () => context.push(RoutePaths.productNew),
              icon: const Icon(Icons.add),
              label: const Text('Agregar producto'),
            )
          : null,
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) =>
            Center(child: Text('Error al cargar el catálogo: $error')),
        data: (products) {
          if (products.isEmpty) {
            return const Center(child: Text('Aún no hay productos.'));
          }

          final categories = <String>{
            for (final product in products)
              if (product.category != null && product.category!.isNotEmpty)
                product.category!,
          }.toList()..sort();

          final filtered = _selectedCategory == null
              ? products
              : products
                    .where((product) => product.category == _selectedCategory)
                    .toList();

          final featured = filtered.isNotEmpty ? filtered.first : null;
          final rest = filtered.length > 1 ? filtered.sublist(1) : const [];

          return ResponsivePage(
            maxWidth: 1400,
            child: CustomScrollView(
              slivers: [
                if (categories.isNotEmpty)
                  SliverPadding(
                    padding: auraPagePadding(
                      context,
                    ).copyWith(bottom: AuraSpacing.unit),
                    sliver: SliverToBoxAdapter(
                      child: SizedBox(
                        height: 40,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _CategoryChip(
                              label: 'Todos',
                              selected: _selectedCategory == null,
                              onTap: () =>
                                  setState(() => _selectedCategory = null),
                            ),
                            for (final category in categories)
                              Padding(
                                padding: const EdgeInsets.only(
                                  left: AuraSpacing.unit,
                                ),
                                child: _CategoryChip(
                                  label: category,
                                  selected: _selectedCategory == category,
                                  onTap: () => setState(
                                    () => _selectedCategory = category,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (featured != null)
                  SliverPadding(
                    padding: EdgeInsets.only(
                      left: auraPagePadding(context).left,
                      right: auraPagePadding(context).right,
                      bottom: AuraSpacing.bentoGap,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _FeaturedProductCard(product: featured),
                    ),
                  ),
                SliverPadding(
                  padding: EdgeInsets.only(
                    left: auraPagePadding(context).left,
                    right: auraPagePadding(context).right,
                    bottom: auraPagePadding(context).bottom,
                  ),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 280,
                          mainAxisSpacing: AuraSpacing.bentoGap,
                          crossAxisSpacing: AuraSpacing.bentoGap,
                          childAspectRatio: 0.72,
                        ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _ProductCard(product: rest[index]),
                      childCount: rest.length,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _QuickAddButton extends ConsumerWidget {
  const _QuickAddButton({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Material(
      color: AuraColors.primary,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: product.inStock
            ? () {
                ref.read(cartProvider.notifier).addProduct(product);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${product.name} agregado')),
                );
              }
            : null,
        child: const Padding(
          padding: EdgeInsets.all(6),
          child: Icon(Icons.add, color: AuraColors.onPrimary, size: 18),
        ),
      ),
    );
  }
}

class _FeaturedProductCard extends StatelessWidget {
  const _FeaturedProductCard({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final priceFormat = NumberFormat.simpleCurrency(name: product.currency);
    return InkWell(
      borderRadius: BorderRadius.circular(AuraRadii.lg),
      onTap: () => context.push(RoutePaths.productDetailPath(product.id)),
      child: BentoTile(
        padding: const EdgeInsets.all(AuraSpacing.unit * 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AuraRadii.md),
              child: SizedBox(
                width: 120,
                height: 120,
                child: product.imageUrl == null
                    ? const ColoredBox(
                        color: AuraColors.surfaceContainerHigh,
                        child: Icon(
                          Icons.local_florist_outlined,
                          color: AuraColors.outline,
                        ),
                      )
                    : CachedNetworkImage(
                        imageUrl: product.imageUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const Icon(
                          Icons.broken_image_outlined,
                          color: AuraColors.outline,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: AuraSpacing.unit * 2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'DESTACADO',
                    style: textTheme.labelSmall?.copyWith(
                      color: AuraColors.tertiary,
                    ),
                  ),
                  const SizedBox(height: AuraSpacing.unit / 2),
                  Text(
                    product.name,
                    style: textTheme.headlineMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (product.description != null) ...[
                    const SizedBox(height: AuraSpacing.unit / 2),
                    Text(
                      product.description!,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AuraColors.onSurfaceVariant,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: AuraSpacing.unit),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            priceFormat.format(product.price),
                            style: textTheme.labelLarge,
                          ),
                          if (product.milliliters != null) ...[
                            const SizedBox(width: AuraSpacing.unit / 2),
                            Text(
                              '${product.milliliters} ml',
                              style: textTheme.bodySmall?.copyWith(
                                color: AuraColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                      _QuickAddButton(product: product),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final priceFormat = NumberFormat.simpleCurrency(name: product.currency);
    return InkWell(
      borderRadius: BorderRadius.circular(AuraRadii.lg),
      onTap: () => context.push(RoutePaths.productDetailPath(product.id)),
      child: BentoTile(
        padding: const EdgeInsets.all(AuraSpacing.unit * 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AuraRadii.md),
                    child: SizedBox.expand(
                      child: product.imageUrl == null
                          ? const ColoredBox(
                              color: AuraColors.surfaceContainerHigh,
                              child: Icon(
                                Icons.local_florist_outlined,
                                color: AuraColors.outline,
                              ),
                            )
                          : CachedNetworkImage(
                              imageUrl: product.imageUrl!,
                              fit: BoxFit.cover,
                              errorWidget: (context, url, error) => const Icon(
                                Icons.broken_image_outlined,
                                color: AuraColors.outline,
                              ),
                            ),
                    ),
                  ),
                  Positioned(
                    right: 6,
                    bottom: 6,
                    child: _QuickAddButton(product: product),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AuraSpacing.unit),
            Text(
              product.name,
              style: textTheme.bodyLarge,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AuraSpacing.unit / 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  priceFormat.format(product.price),
                  style: textTheme.labelLarge,
                ),
                if (product.milliliters != null) ...[
                  const SizedBox(width: AuraSpacing.unit / 2),
                  Text(
                    '${product.milliliters} ml',
                    style: textTheme.bodySmall?.copyWith(
                      color: AuraColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
            if (!product.inStock)
              Text(
                'Agotado',
                style: textTheme.labelSmall?.copyWith(color: AuraColors.error),
              ),
          ],
        ),
      ),
    );
  }
}
