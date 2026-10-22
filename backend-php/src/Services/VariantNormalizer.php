<?php

namespace App\Services;

/**
 * Normalize variant payloads from admin (apparel SKUs + legacy simple variants).
 */
class VariantNormalizer
{
    public static function normalizeList(array $variants): array
    {
        $normalized = [];
        $seenKeys = [];

        foreach ($variants as $index => $variantData) {
            if (!is_array($variantData)) {
                continue;
            }

            $color = self::clean($variantData['option_color'] ?? '');
            $size = self::clean($variantData['option_size'] ?? '');
            $cup = self::clean($variantData['option_cup'] ?? '');
            $name = self::clean($variantData['name'] ?? '');

            if ($color !== '' || $size !== '' || $cup !== '') {
                $name = self::buildDisplayName($color, $size, $cup);
            }

            if ($name === '') {
                continue;
            }

            $key = strtolower($color . '|' . $size . '|' . $cup . '|' . $name);
            if (isset($seenKeys[$key])) {
                continue;
            }
            $seenKeys[$key] = true;

            $normalized[] = [
                'id' => isset($variantData['id']) ? (int) $variantData['id'] : null,
                'name' => $name,
                'description' => $variantData['description'] ?? null,
                'price_modifier' => floatval($variantData['price_modifier'] ?? 0),
                'is_active' => ($variantData['is_active'] ?? true) ? true : false,
                'display_order' => isset($variantData['display_order']) ? (int) $variantData['display_order'] : $index,
                'option_color' => $color !== '' ? $color : null,
                'option_size' => $size !== '' ? $size : null,
                'option_cup' => $cup !== '' ? $cup : null,
                'swatch_image' => self::clean($variantData['swatch_image'] ?? '') ?: null,
            ];
        }

        return $normalized;
    }

    public static function buildDisplayName(string $color, string $size, string $cup): string
    {
        $parts = array_values(array_filter([$color, $size, $cup], static fn ($p) => $p !== ''));
        return implode(' / ', $parts);
    }

    private static function clean(?string $value): string
    {
        return trim((string) $value);
    }
}
