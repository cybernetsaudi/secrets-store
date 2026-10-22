export interface InfoPageSection {
  heading: string
  paragraphs: string[]
  highlight?: string
}

export interface InfoPageContent {
  slug: string
  title: string
  eyebrow: string
  subtitle: string
  sections: InfoPageSection[]
  cta?: { label: string; href: string }
}

export const INFO_PAGES: Record<string, InfoPageContent> = {
  guides: {
    slug: 'guides',
    title: 'Guides',
    eyebrow: 'Know before you glow',
    subtitle: 'Everything you need to pick your line, nail your fit, and keep your GATVIA looking fresh.',
    sections: [
      {
        heading: 'Pick your line (it\'s a vibe, not a quiz)',
        paragraphs: [
          'Classic is your everyday main character energy — clean, comfortable, always in rotation.',
          'Premium is quiet luxury. Ivory moods. Gold-foil details. You get it.',
          'Designer is for when the room needs to notice you walked in.',
          'Limited is the “add to cart before your friend screenshots it” collection. Rare drops. No second chances.',
        ],
        highlight: 'Still unsure? Hover The Essentials on the homepage. Your eyes will tell you.',
      },
      {
        heading: 'Fit & sizing',
        paragraphs: [
          'Our pieces are cut for real bodies and real days — not just photoshoot poses.',
          'Between sizes? Size up if you like a relaxed fit. Size down if you like things snug and sculpted.',
          'Every product page lists what you need. No mystery measurements. We\'re fun, not chaotic.',
        ],
      },
      {
        heading: 'Care tips (so your favorites stay favorites)',
        paragraphs: [
          'Cold wash, gentle cycle, inside out when you can be bothered — your future self will thank you.',
          'Skip the nuclear dryer setting. Air dry or low heat keeps colors and elastic happier longer.',
          'Premium and Designer lines love a little extra TLC. Think of it as spa day for fabric.',
        ],
      },
    ],
    cta: { label: 'Shop all collections', href: '/products/' },
  },

  'terms-of-sale': {
    slug: 'terms-of-sale',
    title: 'Terms of Sale',
    eyebrow: 'The fine print, but make it fashion',
    subtitle: 'What happens when you hit “pay” — clearly, honestly, and without the legalese coma.',
    sections: [
      {
        heading: 'Orders & pricing',
        paragraphs: [
          'Prices are shown in the currency you select at checkout (PKR is our home base; we also support AED, USD, SAR, and GBP).',
          'We reserve the right to correct pricing errors. If we mess up, we\'ll tell you before charging your card — no sneaky surprises.',
          'An order is confirmed when you receive your order confirmation email. Until then, it\'s a very enthusiastic intention.',
        ],
      },
      {
        heading: 'Payment & availability',
        paragraphs: [
          'We accept the payment methods listed on our Payment Options page. If your bank says no, that\'s between you and them — we\'ll help where we can.',
          'Limited Edition items are… limited. First paid, first served. We don\'t hold carts forever — life moves fast, so do drops.',
        ],
      },
      {
        heading: 'Our promise',
        paragraphs: [
          'We sell what we show. If something arrives not as described, talk to us — we\'d rather fix it than argue about it.',
          'Questions? Email secrets@gatvia.com. Real humans (with good taste) read it.',
        ],
        highlight: 'By placing an order, you agree to these terms. We agree to treat you like a person, not a ticket number.',
      },
    ],
    cta: { label: 'Browse the store', href: '/products/' },
  },

  'terms-of-use': {
    slug: 'terms-of-use',
    title: 'Terms of Use',
    eyebrow: 'House rules for the website',
    subtitle: 'Welcome to secrets.gatvia.com. Play nice, look great, don\'t break stuff.',
    sections: [
      {
        heading: 'Using our site',
        paragraphs: [
          'This website is for shopping GATVIA, learning about our lines, and generally having a good time.',
          'Don\'t scrape, hack, spam, or use bots to buy Limited drops before actual humans. That\'s not the vibe.',
          'Content on this site — images, copy, logos — belongs to GATVIA unless we say otherwise. No stealing. Inspiration is fine; photocopying is not.',
        ],
      },
      {
        heading: 'Accounts & accuracy',
        paragraphs: [
          'Give us real info at checkout so your order actually finds you. Fake addresses make sad packages.',
          'We may update the site, prices, or these terms. Continued use means you\'re cool with the latest version.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'We work hard to keep the site running smoothly. We\'re not liable for indirect damages from downtime, third-party payment issues, or Mercury being in retrograde.',
          'Pakistan law governs these terms unless local consumer law says we have to do more — in which case, we do more.',
        ],
        highlight: 'TL;DR: be respectful, shop honestly, and we\'ll keep building a brand worth wearing.',
      },
    ],
    cta: { label: 'Back to homepage', href: '/' },
  },

  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    eyebrow: 'Your data, your business',
    subtitle: 'We collect what we need to get your order to your door — not your life story.',
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'Name, email, shipping address, phone (if you give it), and payment details — handled securely by our payment partners, not stored on a sticky note.',
          'Order history so we can help if something goes sideways.',
          'Basic analytics to see which pages people love (spoiler: The Essentials).',
        ],
      },
      {
        heading: 'What we don\'t do',
        paragraphs: [
          'We don\'t sell your personal data to random advertisers. Ever.',
          'We don\'t send you 47 emails a day. Order updates and occasional drops — that\'s the deal.',
        ],
      },
      {
        heading: 'Cookies & your rights',
        paragraphs: [
          'We use cookies to keep your cart alive and remember preferences like currency. Boring but useful.',
          'Want your data deleted or a copy of what we hold? Email secrets@gatvia.com. We\'ll sort it within a reasonable time.',
        ],
        highlight: 'We take privacy seriously — even when we\'re being playful everywhere else.',
      },
    ],
    cta: { label: 'Contact us', href: 'mailto:secrets@gatvia.com' },
  },

  'order-status': {
    slug: 'order-status',
    title: 'Order Status',
    eyebrow: 'Where\'s my stuff?',
    subtitle: 'Track your order without refreshing your inbox like it\'s a sport.',
    sections: [
      {
        heading: 'Right after you order',
        paragraphs: [
          'You\'ll land on our success page with your order number (starts with GS-). Screenshot it. Frame it. Whatever.',
          'A confirmation email heads to the address you used at checkout. Check spam — fashion is rebellious; filters are too.',
        ],
      },
      {
        heading: 'While it\'s on the way',
        paragraphs: [
          'We\'ll email you when your order ships with tracking info when available.',
          'Processing usually takes 1–3 business days. Limited drops might take a beat longer when the whole internet shows up at once.',
        ],
        highlight: 'Lost your order number? Email secrets@gatvia.com with your name and email used at checkout. We\'ll find it.',
      },
      {
        heading: 'Something looks wrong?',
        paragraphs: [
          'Paid but status still pending? Give it a few minutes, then reach out — we\'ll chase it down.',
          'Wrong item or damaged on arrival? See our Returns page. We\'ve got you.',
        ],
      },
    ],
    cta: { label: 'Continue shopping', href: '/products/' },
  },

  delivery: {
    slug: 'delivery',
    title: 'Delivery',
    eyebrow: 'From our rack to your door',
    subtitle: 'Fast enough to be exciting. Honest enough to be trusted.',
    sections: [
      {
        heading: 'Where we ship',
        paragraphs: [
          'We deliver across Pakistan and select international destinations. Shipping options appear at checkout based on your address.',
          'Remote areas may need an extra day or two. Good things (and packages) arrive to patient people.',
        ],
      },
      {
        heading: 'Timing',
        paragraphs: [
          'Standard delivery: typically 3–7 business days domestically after dispatch.',
          'Express options may be available at checkout — because sometimes you need that outfit tomorrow.',
        ],
        highlight: 'Delivery times are estimates, not prophecies. Weather, customs, and courier drama happen.',
      },
      {
        heading: 'When it arrives',
        paragraphs: [
          'Inspect your package on delivery. If the box looks like it went ten rounds, note it before signing where possible.',
          'Wrong address at checkout = package adventure. Double-check before you pay — we can\'t teleport orders.',
        ],
      },
    ],
    cta: { label: 'Shop now', href: '/products/' },
  },

  returns: {
    slug: 'returns',
    title: 'Returns',
    eyebrow: 'Changed your mind? It happens.',
    subtitle: 'Easy returns for unworn items. No guilt trips. No awkward standoffs.',
    sections: [
      {
        heading: 'Our window',
        paragraphs: [
          'Return unworn, unwashed items with tags attached within 14 days of delivery.',
          'Limited Edition pieces may be final sale unless faulty — we\'ll always say so on the product page.',
        ],
      },
      {
        heading: 'How to start a return',
        paragraphs: [
          'Email secrets@gatvia.com with your order number, item(s), and reason. Photos help if something arrived damaged.',
          'We\'ll send return instructions. Ship it back in original packaging if you still have it.',
        ],
        highlight: 'Refunds go back to your original payment method once we receive and inspect the item. Usually within 5–10 business days.',
      },
      {
        heading: 'Exchanges',
        paragraphs: [
          'Want a different size? Tell us — we\'ll do an exchange if stock allows.',
          'If we\'re out of your size, we\'ll refund you. No store credit hostage situations.',
        ],
      },
    ],
    cta: { label: 'Need help? Email us', href: 'mailto:secrets@gatvia.com' },
  },

  'payment-options': {
    slug: 'payment-options',
    title: 'Payment Options',
    eyebrow: 'Pay your way',
    subtitle: 'Secure checkout. Multiple currencies. Zero awkward “card declined” silence.',
    sections: [
      {
        heading: 'What we accept',
        paragraphs: [
          'Card payments via Safepay and other gateways configured at checkout.',
          'Shop in PKR (default), AED, USD, SAR, or GBP — switch currency in the header before you cart.',
        ],
      },
      {
        heading: 'Security',
        paragraphs: [
          'Payments are processed by certified partners. We don\'t see or store your full card number.',
          'Look for the secure checkout badge and never share OTPs with anyone — not even someone claiming to be us.',
        ],
        highlight: 'Payment failed? Try another card, check your bank\'s international limits, or contact secrets@gatvia.com.',
      },
      {
        heading: 'Bank transfer',
        paragraphs: [
          'Some orders may offer bank transfer — you\'ll get instructions on the success page and by email.',
          'Your order ships after payment clears. Upload proof if we ask — it speeds things up.',
        ],
      },
    ],
    cta: { label: 'Go to checkout', href: '/cart/' },
  },

  news: {
    slug: 'news',
    title: 'News',
    eyebrow: 'The GATVIA bulletin',
    subtitle: 'Drops, milestones, and the occasional plot twist from team Secrets.',
    sections: [
      {
        heading: 'Latest',
        paragraphs: [
          '🎉 secrets.gatvia.com is live — four lines, one attitude, zero boring basics.',
          '👑 Premium Line landed with gold-foil energy and ivory canvas moods.',
          '⚡ Limited Edition drops are real. Small batches. Big reactions. Set your notifications (aka your group chat).',
        ],
        highlight: 'Want drop alerts first? Follow us on social and shop Limited before your group chat does.',
      },
      {
        heading: 'Press & features',
        paragraphs: [
          'We\'re a young brand with big plans. Press inquiries: secrets@gatvia.com — subject line “PRESS”.',
          'Influencers and creators: same inbox. Tell us your vibe. We love a good fit.',
        ],
      },
      {
        heading: 'Coming soon',
        paragraphs: [
          'More sizes. More regions. More “how is this sold out already?” moments.',
          'Stay close. The best chapters aren\'t written yet.',
        ],
      },
    ],
    cta: { label: 'See what\'s in stock', href: '/products/' },
  },

  careers: {
    slug: 'careers',
    title: 'Careers',
    eyebrow: 'Work with us',
    subtitle: 'We\'re building a fashion brand that doesn\'t take itself too seriously — but takes the craft very seriously.',
    sections: [
      {
        heading: 'Who we\'re looking for',
        paragraphs: [
          'People who care about product, pixels, and packages — design, ops, marketing, customer love.',
          'You don\'t need a fashion pedigree. You need taste, hustle, and the ability to laugh during a launch week.',
        ],
        highlight: 'Remote-friendly roles where it makes sense. Karachi / Lahore energy where it doesn\'t.',
      },
      {
        heading: 'Perks (the real ones)',
        paragraphs: [
          'Staff discount on GATVIA. Yes, you will become the best-dressed person in your friend group.',
          'Small team = big ownership. Your ideas won\'t die in a committee.',
          'A brand going somewhere. You\'ll tell people you were here early.',
        ],
      },
      {
        heading: 'How to apply',
        paragraphs: [
          'Email careers@gatvia.com with your CV, portfolio (if relevant), and a short note on why GATVIA.',
          'No cover letter poetry required. Just be human and specific.',
        ],
      },
    ],
    cta: { label: 'Email careers@gatvia.com', href: 'mailto:careers@gatvia.com' },
  },

  investors: {
    slug: 'investors',
    title: 'Investors',
    eyebrow: 'Build with us',
    subtitle: 'GATVIA is a multi-line fashion brand scaling from Pakistan to the world — with personality baked in.',
    sections: [
      {
        heading: 'The opportunity',
        paragraphs: [
          'Four distinct lines (Classic, Premium, Designer, Limited) let us serve everyday essentials and high-margin drops from one house.',
          'DTC-first, digitally native, built for the markets we know — expanding with discipline, not chaos.',
        ],
      },
      {
        heading: 'What we\'re building',
        paragraphs: [
          'A recognizable brand with repeat customers, not one-hit wonder SKUs.',
          'Operational backbone: modern checkout, multi-currency, clean fulfilment, data-informed inventory.',
        ],
        highlight: 'We\'re selective about partners who add more than a wire transfer — strategy, network, patience.',
      },
      {
        heading: 'Get in touch',
        paragraphs: [
          'Institutional and angel inquiries: secrets@gatvia.com — subject line “INVESTORS”.',
          'Include your fund, cheque size range, and why fashion / DTC / Pakistan (or GCC) fits your thesis.',
        ],
      },
    ],
    cta: { label: 'Our story starts here', href: '/' },
  },

  sustainability: {
    slug: 'sustainability',
    title: 'Sustainability',
    eyebrow: 'Look good. Do better.',
    subtitle: 'We\'re not claiming to save the planet in a press release — we\'re making real, incremental choices.',
    sections: [
      {
        heading: 'Materials & quality',
        paragraphs: [
          'Better construction means fewer replacements. We\'d rather you wear it for years than rebuy every season.',
          'We\'re pushing suppliers on responsible sourcing and safer dyes — progress over perfection.',
        ],
      },
      {
        heading: 'Packaging',
        paragraphs: [
          'Recyclable mailers where available. Right-sized boxes — because shipping air is silly.',
          'No gratuitous plastic inserts. Your unboxing should feel premium, not wasteful.',
        ],
        highlight: 'Got ideas? We\'re listening. Email secrets@gatvia.com — subject “SUSTAINABILITY”.',
      },
      {
        heading: 'What\'s next',
        paragraphs: [
          'Transparent reporting as we scale — numbers, not vibes-only claims.',
          'Limited runs by design: fewer overstock piles, less landfill guilt.',
          'Community swaps and care guides so clothes live longer. (Yes, read our Guides page.)',
        ],
      },
    ],
    cta: { label: 'Shop consciously', href: '/products/' },
  },
}

export const INFO_PAGE_SLUGS = Object.keys(INFO_PAGES)

export function getInfoPage(slug: string): InfoPageContent | undefined {
  return INFO_PAGES[slug]
}
