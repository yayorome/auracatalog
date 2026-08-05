import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/router/app_router.dart';
import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../../catalog/domain/catalog_providers.dart';
import '../../catalog/domain/product.dart';
import '../domain/inventory_providers.dart';

/// Owner-only create/edit form (visual reference: no matching Stitch
/// screen yet — generate one via `generate_screen_from_text` against the
/// "Aura Essence" design system when refining this screen's design).
/// `productId == null` means create mode.
class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.productId});

  final String? productId;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _skuController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController(text: '0');
  final _categoryController = TextEditingController();
  final _notesController = TextEditingController();
  final _descriptionController = TextEditingController();

  Uint8List? _pickedImageBytes;
  String? _pickedImageExtension;
  bool _isSaving = false;
  bool _isDeleting = false;
  bool _prefilled = false;
  String? _errorMessage;

  bool get _isEditing => widget.productId != null;

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _skuController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _categoryController.dispose();
    _notesController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _prefill(Product product) {
    if (_prefilled) return;
    _prefilled = true;
    _nameController.text = product.name;
    _brandController.text = product.brand ?? '';
    _skuController.text = product.sku ?? '';
    _priceController.text = product.price.toString();
    _stockController.text = product.stockQuantity.toString();
    _categoryController.text = product.category ?? '';
    _notesController.text = product.fragranceNotes.join(', ');
    _descriptionController.text = product.description ?? '';
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (file == null) return;

    var bytes = await file.readAsBytes();
    final extension = (file.name.split('.').last).toLowerCase();
    try {
      final compressed = await FlutterImageCompress.compressWithList(
        bytes,
        quality: 80,
        minWidth: 1024,
        minHeight: 1024,
      );
      bytes = compressed;
    } catch (_) {
      // Compression isn't critical to the feature — fall back to the
      // original bytes rather than blocking the upload.
    }

    setState(() {
      _pickedImageBytes = bytes;
      _pickedImageExtension = extension == 'jpg' ? 'jpeg' : extension;
    });
  }

  List<String> _parseNotes() => _notesController.text
      .split(',')
      .map((note) => note.trim())
      .where((note) => note.isNotEmpty)
      .toList();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });
    try {
      final repository = ref.read(inventoryRepositoryProvider);
      final price = double.parse(_priceController.text);
      final stock = int.parse(_stockController.text);

      String productId;
      if (_isEditing) {
        productId = widget.productId!;
        await repository.updateProduct(
          productId: productId,
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          brand: _brandController.text.trim().isEmpty
              ? null
              : _brandController.text.trim(),
          sku: _skuController.text.trim().isEmpty
              ? null
              : _skuController.text.trim(),
          price: price,
          currency: 'MXN',
          stockQuantity: stock,
          category: _categoryController.text.trim().isEmpty
              ? null
              : _categoryController.text.trim(),
          fragranceNotes: _parseNotes(),
        );
      } else {
        productId = await repository.createProduct(
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          brand: _brandController.text.trim().isEmpty
              ? null
              : _brandController.text.trim(),
          sku: _skuController.text.trim().isEmpty
              ? null
              : _skuController.text.trim(),
          price: price,
          currency: 'MXN',
          stockQuantity: stock,
          category: _categoryController.text.trim().isEmpty
              ? null
              : _categoryController.text.trim(),
          fragranceNotes: _parseNotes(),
        );
      }

      if (_pickedImageBytes != null) {
        await repository.replacePrimaryPhoto(
          productId: productId,
          bytes: _pickedImageBytes!,
          fileExtension: _pickedImageExtension ?? 'jpeg',
        );
      }

      ref.invalidate(productsProvider);
      ref.invalidate(productProvider(productId));
      if (mounted) context.pop();
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo guardar el producto: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _confirmDelete(Product product) async {
    if (product.stockQuantity != 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No se puede eliminar: quedan existencias en stock. '
            'Ajusta el stock a 0 antes de eliminar.',
          ),
        ),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar producto'),
        content: Text(
          '¿Eliminar "${product.name}"? Se ocultará del catálogo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      _isDeleting = true;
      _errorMessage = null;
    });
    try {
      await ref
          .read(inventoryRepositoryProvider)
          .deactivateProduct(widget.productId!);
      ref.invalidate(productsProvider);
      ref.invalidate(productProvider(widget.productId!));
      // ref.read(goRouterProvider) rather than context.pop(): navigation
      // after an await + provider invalidation needs the Provider-scoped
      // GoRouter (see CLAUDE.md's go_router async-gap note).
      if (mounted) ref.read(goRouterProvider).go(RoutePaths.catalog);
    } on Object catch (e) {
      final message = e.toString().contains('product_has_stock')
          ? 'No se puede eliminar: quedan existencias en stock.'
          : 'No se pudo eliminar el producto: $e';
      setState(() => _errorMessage = message);
    } finally {
      if (mounted) setState(() => _isDeleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = _isEditing
        ? ref.watch(productProvider(widget.productId!))
        : null;

    if (productAsync != null) {
      productAsync.whenData(_prefill);
    }

    final currentProduct = productAsync?.value;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Editar producto' : 'Agregar producto'),
        actions: [
          if (_isEditing)
            IconButton(
              icon: _isDeleting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.delete_outline),
              tooltip: 'Eliminar producto',
              onPressed: (_isDeleting || currentProduct == null)
                  ? null
                  : () => _confirmDelete(currentProduct),
            ),
        ],
      ),
      body: (productAsync != null && productAsync.isLoading)
          ? const Center(child: CircularProgressIndicator())
          : ResponsivePage(
              maxWidth: 720,
              child: SingleChildScrollView(
                padding: auraPagePadding(context),
                child: BentoTile(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _PhotoPicker(
                          bytes: _pickedImageBytes,
                          onTap: _pickImage,
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nombre',
                          ),
                          validator: (value) => (value == null || value.isEmpty)
                              ? 'Obligatorio'
                              : null,
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _brandController,
                          decoration: const InputDecoration(labelText: 'Marca'),
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _skuController,
                          decoration: const InputDecoration(labelText: 'SKU'),
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _priceController,
                                decoration: const InputDecoration(
                                  labelText: 'Precio',
                                ),
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                validator: (value) =>
                                    double.tryParse(value ?? '') == null
                                    ? 'Ingresa un precio válido'
                                    : null,
                              ),
                            ),
                            const SizedBox(width: AuraSpacing.unit * 2),
                            Expanded(
                              child: TextFormField(
                                controller: _stockController,
                                decoration: const InputDecoration(
                                  labelText: 'Cantidad en stock',
                                ),
                                keyboardType: TextInputType.number,
                                validator: (value) =>
                                    int.tryParse(value ?? '') == null
                                    ? 'Ingresa una cantidad válida'
                                    : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _categoryController,
                          decoration: const InputDecoration(
                            labelText: 'Categoría',
                          ),
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _notesController,
                          decoration: const InputDecoration(
                            labelText: 'Notas olfativas (separadas por comas)',
                          ),
                        ),
                        const SizedBox(height: AuraSpacing.unit * 2),
                        TextFormField(
                          controller: _descriptionController,
                          decoration: const InputDecoration(
                            labelText: 'Descripción',
                          ),
                          maxLines: 3,
                        ),
                        if (_errorMessage != null) ...[
                          const SizedBox(height: AuraSpacing.unit * 2),
                          Text(
                            _errorMessage!,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: AuraColors.error),
                          ),
                        ],
                        const SizedBox(height: AuraSpacing.unit * 3),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _submit,
                            child: _isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AuraColors.onPrimary,
                                    ),
                                  )
                                : Text(
                                    _isEditing
                                        ? 'Guardar cambios'
                                        : 'Agregar producto',
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({required this.bytes, required this.onTap});

  final Uint8List? bytes;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AuraRadii.md),
      onTap: onTap,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AuraRadii.md),
          child: bytes == null
              ? const ColoredBox(
                  color: AuraColors.surfaceContainerHigh,
                  child: Center(
                    child: Icon(
                      Icons.add_photo_alternate_outlined,
                      color: AuraColors.outline,
                    ),
                  ),
                )
              : Image.memory(bytes!, fit: BoxFit.cover),
        ),
      ),
    );
  }
}
