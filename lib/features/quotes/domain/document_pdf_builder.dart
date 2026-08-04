import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../../app/theme/aura_essence_tokens.dart';

class PdfLineItem {
  const PdfLineItem({
    required this.name,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  final String name;
  final double unitPrice;
  final int quantity;
  final double lineTotal;
}

/// Shared PDF layout for both sales tickets and quotes — parameterized by a
/// document type label so the two only differ in that heading.
///
/// Uses the PDF package's built-in Helvetica rather than bundling the Aura
/// Essence serif/sans TTFs (Libre Caslon Text / Hanken Grotesk) as assets —
/// the palette matches the design system, the typography doesn't. Bundle
/// the real font files under `assets/fonts/` and load them via
/// `pw.Font.ttf` here if exact type fidelity in the PDF matters later.
abstract class DocumentPdfBuilder {
  static Future<Uint8List> build({
    required String documentTypeLabel,
    required String documentId,
    required List<PdfLineItem> items,
    required double total,
    required String currency,
    String? clientName,
  }) async {
    final doc = pw.Document();
    final priceFormat = NumberFormat.simpleCurrency(name: currency);
    final onSurface = PdfColor.fromInt(AuraColors.onSurface.toARGB32());
    final outline = PdfColor.fromInt(AuraColors.outlineVariant.toARGB32());

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'Aura Research Fragrance',
                style: pw.TextStyle(fontSize: 20, color: onSurface),
              ),
              pw.SizedBox(height: 4),
              pw.Text(
                '$documentTypeLabel · ${documentId.substring(0, 8)}',
                style: pw.TextStyle(fontSize: 12, color: onSurface),
              ),
              if (clientName != null) ...[
                pw.SizedBox(height: 12),
                pw.Text(
                  'Para: $clientName',
                  style: pw.TextStyle(color: onSurface),
                ),
              ],
              pw.SizedBox(height: 20),
              pw.Table(
                border: pw.TableBorder(
                  horizontalInside: pw.BorderSide(color: outline),
                ),
                columnWidths: const {
                  0: pw.FlexColumnWidth(3),
                  1: pw.FlexColumnWidth(1),
                  2: pw.FlexColumnWidth(1),
                  3: pw.FlexColumnWidth(1),
                },
                children: [
                  pw.TableRow(
                    children: [
                      pw.Text(
                        'Producto',
                        style: pw.TextStyle(color: onSurface),
                      ),
                      pw.Text('Precio', style: pw.TextStyle(color: onSurface)),
                      pw.Text('Cant.', style: pw.TextStyle(color: onSurface)),
                      pw.Text('Total', style: pw.TextStyle(color: onSurface)),
                    ],
                  ),
                  for (final item in items)
                    pw.TableRow(
                      children: [
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(top: 6),
                          child: pw.Text(item.name),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(top: 6),
                          child: pw.Text(priceFormat.format(item.unitPrice)),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(top: 6),
                          child: pw.Text('${item.quantity}'),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(top: 6),
                          child: pw.Text(priceFormat.format(item.lineTotal)),
                        ),
                      ],
                    ),
                ],
              ),
              pw.SizedBox(height: 20),
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Text(
                  'Total: ${priceFormat.format(total)}',
                  style: pw.TextStyle(fontSize: 16, color: onSurface),
                ),
              ),
            ],
          );
        },
      ),
    );

    return doc.save();
  }
}
