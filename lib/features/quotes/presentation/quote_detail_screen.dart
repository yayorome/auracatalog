import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../domain/document_pdf_builder.dart';
import '../domain/quote.dart';
import '../domain/quotes_providers.dart';

/// Visual reference: no matching Stitch screen yet — generate one via
/// `generate_screen_from_text` against the "Aura Essence" design system
/// when refining this screen's design.
class QuoteDetailScreen extends ConsumerStatefulWidget {
  const QuoteDetailScreen({super.key, required this.quoteId});

  final String quoteId;

  @override
  ConsumerState<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends ConsumerState<QuoteDetailScreen> {
  Uint8List? _pdfBytes;
  bool _isGenerating = false;
  bool _isSharingWhatsApp = false;
  bool _isConverting = false;
  String? _errorMessage;

  /// Locale-independent dd/mm/yyyy -- avoids depending on
  /// `initializeDateFormatting()`, which nothing in this app calls, so a
  /// locale-aware `DateFormat.yMMMd('es_MX')` would throw at runtime.
  String _formatDate(DateTime date) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(date.day)}/${two(date.month)}/${date.year}';
  }

  Future<Uint8List> _buildBytes(Quote quote) {
    return DocumentPdfBuilder.build(
      documentTypeLabel: 'Cotización',
      documentId: quote.id,
      items: [
        for (final item in quote.items)
          PdfLineItem(
            name: item.productNameSnapshot,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          ),
      ],
      total: quote.total,
      currency: quote.currency,
      clientName: quote.clientName,
    );
  }

  Future<void> _generateAndUpload(Quote quote) async {
    setState(() {
      _isGenerating = true;
      _errorMessage = null;
    });
    try {
      final bytes = await _buildBytes(quote);
      await ref
          .read(quotesRepositoryProvider)
          .uploadQuotePdf(quoteId: quote.id, bytes: bytes);
      ref.invalidate(quoteProvider(quote.id));
      setState(() => _pdfBytes = bytes);
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo generar el PDF: $e');
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _shareViaWhatsApp(Quote quote) async {
    setState(() {
      _isSharingWhatsApp = true;
      _errorMessage = null;
    });
    try {
      final path = 'quotes/${quote.id}.pdf';
      final signedUrl = await ref
          .read(quotesRepositoryProvider)
          .createSignedUrl(path);
      final message = Uri.encodeComponent(
        'Aquí tienes tu cotización de Aura Research Fragrance: $signedUrl',
      );
      // wa.me can only carry a link, not a binary attachment -- the shared
      // message points at the same signed Storage URL used for email.
      final phone = quote.clientPhone?.replaceAll(RegExp(r'[^0-9]'), '');
      final waUri = Uri.parse(
        (phone == null || phone.isEmpty)
            ? 'https://wa.me/?text=$message'
            : 'https://wa.me/$phone?text=$message',
      );
      await launchUrl(waUri, webOnlyWindowName: '_blank');
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo compartir por WhatsApp: $e');
    } finally {
      if (mounted) setState(() => _isSharingWhatsApp = false);
    }
  }

  Future<void> _convertToSale(Quote quote) async {
    setState(() {
      _isConverting = true;
      _errorMessage = null;
    });
    try {
      await ref.read(quotesRepositoryProvider).convertToSale(quote.id);
      ref.invalidate(quoteProvider(quote.id));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cotización convertida a venta.')),
        );
      }
    } on Object catch (e) {
      final text = e.toString();
      final message = text.contains('insufficient_stock')
          ? 'No hay suficiente stock de uno de estos productos.'
          : text.contains('quote_expired')
          ? 'La cotización expiró.'
          : text.contains('quote_not_convertible')
          ? 'Esta cotización ya no puede convertirse.'
          : 'No se pudo convertir la cotización: $e';
      setState(() => _errorMessage = message);
    } finally {
      if (mounted) setState(() => _isConverting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quoteAsync = ref.watch(quoteProvider(widget.quoteId));
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Cotización')),
      body: quoteAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) =>
            Center(child: Text('Error al cargar la cotización: $error')),
        data: (quote) {
          final priceFormat = NumberFormat.simpleCurrency(name: quote.currency);
          final hasPdf = _pdfBytes != null || quote.status != QuoteStatus.draft;
          final isConverted = quote.status == QuoteStatus.converted;
          final isExpired = quote.isExpired;
          final isActionable = !isConverted && !isExpired;
          return ResponsivePage(
            maxWidth: 720,
            child: SingleChildScrollView(
              padding: auraPagePadding(context),
              child: BentoTile(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Cotización', style: textTheme.displayLarge),
                    if (quote.clientName != null)
                      Text(
                        'Para: ${quote.clientName}',
                        style: textTheme.bodyLarge,
                      ),
                    if (isConverted)
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AuraSpacing.unit / 2,
                        ),
                        child: Text(
                          'Convertida a venta'
                          '${quote.convertedSaleId != null ? ' (#${quote.convertedSaleId!.substring(0, 8)})' : ''}.',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AuraColors.tertiary,
                          ),
                        ),
                      )
                    else if (isExpired)
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AuraSpacing.unit / 2,
                        ),
                        child: Text(
                          'Esta cotización expiró'
                          '${quote.expiresAt != null ? ' el ${_formatDate(quote.expiresAt!)}' : ''}.',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AuraColors.error,
                          ),
                        ),
                      )
                    else if (quote.expiresAt != null)
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AuraSpacing.unit / 2,
                        ),
                        child: Text(
                          'Válida hasta el '
                          '${_formatDate(quote.expiresAt!)}.',
                          style: textTheme.bodySmall,
                        ),
                      ),
                    const SizedBox(height: AuraSpacing.unit * 2),
                    for (final item in quote.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AuraSpacing.unit / 2,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.productNameSnapshot} × ${item.quantity}',
                                style: textTheme.bodyMedium,
                              ),
                            ),
                            Text(
                              priceFormat.format(item.lineTotal),
                              style: textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    const Divider(height: AuraSpacing.unit * 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total', style: textTheme.headlineMedium),
                        Text(
                          priceFormat.format(quote.total),
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
                    if (isActionable) ...[
                      const SizedBox(height: AuraSpacing.unit * 3),
                      if (!hasPdf)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isGenerating
                                ? null
                                : () => _generateAndUpload(quote),
                            child: _isGenerating
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AuraColors.onPrimary,
                                    ),
                                  )
                                : const Text('Generar PDF'),
                          ),
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSharingWhatsApp
                                ? null
                                : () => _shareViaWhatsApp(quote),
                            child: _isSharingWhatsApp
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AuraColors.onPrimary,
                                    ),
                                  )
                                : const Text('Compartir por WhatsApp'),
                          ),
                        ),
                      const SizedBox(height: AuraSpacing.unit),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _isConverting
                              ? null
                              : () => _convertToSale(quote),
                          child: _isConverting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Convertir a venta (efectivo)'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
