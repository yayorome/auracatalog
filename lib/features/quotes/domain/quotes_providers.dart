import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/supabase/supabase_client_provider.dart';
import '../data/quotes_repository.dart';
import 'quote.dart';

final quotesRepositoryProvider = Provider<QuotesRepository>((ref) {
  return QuotesRepository(ref.watch(supabaseClientProvider));
});

final quoteProvider = FutureProvider.family<Quote, String>((ref, quoteId) {
  return ref.watch(quotesRepositoryProvider).fetchQuote(quoteId);
});
