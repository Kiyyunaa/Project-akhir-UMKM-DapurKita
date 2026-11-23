import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Layanan API terpusat untuk komunikasi Flutter dengan Express.js backend DapurKita.
class ApiService {
  static const String _keyBaseUrl = 'custom_base_url';
  static const String _keyToken = 'auth_token';

  /// Dipanggil saat server mengembalikan 401 (token tidak valid / kedaluwarsa).
  /// Diset di main.dart agar proses logout + pindah ke halaman login dilakukan di satu tempat.
  static void Function()? onUnauthorized;
  static bool _unauthorizedHandled = false;

  /// Reset penanda 401 setelah login/register berhasil.
  static void resetUnauthorized() => _unauthorizedHandled = false;

  // IP bawaan PC di jaringan Wi-Fi untuk pengujian via HP fisik
  static const String defaultPhoneIp = 'http://192.168.100.43:6000';
  static const String defaultEmulatorIp = 'http://10.0.2.2:6000';
  static const String defaultLocalIp = 'http://127.0.0.1:6000';

  /// Mendapatkan Base URL saat ini
  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_keyBaseUrl);
    if (saved != null && saved.trim().isNotEmpty) {
      return saved.trim();
    }

    // Pemilihan default cerdas:
    if (kIsWeb) {
      return defaultLocalIp;
    }
    if (Platform.isAndroid) {
      // Bawaan IP Wi-Fi agar langsung terhubung saat dicoba di HP fisik
      return defaultPhoneIp;
    }
    return defaultLocalIp;
  }

  /// Mengubah Base URL (berguna saat user mengganti IP Wi-Fi di HP tanpa ubah kode)
  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    var cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    await prefs.setString(_keyBaseUrl, cleanUrl);
  }

  /// Simpan Token JWT
  static Future<void> setToken(String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_keyToken);
    } else {
      await prefs.setString(_keyToken, token);
    }
  }

  /// Ambil Token JWT
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  /// Header standar dengan JWT Token jika tersedia
  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final headers = <String, String>{};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    }
    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Format URL endpoint lengkap
  static Future<Uri> _buildUri(String endpoint) async {
    final base = await getBaseUrl();
    final path = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    return Uri.parse('$base$path');
  }

  /// Handler respons HTTP seragam
  static dynamic _handleResponse(http.Response response, {String? endpoint}) {
    // Token kedaluwarsa: logout otomatis cukup sekali.
    // Endpoint login dikecualikan karena 401 di sini berarti password salah, bukan sesi habis.
    if (response.statusCode == 401 &&
        endpoint != null &&
        !endpoint.contains('/api/auth/login') &&
        !_unauthorizedHandled) {
      _unauthorizedHandled = true;
      onUnauthorized?.call();
    }

    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = {'message': response.body};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    String errorMsg = 'Terjadi kesalahan (${response.statusCode})';
    if (body is Map && body['message'] != null) {
      errorMsg = body['message'].toString();
      if (body['errors'] != null && body['errors'] is List) {
        final errList = (body['errors'] as List)
            .map((e) => e is Map ? (e['message'] ?? e.toString()) : e.toString())
            .join(', ');
        if (errList.isNotEmpty) {
          errorMsg += ': $errList';
        }
      }
    }
    throw Exception(errorMsg);
  }

  // --- HTTP Methods ---

  static Future<dynamic> get(String endpoint) async {
    try {
      final uri = await _buildUri(endpoint);
      final headers = await _getHeaders();
      final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> data) async {
    try {
      final uri = await _buildUri(endpoint);
      final headers = await _getHeaders();
      final response = await http
          .post(uri, headers: headers, body: jsonEncode(data))
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  static Future<dynamic> put(String endpoint, Map<String, dynamic> data) async {
    try {
      final uri = await _buildUri(endpoint);
      final headers = await _getHeaders();
      final response = await http
          .put(uri, headers: headers, body: jsonEncode(data))
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> data) async {
    try {
      final uri = await _buildUri(endpoint);
      final headers = await _getHeaders();
      final response = await http
          .patch(uri, headers: headers, body: jsonEncode(data))
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  static Future<dynamic> delete(String endpoint) async {
    try {
      final uri = await _buildUri(endpoint);
      final headers = await _getHeaders();
      final response = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 15));
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  /// Kirim data multipart form-data (Upload Foto Kamera/Galeri ke Backend -> Cloudinary)
  static Future<dynamic> uploadMultipart(
    String endpoint, {
    Map<String, String>? fields,
    String? fileFieldName,
    String? filePath,
    Uint8List? fileBytes,
    String? filename,
    String method = 'POST',
  }) async {
    try {
      final uri = await _buildUri(endpoint);
      final request = http.MultipartRequest(method, uri);

      // Tambahkan headers auth
      final token = await getToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Tambahkan field biasa
      if (fields != null) {
        request.fields.addAll(fields);
      }

      // Tambahkan file berkas gambar jika ada
      if (fileFieldName != null) {
        if (filePath != null && filePath.isNotEmpty) {
          request.files.add(await http.MultipartFile.fromPath(fileFieldName, filePath));
        } else if (fileBytes != null && filename != null) {
          request.files.add(http.MultipartFile.fromBytes(
            fileFieldName,
            fileBytes,
            filename: filename,
          ));
        }
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response, endpoint: endpoint);
    } catch (e) {
      _handleNetworkError(e);
      rethrow;
    }
  }

  static void _handleNetworkError(dynamic error) {
    if (error is SocketException || error.toString().contains('Failed host lookup') || error.toString().contains('Connection refused')) {
      throw Exception(
        'Gagal terhubung ke backend DapurKita. Pastikan backend aktif di port 6000 dan HP terhubung ke Wi-Fi yang sama dengan PC.',
      );
    }
  }
}
