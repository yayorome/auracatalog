import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/aura_essence_tokens.dart';
import '../../../core/widgets/bento_tile.dart';
import '../../../core/widgets/responsive_page.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/domain/auth_providers.dart';
import '../domain/user_management_providers.dart';

/// Visual reference: no matching Stitch screen yet -- generate one via
/// `generate_screen_from_text` against the "Aura Essence" design system
/// when refining this screen's design.
class UserManagementScreen extends ConsumerWidget {
  const UserManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profilesAsync = ref.watch(allProfilesProvider);
    final currentUserId = ref.watch(currentProfileProvider).value?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Usuarios')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddUserDialog(context),
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Agregar usuario'),
      ),
      body: profilesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) =>
            Center(child: Text('Error al cargar los usuarios: $error')),
        data: (profiles) {
          if (profiles.isEmpty) {
            return const Center(child: Text('Aún no hay usuarios.'));
          }
          return ResponsivePage(
            maxWidth: 720,
            child: ListView.separated(
              padding: auraPagePadding(context),
              itemCount: profiles.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(height: AuraSpacing.unit),
              itemBuilder: (context, index) {
                final profile = profiles[index];
                return _UserTile(
                  profile: profile,
                  isSelf: profile.id == currentUserId,
                );
              },
            ),
          );
        },
      ),
    );
  }
}

void _showAddUserDialog(BuildContext context) {
  showDialog<void>(
    context: context,
    builder: (context) => const _AddUserDialog(),
  );
}

/// New users always start as 'seller' (via `handle_new_user`) and get a
/// Supabase-managed invite email to set their own password -- the Owner
/// never types a password on someone else's behalf. Promote to Owner
/// afterward with the role dropdown on their tile if needed.
class _AddUserDialog extends ConsumerStatefulWidget {
  const _AddUserDialog();

  @override
  ConsumerState<_AddUserDialog> createState() => _AddUserDialogState();
}

class _AddUserDialogState extends ConsumerState<_AddUserDialog> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _fullNameController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });
    try {
      final email = _emailController.text.trim();
      await ref
          .read(userManagementRepositoryProvider)
          .inviteUser(email: email, fullName: _fullNameController.text.trim());
      ref.invalidate(allProfilesProvider);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Invitación enviada a $email')));
      }
    } on Object catch (e) {
      setState(() => _errorMessage = 'No se pudo invitar al usuario: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Agregar usuario'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Correo electrónico',
              ),
              validator: (value) => (value == null || !value.contains('@'))
                  ? 'Ingresa un correo válido'
                  : null,
            ),
            const SizedBox(height: AuraSpacing.unit * 2),
            TextFormField(
              controller: _fullNameController,
              decoration: const InputDecoration(labelText: 'Nombre (opcional)'),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: AuraSpacing.unit * 2),
              Text(
                _errorMessage!,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AuraColors.error),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: _isSubmitting ? null : _submit,
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Enviar invitación'),
        ),
      ],
    );
  }
}

class _UserTile extends ConsumerStatefulWidget {
  const _UserTile({required this.profile, required this.isSelf});

  final AppUser profile;
  final bool isSelf;

  @override
  ConsumerState<_UserTile> createState() => _UserTileState();
}

class _UserTileState extends ConsumerState<_UserTile> {
  bool _isSaving = false;

  Future<void> _changeRole(UserRole newRole) async {
    if (newRole == widget.profile.role) return;
    setState(() => _isSaving = true);
    try {
      await ref
          .read(userManagementRepositoryProvider)
          .promoteUser(targetUserId: widget.profile.id, newRole: newRole);
      ref.invalidate(allProfilesProvider);
    } on Object catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo cambiar el rol: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final profile = widget.profile;
    return BentoTile(
      padding: const EdgeInsets.all(AuraSpacing.unit * 2),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.fullName?.isNotEmpty == true
                      ? profile.fullName!
                      : (profile.email ?? profile.id),
                  style: textTheme.bodyLarge,
                ),
                if (profile.email != null)
                  Text(profile.email!, style: textTheme.bodySmall),
                if (!profile.isActive)
                  Text(
                    'Inactivo',
                    style: textTheme.labelSmall?.copyWith(
                      color: AuraColors.error,
                    ),
                  ),
              ],
            ),
          ),
          if (widget.isSelf)
            Chip(label: Text(profile.role.displayLabel))
          else if (_isSaving)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            DropdownButton<UserRole>(
              value: profile.role,
              items: [
                for (final role in UserRole.values)
                  DropdownMenuItem(value: role, child: Text(role.displayLabel)),
              ],
              onChanged: (role) {
                if (role != null) _changeRole(role);
              },
            ),
        ],
      ),
    );
  }
}
