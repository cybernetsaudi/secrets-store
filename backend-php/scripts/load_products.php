<?php
/**
 * Load Initial Products for Gulf United FC
 * Run: php scripts/load_products.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Database;

// Load environment
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

$db = Database::getInstance();

// Age groups mapping
$ageGroups = [
    'U5' => '2021',
    'U6' => '2020',
    'U7' => '2019',
    'U8' => '2018',
    'U9' => '2017',
    'U10' => '2016',
    'U11' => '2015',
    'U12' => '2014',
    'U13' => '2013',
    'U14' => '2012',
    'U15' => '2011',
    'U16' => '2010',
    'U17' => '2009',
    'U18' => '2008',
    'U19' => '2007',
    'U21' => '2005/2006',
];

$products = [
    [
        'name' => 'MINI EAGLES - Ages U5 to U7 - Academy Term 1 - 2 sessions - 25/26',
        'slug' => 'mini-eagles-u5-u7-term1-2sessions',
        'description' => "Mini Eagles program for young players aged U5 to U7.\n\nEverything that is included is outlined in the brochure. (For Mini Eagles, the Red and White Match Home Kit and the Quarter Zip Training drill top is not included.)\n\nThere will be 2 training sessions per week. There is no official match program for Mini Eagles but we will play friendly matches when appropriate.\n\nFor Mini Eagles, there is an option for 1 session per week. Please speak to the coach if this is something you are interested in.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Mini Eagles program for ages U5 to U7, 2 sessions per week',
        'base_price' => 1499.00,
        'currency' => 'AED',
        'age_range' => ['U5', 'U6', 'U7'],
    ],
    [
        'name' => 'Ages U8 to U10 - Academy Term 1 - 2 sessions per week - 25/26',
        'slug' => 'u8-u10-term1-2sessions',
        'description' => "Academy Term 1 for ages U8 to U10.\n\nEverything that is included is outlined in the brochure.\n\nYou are selecting 2 training sessions per week and there will also be a match at the weekend.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Academy Term 1 for ages U8 to U10, 2 sessions per week',
        'base_price' => 2499.00,
        'currency' => 'AED',
        'age_range' => ['U8', 'U9', 'U10'],
    ],
    [
        'name' => 'Ages U11 to U21 - Academy Term 1 - 2 sessions per week - 25/26',
        'slug' => 'u11-u21-term1-2sessions',
        'description' => "Academy Term 1 for ages U11 to U21.\n\nEverything that is included is outlined in the brochure.\n\nYou are selecting 2 training sessions per week and there will also be a match at the weekend.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Academy Term 1 for ages U11 to U21, 2 sessions per week',
        'base_price' => 2499.00,
        'currency' => 'AED',
        'age_range' => ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21'],
    ],
    [
        'name' => 'Ages U11 to U21 - Academy Term 1 - 3 sessions per week - 25/26',
        'slug' => 'u11-u21-term1-3sessions',
        'description' => "Academy Term 1 for ages U11 to U21.\n\nEverything that is included is outlined in the brochure.\n\nYou are selecting 3 training sessions per week and there will also be a match at the weekend.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Academy Term 1 for ages U11 to U21, 3 sessions per week',
        'base_price' => 3499.00,
        'currency' => 'AED',
        'age_range' => ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21'],
    ],
    [
        'name' => 'Ages U8 to U10 - Full Season - 25/26',
        'slug' => 'u8-u10-full-season',
        'description' => "Full Season program for ages U8 to U10.\n\nEverything that is included is outlined in the brochure.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.\n\nThe price displayed has been set in November and has changed since the beginning of the season.",
        'short_description' => 'Full Season program for ages U8 to U10',
        'base_price' => 6499.00,
        'currency' => 'AED',
        'age_range' => ['U8', 'U9', 'U10'],
    ],
    [
        'name' => 'Ages U11 to U21 - Full Season - 2 sessions per week - 25/26',
        'slug' => 'u11-u21-full-season-2sessions',
        'description' => "Full Season program for ages U11 to U21.\n\nEverything that is included is outlined in the brochure.\n\nYou are selecting 2 training sessions per week and there will also be a match at the weekend.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Full Season for ages U11 to U21, 2 sessions per week',
        'base_price' => 8499.00,
        'currency' => 'AED',
        'age_range' => ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21'],
    ],
    [
        'name' => 'Ages U11 to U21 - Full Season - 3 sessions per week - 25/26',
        'slug' => 'u11-u21-full-season-3sessions',
        'description' => "Full Season program for ages U11 to U21.\n\nEverything that is included is outlined in the brochure.\n\nYou are selecting 3 training sessions per week and there will also be a match at the weekend.\n\nThe season runs from the start of September 2025 to the start of June 2026.\n\nSquad numbers are chosen first come, first served. There is only one of each number in each age group.",
        'short_description' => 'Full Season for ages U11 to U21, 3 sessions per week',
        'base_price' => 9499.00,
        'currency' => 'AED',
        'age_range' => ['U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21'],
    ],
];

echo "Loading products...\n\n";

foreach ($products as $productData) {
    // Check if product exists
    $stmt = $db->prepare("SELECT id FROM products WHERE slug = ?");
    $stmt->execute([$productData['slug']]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo "Product already exists: {$productData['name']}\n";
        $productId = $existing['id'];
    } else {
        // Insert product
        $stmt = $db->prepare("
            INSERT INTO products (name, slug, description, short_description, base_price, currency, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([
            $productData['name'],
            $productData['slug'],
            $productData['description'],
            $productData['short_description'],
            $productData['base_price'],
            $productData['currency'],
        ]);
        
        $productId = $db->lastInsertId();
        echo "✅ Created product: {$productData['name']}\n";
    }
    
    // Create variants
    foreach ($productData['age_range'] as $ageGroup) {
        $birthYear = $ageGroups[$ageGroup] ?? '';
        $variantName = "{$ageGroup} ({$birthYear})";
        
        // Check if variant exists
        $stmt = $db->prepare("SELECT id FROM product_variants WHERE product_id = ? AND name = ?");
        $stmt->execute([$productId, $variantName]);
        $existingVariant = $stmt->fetch();
        
        if (!$existingVariant) {
            $stmt = $db->prepare("
                INSERT INTO product_variants (product_id, name, description, price_modifier, is_unlimited, is_active, display_order)
                VALUES (?, ?, ?, 0.00, 1, 1, 0)
            ");
            $stmt->execute([
                $productId,
                $variantName,
                "Age group {$ageGroup}, birth year {$birthYear}",
            ]);
            echo "  ✅ Created variant: {$variantName}\n";
        }
    }
    
    echo "\n";
}

echo "✅ All products loaded successfully!\n";


