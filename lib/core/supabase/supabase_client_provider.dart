import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Exposes the singleton [SupabaseClient] initialized in `main.dart` via
/// `Supabase.initialize`. All feature repositories depend on this.
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});
