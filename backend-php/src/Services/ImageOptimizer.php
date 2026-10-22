<?php

namespace App\Services;

/**
 * Resize and compress raster uploads to WebP (max width 1920px).
 */
class ImageOptimizer
{
    public const MAX_WIDTH = 1920;
    public const WEBP_QUALITY = 82;

    /**
     * @return array{success: bool, path: string, mime: string, error?: string}
     */
    public static function optimizeToWebp(
        string $sourcePath,
        ?string $destPath = null,
        int $maxWidth = self::MAX_WIDTH,
        int $quality = self::WEBP_QUALITY
    ): array {
        if (!is_file($sourcePath)) {
            return ['success' => false, 'path' => $sourcePath, 'mime' => '', 'error' => 'Source file not found'];
        }

        if (!function_exists('imagewebp')) {
            return [
                'success' => false,
                'path' => $sourcePath,
                'mime' => self::detectMime($sourcePath),
                'error' => 'WebP encoding is not available',
            ];
        }

        $image = self::loadImage($sourcePath);
        if ($image === null) {
            return [
                'success' => false,
                'path' => $sourcePath,
                'mime' => self::detectMime($sourcePath),
                'error' => 'Unsupported or unreadable image',
            ];
        }

        $image = self::resizeToMaxWidth($image, $maxWidth);
        $destPath = $destPath ?? preg_replace('/\.[^.]+$/', '.webp', $sourcePath);

        if (!imagewebp($image, $destPath, $quality)) {
            imagedestroy($image);
            return [
                'success' => false,
                'path' => $sourcePath,
                'mime' => self::detectMime($sourcePath),
                'error' => 'Failed to write WebP output',
            ];
        }

        imagedestroy($image);

        if ($destPath !== $sourcePath && is_file($sourcePath)) {
            @unlink($sourcePath);
        }

        return [
            'success' => true,
            'path' => $destPath,
            'mime' => 'image/webp',
        ];
    }

    private static function detectMime(string $path): string
    {
        if (!function_exists('finfo_open')) {
            return 'application/octet-stream';
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return 'application/octet-stream';
        }

        $mime = finfo_file($finfo, $path) ?: 'application/octet-stream';
        finfo_close($finfo);

        return $mime;
    }

    /**
     * @return resource|\GdImage|null
     */
    private static function loadImage(string $path)
    {
        $mime = self::detectMime($path);

        return match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path) ?: null,
            'image/png' => self::loadPng($path),
            'image/gif' => @imagecreatefromgif($path) ?: null,
            'image/webp' => function_exists('imagecreatefromwebp')
                ? (@imagecreatefromwebp($path) ?: null)
                : null,
            default => self::loadImageFromBytes($path),
        };
    }

    /**
     * @return resource|\GdImage|null
     */
    private static function loadPng(string $path)
    {
        $image = @imagecreatefrompng($path);
        if ($image === false) {
            return null;
        }

        imagealphablending($image, false);
        imagesavealpha($image, true);

        return $image;
    }

    /**
     * @return resource|\GdImage|null
     */
    private static function loadImageFromBytes(string $path)
    {
        $bytes = @file_get_contents($path);
        if ($bytes === false) {
            return null;
        }

        $image = @imagecreatefromstring($bytes);

        return $image === false ? null : $image;
    }

    /**
     * @param resource|\GdImage $image
     * @return resource|\GdImage
     */
    private static function resizeToMaxWidth($image, int $maxWidth)
    {
        $width = imagesx($image);
        $height = imagesy($image);

        if ($width <= 0 || $height <= 0 || $width <= $maxWidth) {
            return $image;
        }

        $newWidth = $maxWidth;
        $newHeight = (int) round($height * ($maxWidth / $width));
        $resized = imagecreatetruecolor($newWidth, $newHeight);

        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
        imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);

        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        return $resized;
    }
}
