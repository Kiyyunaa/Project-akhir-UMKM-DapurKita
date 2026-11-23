import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

/// Tombol kustom yang ramah pengguna, berukuran pas untuk layar HP
class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;
  final bool isFullWidth;
  final double height;
  final bool isOutlined;

  const CustomButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.backgroundColor = AppColors.forestGreen,
    this.textColor = AppColors.white,
    this.icon,
    this.isFullWidth = true,
    this.height = 50.0,
    this.isOutlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = isLoading ? null : onPressed;

    Widget child = isLoading
        ? SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(
                isOutlined ? backgroundColor : textColor,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: isOutlined ? backgroundColor : textColor),
                const SizedBox(width: 8),
              ],
              Text(
                text,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isOutlined ? backgroundColor : textColor,
                ),
              ),
            ],
          );

    final buttonStyle = isOutlined
        ? OutlinedButton.styleFrom(
            side: BorderSide(color: backgroundColor, width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            minimumSize: Size(isFullWidth ? double.infinity : 0, height),
          )
        : ElevatedButton.styleFrom(
            backgroundColor: backgroundColor,
            foregroundColor: textColor,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            minimumSize: Size(isFullWidth ? double.infinity : 0, height),
          );

    return isOutlined
        ? OutlinedButton(
            onPressed: effectiveOnPressed,
            style: buttonStyle,
            child: child,
          )
        : ElevatedButton(
            onPressed: effectiveOnPressed,
            style: buttonStyle,
            child: child,
          );
  }
}
