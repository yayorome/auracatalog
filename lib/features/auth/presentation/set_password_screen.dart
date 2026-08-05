import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/router/app_router.dart';
import '../../../app/router/route_paths.dart';
import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../domain/auth_providers.dart';

/// Shown instead of the catalog right after an invite or password-recovery
/// link signs the user in (see [needsPasswordSetupProvider]) -- the link
/// itself only establishes a session, it never sets a password the user
/// can log in with again later. This screen is what actually does that.
class SetPasswordScreen extends ConsumerStatefulWidget {
  const SetPasswordScreen({super.key});

  @override
  ConsumerState<SetPasswordScreen> createState() => _SetPasswordScreenState();
}

class _SetPasswordScreenState extends ConsumerState<SetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .updatePassword(_passwordController.text);
      ref.read(needsPasswordSetupProvider.notifier).clear();
      // ref.read(goRouterProvider) rather than context.go(): navigation
      // after an await needs the Provider-scoped GoRouter, not the
      // BuildContext extension (see CLAUDE.md's go_router async-gap note).
      if (mounted) ref.read(goRouterProvider).go(RoutePaths.catalog);
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo establecer la contraseña: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Padding(
                    padding: const EdgeInsets.all(AuraSpacing.marginMobile),
                    child: BentoTile(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Crea tu contraseña', style: textTheme.displayLarge),
                            const SizedBox(height: AuraSpacing.unit),
                            Text(
                              'Elige una contraseña para tu cuenta de Aura Research Fragrance.',
                              style: textTheme.bodyMedium?.copyWith(
                                color: AuraColors.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: AuraSpacing.unit * 3),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              decoration: InputDecoration(
                                labelText: 'Contraseña',
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                ),
                              ),
                              validator: (value) =>
                                  (value == null || value.length < 8)
                                  ? 'Mínimo 8 caracteres'
                                  : null,
                            ),
                            const SizedBox(height: AuraSpacing.unit * 2),
                            TextFormField(
                              controller: _confirmController,
                              obscureText: _obscurePassword,
                              decoration: const InputDecoration(
                                labelText: 'Confirmar contraseña',
                              ),
                              validator: (value) =>
                                  value != _passwordController.text
                                  ? 'Las contraseñas no coinciden'
                                  : null,
                              onFieldSubmitted: (_) => _submit(),
                            ),
                            if (_errorMessage != null) ...[
                              const SizedBox(height: AuraSpacing.unit * 2),
                              Text(
                                _errorMessage!,
                                style: textTheme.bodyMedium?.copyWith(
                                  color: AuraColors.error,
                                ),
                              ),
                            ],
                            const SizedBox(height: AuraSpacing.unit * 3),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _isSubmitting ? null : _submit,
                                child: _isSubmitting
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AuraColors.onPrimary,
                                        ),
                                      )
                                    : const Text('Guardar contraseña'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
