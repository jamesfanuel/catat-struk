import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'services/receipt_storage.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CatatStrukApp());
}

class CatatStrukApp extends StatefulWidget {
  const CatatStrukApp({super.key});

  @override
  State<CatatStrukApp> createState() => _CatatStrukAppState();
}

class _CatatStrukAppState extends State<CatatStrukApp> {
  final _storage = ReceiptStorage();
  AppSettings _settings = const AppSettings();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final s = await _storage.loadSettings();
    if (!mounted) return;
    setState(() => _settings = s);
  }

  Future<void> _updateSettings(AppSettings next) async {
    setState(() => _settings = next);
    await _storage.saveSettings(next);
  }

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF0D9488);
    return MaterialApp(
      title: 'CatatStruk',
      debugShowCheckedModeBanner: false,
      themeMode: _settings.darkMode ? ThemeMode.dark : ThemeMode.light,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.light),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.dark),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      home: HomeScreen(
        settings: _settings,
        onSettingsChanged: _updateSettings,
      ),
    );
  }
}
