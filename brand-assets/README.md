# GATVIA Brand Assets (AI-generated placeholders)

Generated placeholder visuals for **secrets.gatvia.com**. These are starting points — refine in Figma/Photoshop or replace with real photography before launch.

## Folder structure

```
brand-assets/
├── hero-banners/              # Homepage hero / full-width banners (16:9)
├── ui-placeholders/
│   ├── collection-tiles/      # Collection rail & grid tiles (1:1)
│   └── category-cards/        # Category browse cards (3:4)
├── marketing/
│   ├── social/                # Instagram post & story templates
│   └── promo-banners/         # Site promo strips (16:9)
└── icons/
    ├── favicon/               # App / browser icon concepts
    └── collection-lines/      # Per-line icons (Classic, Premium, etc.)
```

## Files

### Hero banners (`hero-banners/`)

| File | Use |
|------|-----|
| `gatvia-brand-hero.png` | Default brand hero (Admin → Visual → landing bg) |
| `classic-collection-hero.png` | Classic line hero |
| `premium-collection-hero.png` | Premium line hero |
| `designer-collection-hero.png` | Designer line hero |
| `limited-collection-hero.png` | Limited Edition hero |

### Collection tiles (`ui-placeholders/collection-tiles/`)

| File | Collection |
|------|------------|
| `tile-classic.png` | Classic |
| `tile-premium.png` | Premium |
| `tile-designer.png` | Designer |
| `tile-limited.png` | Limited |

### Category cards (`ui-placeholders/category-cards/`)

| File | Suggested category |
|------|-------------------|
| `category-everyday-essentials.png` | Classic — everyday essentials |
| `category-silk-satin.png` | Premium — silk & satin |
| `category-bold-prints.png` | Designer — bold prints |

### Marketing (`marketing/`)

| File | Format | Use |
|------|--------|-----|
| `social/social-instagram-post.png` | 1:1 | Feed posts |
| `social/social-story-new-drop.png` | 9:16 | Stories / Reels cover |
| `promo-banners/promo-banner-seasonal.png` | 16:9 | Seasonal sale strip |
| `promo-banners/promo-banner-free-shipping.png` | 16:9 | Free shipping promo |

### Icons (`icons/`)

| File | Use |
|------|-----|
| `favicon/favicon-g-monogram.png` | Favicon / app icon concept |
| `collection-lines/icon-line-classic.png` | Classic line mark |
| `collection-lines/icon-line-premium.png` | Premium line mark |
| `collection-lines/icon-line-designer.png` | Designer line mark |
| `collection-lines/icon-line-limited.png` | Limited line mark |

## How to use on the live site

1. **Hero images** — Admin → Settings → Visual → upload to *Landing background* or tile slots.
2. **Logos / favicon** — Admin → Visual → site logo / header logo; convert favicon to `.ico` / `.svg` for `frontend/public/`.
3. **Collection references** — Copy to `frontend/public/branding/` if wiring into `collections.ts` logo paths.
4. **Social** — Export with your copy in Canva/Figma; these are layout/mood references.

## Regenerating

Ask Cursor to generate new variants with the image tool. Use abstract **fashion textile / fabric** prompts if lingerie-specific prompts are blocked by safety filters.

## Note

AI-generated assets are **not** final brand identity. Replace with professional photography and a proper logo system before public marketing campaigns.
