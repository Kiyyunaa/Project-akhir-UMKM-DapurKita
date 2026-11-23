import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/app_colors.dart';
import '../../widgets/custom_text_field.dart';

/// Dialog untuk mengatur dan menguji koneksi IP backend (Sangat krusial untuk setup HP fisik)
class ServerConfigDialog extends StatefulWidget {
  const ServerConfigDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (context) => const ServerConfigDialog(),
    );
  }

  @override
  State<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends State<ServerConfigDialog> {
  final TextEditingController _urlController = TextEditingController();
  bool _isTesting = false;
  String? _testResult;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentUrl();
  }

  Future<void> _loadCurrentUrl() async {
    final current = await ApiService.getBaseUrl();
    setState(() {
      _urlController.text = current;
    });
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      await ApiService.setBaseUrl(_urlController.text);
      await ApiService.get('/api/categories');
      setState(() {
        _isTesting = false;
        _isSuccess = true;
        _testResult = 'Koneksi Berhasil! Terhubung ke backend DapurKita.';
      });
    } catch (e) {
      setState(() {
        _isTesting = false;
        _isSuccess = false;
        _testResult = 'Gagal terhubung: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Row(
        children: [
          Icon(Icons.settings_ethernet, color: AppColors.forestGreen),
          SizedBox(width: 8),
          Text(
            'Pengaturan IP Server',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.charcoal),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Agar HP dapat mengakses backend Express.js, masukkan alamat IP PC Anda dan port 6000.',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: _urlController,
              label: 'Alamat Base URL',
              hint: 'http://192.168.100.43:6000',
              prefixIcon: Icons.link,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                ActionChip(
                  label: const Text('Wi-Fi PC (HP)', style: TextStyle(fontSize: 11)),
                  backgroundColor: AppColors.sageGreen.withOpacity(0.5),
                  onPressed: () {
                    _urlController.text = ApiService.defaultPhoneIp;
                  },
                ),
                ActionChip(
                  label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                  backgroundColor: AppColors.sageGreen.withOpacity(0.5),
                  onPressed: () {
                    _urlController.text = ApiService.defaultEmulatorIp;
                  },
                ),
                ActionChip(
                  label: const Text('Localhost', style: TextStyle(fontSize: 11)),
                  backgroundColor: AppColors.sageGreen.withOpacity(0.5),
                  onPressed: () {
                    _urlController.text = ApiService.defaultLocalIp;
                  },
                ),
              ],
            ),
            if (_testResult != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _isSuccess ? AppColors.sageGreen.withOpacity(0.4) : AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _testResult!,
                  style: TextStyle(
                    fontSize: 12,
                    color: _isSuccess ? AppColors.forestGreen : AppColors.error,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isTesting ? null : _testConnection,
          child: _isTesting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Uji Koneksi', style: TextStyle(color: AppColors.forestGreen)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.forestGreen,
            foregroundColor: AppColors.white,
          ),
          onPressed: () async {
            await ApiService.setBaseUrl(_urlController.text);
            if (context.mounted) Navigator.pop(context);
          },
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}
