import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../domain/auth_providers.dart';

/// Visual reference: Stitch screen "Login - Auraresearchp"
/// (projects/17428257875776255847/screens/14b07af9ae2e4de3a702b091fe5176e0).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
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
          .signInWithPassword(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      // Successful sign-in updates authStateChangesProvider, which the
      // router's redirect reacts to — no manual navigation needed here.
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo iniciar sesión: $e');
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
                            ClipRRect(
                              borderRadius: BorderRadius.circular(
                                AuraRadii.md,
                              ),
                              child: Image.asset(
                                'lib/assets/logo.webp',
                                width: 56,
                                height: 56,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(height: AuraSpacing.unit * 2),
                            Text(
                              'Aura Research',
                              style: textTheme.displayLarge,
                            ),
                            Text('Fragrance', style: textTheme.headlineMedium),
                            const SizedBox(height: AuraSpacing.unit),
                            Text(
                              'Descubre el mundo de la ciencia olfativa.',
                              style: textTheme.bodyMedium?.copyWith(
                                color: AuraColors.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: AuraSpacing.unit * 3),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                labelText: 'Correo electrónico',
                              ),
                              validator: (value) =>
                                  (value == null || !value.contains('@'))
                                  ? 'Ingresa un correo válido'
                                  : null,
                            ),
                            const SizedBox(height: AuraSpacing.unit * 2),
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
                                  (value == null || value.isEmpty)
                                  ? 'Ingresa tu contraseña'
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
                                    : const Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text('Iniciar sesión'),
                                          SizedBox(width: AuraSpacing.unit),
                                          Icon(Icons.arrow_forward, size: 18),
                                        ],
                                      ),
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
