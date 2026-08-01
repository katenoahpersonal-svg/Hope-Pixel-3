/**
 * THE STUDIO — all copy and spatial layout live here.
 *
 * Editing this file changes the site. Nothing else needs to be touched to
 * update text, projects, or where things sit in the room.
 *
 * Lines marked  // VERIFY  are Katelynn's to confirm or replace. See VERIFY.md.
 */

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const identity = {
  name: 'Katelynn Noah',
  first: 'Katelynn',
  last: 'Noah',
  role: 'Ecommerce & Digital Experience Manager · UI/UX Designer · Integrated Marketing',
  positioning:
    'I build online storefronts and the brand systems that surround them — design, ecommerce, marketing, and production, owned end to end.',
  intro:
    'Four-plus years leading the strategy, design, development, and marketing of storefronts and client brands. I run day-to-day digital operations for a multimillion-dollar ecommerce business and a creative studio of my own — which means I have shipped the storefront, the campaign that drives it, the catalog it came from, and the broadcast that announced it.',
  specialties: ['Design', 'Ecommerce', 'Marketing', 'Creative Production'],
  email: 'katenoah.personal@gmail.com',
  phone: '323-829-1937',
  studio: { label: 'hopeinprint.com', href: 'https://hopeinprint.com' },
  linkedin: { label: 'linkedin.com/katelynnnoah', href: 'https://www.linkedin.com/in/katelynnnoah' }, // VERIFY
  location: 'Remote · United States', // VERIFY — set your city/state if you want it shown
  availability: 'Open to full-time roles and select studio projects.', // VERIFY
  resumeFile: 'Katelynn_Noah_Resume_2026.pdf',
}

/* ------------------------------------------------------------------ */
/* The architecture of the space                                       */
/*                                                                     */
/* The hall is generated from this profile: at any depth z it has a     */
/* centre line (cx), a half width (hw) and a ceiling height (h).        */
/* Widen hw and a room opens; move cx and the hall bends.               */
/* ------------------------------------------------------------------ */

export const Z_START = 14
/**
 * The walk ends here — in the middle of the side gallery, not at the far wall.
 * Scrolling past the end would only push you into a corner; instead you arrive,
 * the camera settles, and turning your head becomes the way you see the room.
 */
export const Z_END = -130

/**
 * The far wall, and how far the geometry runs past the end of the walk. The
 * hall builder and the side gallery both read this, so the last canvas is
 * guaranteed to hang on an actual wall rather than float in front of one.
 */
export const Z_FAR = Z_END - 8

export const hallProfile = [
  //  z     cx    hw    h
  [  20,   0,   8.6,  7.0], // entrance hall
  [   6,   0,   8.6,  7.0],
  [  -1,   0,   6.9,  6.0], // portal into the gallery
  [  -4,   0,   6.9,  6.0],
  [ -50,   0,   6.9,  6.0], // main gallery corridor
  [ -58,   0,   9.0,  6.8],
  [ -66,   0,   9.6,  7.0], // studio tour (about)
  [ -72,   0,   9.4,  7.0],
  [ -74,   0,   8.2,  6.6],
  [ -80,   0,  11.2,  8.0], // expertise alcove
  [ -90,   0,  11.2,  8.0],
  [ -96,   0,   7.0,  6.2],
  [-100,   0,   6.9,  6.0], // records — résumé
  [-106,   0,   9.2,  6.8], // contact — the quiet room
  [-115,   0,   9.2,  6.8],
  [-121,   6,   7.2,  6.2], // the hall bends
  [-124,  13,   4.9,  6.4], // studio work — a room to stand in, not a passage
  [-152,  13,   4.9,  6.4],
]

/** Sample the hall profile at depth z. */
export function hallAt(z) {
  const p = hallProfile
  if (z >= p[0][0]) return { cx: p[0][1], hw: p[0][2], h: p[0][3] }
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]
    const b = p[i + 1]
    if (z <= a[0] && z >= b[0]) {
      let t = (a[0] - z) / (a[0] - b[0])
      t = t * t * (3 - 2 * t) // smoothstep — no hard creases in the walls
      return {
        cx: a[1] + (b[1] - a[1]) * t,
        hw: a[2] + (b[2] - a[2]) * t,
        h: a[3] + (b[3] - a[3]) * t,
      }
    }
  }
  const l = p[p.length - 1]
  return { cx: l[1], hw: l[2], h: l[3] }
}

/** Depth -> scroll progress (0..1). */
export const zToT = (z) => (Z_START - z) / (Z_START - Z_END)
/** Scroll progress -> depth. */
export const tToZ = (t) => Z_START - t * (Z_START - Z_END)

/* ------------------------------------------------------------------ */
/* Sections — the rooms you walk through                               */
/* ------------------------------------------------------------------ */

/**
 * `z` is where the nav walks you to. `enter` is the depth at which the room
 * takes over the interface — set explicitly, because a midpoint between two
 * anchors lands in the middle of the gallery corridor and swaps the captions
 * out while you are still among the panels.
 */
export const sections = [
  { id: 'home', label: 'Entrance', nav: 'Home', z: 12, enter: Infinity, title: 'The Studio' },
  { id: 'work', label: 'Main Gallery', nav: 'Work', z: -5, enter: -1, title: 'Selected Work' },
  { id: 'about', label: 'Studio Tour', nav: 'About', z: -58, enter: -54, title: 'About' },
  { id: 'expertise', label: 'The Alcove', nav: 'Expertise', z: -83, enter: -76, title: 'Expertise' },
  { id: 'resume', label: 'Records', nav: 'Résumé', z: -99, enter: -94.5, title: 'Résumé' },
  { id: 'contact', label: 'The Quiet Room', nav: 'Contact', z: -107, enter: -102, title: 'Contact' },
  { id: 'studio', label: 'Side Gallery', nav: 'Studio', z: -130, enter: -120, title: 'Studio Work' },
]

/* ------------------------------------------------------------------ */
/* Flagship case studies                                               */
/*                                                                     */
/* `results` are written as outcomes that can be defended. Where a hard */
/* number belongs but isn't confirmed, the line is qualitative and      */
/* flagged in VERIFY.md rather than invented.                          */
/* ------------------------------------------------------------------ */

export const projects = [
  {
    id: 'bigcommerce',
    num: '01',
    title: 'BigCommerce Ecommerce Transformation',
    kicker: 'Hero project',
    category: 'Ecommerce',
    tags: ['Ecommerce', 'Web', 'UI/UX'],
    org: 'Matuska Taxidermy Supply Company',
    timeline: 'August 2022 – present',
    role: 'Ecommerce Lead — site experience, front-end, merchandising',
    art: { kind: 'grid', seed: 3 },
    summary:
      'A multimillion-dollar specialty storefront, rebuilt in place: navigation, product pages, checkout flow, and the merchandising logic underneath — without a theme rewrite or a catalog migration.',
    challenge: [
      'The storefront had grown faster than its structure. Category pages had turned into walls of near-identical products, so a shopper hunting for one item scrolled past thirty variations of another. Navigation, product data, and checkout had each been solved separately over the years, and it showed.',
      'The constraint was the interesting part: no theme rebuild, no platform migration, and no edits to a live catalog that the sales and warehouse teams depend on every day.',
    ],
    contribution: [
      'Owned the storefront end to end — front-end code, back-end configuration, merchandising, content, and technical troubleshooting.',
      'Wrote the custom HTML, CSS, and JavaScript layered onto the theme through BigCommerce Script Manager.',
      'Rebuilt navigation, category landing pages, product pages, and checkout workflow around how customers actually shop the catalog.',
      'Evaluated, integrated, and maintained storefront apps, keeping the stack small enough to stay fast.',
      'Handled the responsive UI so the phone experience matched the desktop one instead of merely fitting on it.',
    ],
    process: [
      'Audited the highest-traffic category pages and mapped where shoppers dropped out of the path to a product.',
      'Prototyped the fix outside production first to see the outcome before committing to a method.',
      'Chose the least invasive implementation that could survive a theme update — script-layer changes over catalog surgery.',
      'Shipped behind an anti-flicker pattern so the page never showed its intermediate state, then watched for re-render edge cases and hardened against them.',
      'Documented every knob so the behaviour can be tuned or removed by someone else later.',
    ],
    decisions: [
      {
        q: 'Rebuild the page, or repurpose it?',
        a: 'A third-party page builder could have produced the layout faster, but its tiles would go stale as the catalog changed, add licence cost, and never quite match the theme. Staying native meant every tile kept the theme’s real styling, hover, compare, and responsive grid behaviour for free.',
      },
      {
        q: 'Change the catalog, or change the view?',
        a: 'Editing products or category assignments would have rippled into sales, fulfilment, and search. Working at the presentation layer kept the change reversible: it can be removed in one step and the catalog is exactly as it was.',
      },
    ],
    results: [
      'Around thirty near-identical product tiles on the main reproduction landing page collapse into one “doorway” tile that opens the full line — the page reads as a curated set of product families rather than a scroll of duplicates.',
      'Zero catalog records edited. No product, category assignment, or URL was changed to achieve it.',
      'Fully reversible — the entire behaviour lives in one script block and removing it restores the original page.',
      'The pattern is now a template: a second product line can get the same treatment by duplicating the block and changing its configuration.',
    ],
    reflection:
      'The version I would build now is the one I built second. My first pass hid elements by class name and removed the only working button on the card — a reminder that on a theme you do not own, geometry is a more honest selector than a class. I would also reach for the least reversible option last, every time.',
    tools: ['BigCommerce', 'Script Manager', 'HTML', 'CSS', 'JavaScript', 'Stencil themes', 'Responsive UI', 'App integrations'],
  },

  {
    id: 'email',
    num: '02',
    title: 'Email Marketing Program',
    kicker: 'Automation + campaigns',
    category: 'Marketing',
    tags: ['Marketing'],
    org: 'Matuska Taxidermy Supply Company · Hope in Print clients',
    timeline: '2022 – present',
    role: 'Owner of the program — strategy, design, segmentation, deployment, analysis',
    art: { kind: 'stack', seed: 11 },
    summary:
      'Campaign email and lifecycle automation run as one program: a calendar, a design system, a segmentation model, and a reporting loop that feeds the next send.',
    challenge: [
      'Email was being treated as an announcement channel — a send when there was news, to everyone, with the design rebuilt each time. There was no calendar, no segmentation, and no way to tell a good send from a lucky one.',
    ],
    contribution: [
      'Directed the program from campaign planning and design through audience segmentation, scheduling, deployment, and results analysis.',
      'Built a modular template system so a campaign is assembled from known blocks instead of designed from scratch.',
      'Defined the audience segments and the rules that move people between them.',
      'Set the campaign calendar against the seasonal and promotional cycle of the business.',
      'Reviewed performance after each send and folded what it showed into the next one.',
    ],
    process: [
      'Inventoried what had been sent, to whom, and what happened.',
      'Designed a template system that holds up in every major mail client, including the ones that ignore modern CSS.',
      'Mapped the lifecycle — new subscriber, active buyer, lapsed — and wrote the automation for each.',
      'Aligned sends with the paid and onsite calendar so a customer sees one coherent promotion, not three versions of it.',
      'Tested subject lines and send timing, then kept the result.',
    ],
    decisions: [
      {
        q: 'One list, or segments?',
        a: 'Sending everything to everyone protects short-term reach and erodes long-term deliverability. Segmenting meant smaller sends and better engagement — the trade that keeps the channel alive.',
      },
      {
        q: 'Bespoke design per send, or a system?',
        a: 'A block-based template turned a two-day build into an afternoon, which is what makes a consistent calendar possible in the first place.',
      },
    ],
    results: [
      'A repeatable calendar replaced ad-hoc sends — campaigns ship on schedule against the seasonal cycle.',
      'Lifecycle automation covers welcome, post-purchase, and re-engagement so the program keeps working between campaigns.',
      'A single template system now carries every send, keeping brand consistency across email, onsite, and print.',
      'Post-send review is part of the workflow, not an afterthought.',
    ],
    reflection:
      'The biggest lift was not the design — it was giving the program a calendar. Consistency outperformed cleverness almost every time.',
    tools: ['Mailchimp', 'Klaviyo', 'Audience segmentation', 'Lifecycle automation', 'A/B testing', 'HTML email', 'Figma', 'Photoshop'],
  },

  {
    id: 'paid',
    num: '03',
    title: 'Paid Media — Meta Ads & AdRoll',
    kicker: 'Creative + strategy',
    category: 'Marketing',
    tags: ['Marketing'],
    org: 'Matuska Taxidermy Supply Company',
    timeline: '2023 – present',
    role: 'Strategy, creative, audience build, and performance review',
    art: { kind: 'flow', seed: 7 },
    summary:
      'Paid social and retargeting built as one system with the storefront: audiences, creative, offer, and landing page designed together rather than handed between people.',
    challenge: [
      'Ads and the site were being planned separately. Creative promised one thing, the landing page delivered another, and retargeting followed people around with products they had already bought.',
    ],
    contribution: [
      'Planned and executed paid media across Meta Ads and AdRoll retargeting and display.',
      'Designed the ad creative — static, sized variants, and seasonal campaign systems.',
      'Built and maintained the audiences, including exclusions that stop retargeting the wrong people.',
      'Aligned every campaign with its landing page, offer, and onsite promotion.',
      'Reviewed performance and rebuilt the creative that underperformed.',
    ],
    process: [
      'Started from the offer, not the ad — decided what was being promoted and why it was worth a click.',
      'Built the landing experience first so paid traffic always had somewhere coherent to arrive.',
      'Produced creative in a full size matrix so placements are designed, not cropped.',
      'Layered prospecting and retargeting with clean exclusions.',
      'Read results at the campaign level, then at the creative level, and retired what was not earning its place.',
    ],
    decisions: [
      {
        q: 'Chase reach, or protect the funnel?',
        a: 'Broad prospecting is cheap to buy and expensive to convert. Weighting spend toward warm audiences and retargeting with correct exclusions kept the spend attached to actual intent.',
      },
      {
        q: 'Resize creative, or redesign it?',
        a: 'A cropped square is not a story. Designing per placement costs more up front and stops the feed from looking like an afterthought.',
      },
    ],
    results: [
      'Campaign, creative, offer, and landing page now ship as one unit — the click and the page finally say the same thing.',
      'Retargeting exclusions removed the wasted impressions against people who had already converted.',
      'A reusable seasonal creative system means each campaign starts from a system, not a blank artboard.',
    ],
    reflection:
      'Paid media exposed every weak spot in the site faster than any audit. If a campaign underperformed, the ad was usually not the problem.',
    tools: ['Meta Ads Manager', 'AdRoll', 'Retargeting & display', 'Audience segmentation', 'Photoshop', 'Illustrator', 'Landing page design'],
  },

  {
    id: 'catalog',
    num: '04',
    title: 'Print & Digital Catalog Production',
    kicker: 'InDesign + magazine advertising',
    category: 'Creative Production',
    tags: ['Creative Production'],
    org: 'Matuska Taxidermy Supply Company',
    timeline: '2022 – present',
    role: 'Production lead — page planning, design system, proofing, print-ready files',
    art: { kind: 'spread', seed: 2 },
    summary:
      'Large product catalogs in print and digital, plus the magazine advertising around them — planned as a system so hundreds of pages stay consistent and get out the door on schedule.',
    challenge: [
      'A product catalog at this scale is a data problem wearing a design costume. Hundreds of pages, thousands of products, pricing that moves, and a hard print deadline at the end — with the same content also needing to work as an interactive PDF on a phone.',
    ],
    contribution: [
      'Directed production of large print and digital catalogs: page planning, design systems, product content, proofing, and print-ready files.',
      'Built the master pages, paragraph and object styles, and grid that every spread inherits.',
      'Designed magazine advertisements, brochures, banners, packaging, and product collateral around the same system.',
      'Ran the proofing rounds and prepress handoff.',
      'Produced the digital and interactive PDF versions from the same source.',
    ],
    process: [
      'Planned the book — section order, page counts, and what each spread has to accomplish — before designing a single page.',
      'Built the style system first so a late price change is an edit, not a redesign.',
      'Set up photography and image standards so product shots sit consistently on the page.',
      'Ran structured proofing rounds with sales and product teams and tracked every correction.',
      'Delivered print-ready files to spec, then produced the digital edition from the same document.',
    ],
    decisions: [
      {
        q: 'Design each spread, or build a system?',
        a: 'Styles and master pages take a week you feel like you do not have. They give it back the first time pricing changes across two hundred pages.',
      },
      {
        q: 'Separate digital version, or one source?',
        a: 'Producing the interactive PDF from the print document keeps the two editions from drifting apart — and halves the proofing.',
      },
    ],
    results: [
      'Catalogs ship on deadline with print-ready files delivered to spec.',
      'One design system carries print, digital, magazine ads, and collateral, so the brand reads the same in a trade publication and in a customer’s hands.',
      'Late content changes are absorbed by the style system instead of triggering a redesign.',
    ],
    reflection:
      'Catalog work taught me more about design systems than any web project — the discipline transfers directly to components on a storefront.',
    tools: ['InDesign', 'Photoshop', 'Illustrator', 'Acrobat', 'Interactive PDF', 'Prepress', 'Print specifications', 'Photography'],
  },

  {
    id: 'broadcast',
    num: '05',
    title: 'Weekly Live Broadcast Production',
    kicker: 'OBS + Restream',
    category: 'Live Media',
    tags: ['Live Media', 'Creative Production'],
    org: 'Independent / studio production', // VERIFY — name the show or the client if you can
    timeline: 'Weekly, ongoing', // VERIFY — start date
    role: 'Producer, technical director, and editor',
    art: { kind: 'scenes', seed: 5 },
    summary:
      'A weekly one-hour live show: scene design, switching, audio, multi-platform distribution, and the edit afterwards — a production that has to work the first time, every week.',
    challenge: [
      'Live has no undo. A weekly hour means a repeatable technical setup, graphics that can be built ahead, audio that is right before the stream starts, and a distribution path to several platforms at once — with a run of show that survives the moment something goes wrong.',
    ],
    contribution: [
      'Designed the OBS scene collection — sources, overlays, lower thirds, transitions, and the switching plan.',
      'Ran the live audio chain and levels.',
      'Directed the broadcast live each week, switching scenes against the run of show.',
      'Configured multi-platform distribution through Restream.',
      'Edited the recording into highlights and clips in post.',
    ],
    process: [
      'Built a scene collection that covers the show’s normal shape plus the failure cases — a holding card, a fallback audio source, a way back to a safe scene.',
      'Templated the graphics so each week is a content change, not a rebuild.',
      'Ran a full technical check before every broadcast: sources, levels, bitrate, destinations.',
      'Directed the live hour to a written run of show.',
      'Cut highlights afterwards for the channels that need short-form.',
    ],
    decisions: [
      {
        q: 'Improvise, or template?',
        a: 'A weekly show is a production line. Templated scenes and graphics are what make it sustainable past the first month.',
      },
      {
        q: 'One platform, or several?',
        a: 'Restream distribution costs a little setup and encoding headroom and removes the need to pick which audience gets the show live.',
      },
    ],
    results: [
      'A repeatable weekly production that goes live on schedule with a consistent on-air look.',
      'Multi-platform distribution from a single encode.',
      'Recorded episodes become highlight clips for social instead of disappearing after the stream.',
    ],
    reflection:
      'Live production is the best deadline discipline I have. It also made me much calmer about launch day on everything else.',
    tools: ['OBS Studio', 'Restream', 'Premiere Pro', 'Live audio', 'Motion graphics', 'Photoshop', 'Illustrator'],
  },

  {
    id: 'brand',
    num: '06',
    title: 'Brand Identity & Integrated Campaign',
    kicker: 'Cross-channel system',
    category: 'Design',
    tags: ['Design', 'Marketing'],
    org: 'Hope in Print — studio clients',
    timeline: '2023 – present',
    role: 'Creative director and designer — identity through rollout',
    art: { kind: 'mark', seed: 9 },
    summary:
      'Identity systems built to be used, not admired: a mark, a type and colour system, and the campaign that puts it into the world across web, email, social, and print at the same time.',
    challenge: [
      'Small businesses, ministries, and nonprofits rarely need a logo. They need a system that a volunteer can apply on a Tuesday without breaking it — and a launch that reaches people across every channel they already use.',
    ],
    contribution: [
      'Built cohesive brand identities: mark, type system, colour, and usage rules.',
      'Designed the campaign that rolled each identity out across web, email, social, and print together.',
      'Produced the applied pieces — site, campaign creative, print collateral, packaging, and social graphics.',
      'Directed the photography and art direction that keeps the system feeling like one brand.',
      'Managed the client lifecycle from discovery and proposal through launch and post-launch support.',
    ],
    process: [
      'Discovery first — who they serve, what they sound like, and what they actually have the capacity to maintain.',
      'Designed the system around that capacity: restrained palette, two-font pairing, clear rules.',
      'Applied it across every touchpoint before signing off, because a mark only proves itself in use.',
      'Launched all channels together so the change reads as intentional.',
      'Handed over templates and guidance so the client can keep it consistent without me.',
    ],
    decisions: [
      {
        q: 'Expressive, or maintainable?',
        a: 'A system a client cannot hold together is a system that fails in month three. Restraint here is a service, not a limitation.',
      },
      {
        q: 'Phase the rollout, or launch at once?',
        a: 'Launching everything together makes the rebrand feel deliberate. Phasing it just looks like inconsistency.',
      },
    ],
    results: [
      'Identity systems that hold together across web, print, email, and social without designer involvement in every use.',
      'Clients launch with templates and guidance, not just files.',
      'Consistent visual language across channels that previously drifted apart.',
    ],
    reflection:
      'The deliverable clients remember is not the logo — it is the day they made something themselves and it looked right.',
    tools: ['Illustrator', 'Photoshop', 'InDesign', 'Figma', 'Brand systems', 'Art direction', 'Packaging', 'Campaign design'],
  },

  {
    id: 'uiux',
    num: '07',
    title: 'UI/UX Product Concept',
    kicker: 'Figma + responsive design',
    category: 'Design',
    tags: ['Design', 'UI/UX', 'Web'],
    org: 'Self-directed concept',
    timeline: '2025', // VERIFY
    role: 'Product designer — research through prototype',
    art: { kind: 'wires', seed: 13 },
    summary:
      'A self-directed product concept taken from problem statement to responsive prototype: flows, wireframes, a component library, and an interactive Figma build.',
    challenge: [
      'Ecommerce work happens inside constraints someone else set — an existing theme, a live catalog, a running business. This concept was the opposite exercise: define the problem, design the whole flow, and be accountable for the interaction model rather than inheriting it.',
    ],
    contribution: [
      'Framed the problem and the primary user journey.',
      'Produced the flows, wireframes, and interaction model.',
      'Designed the visual system and a reusable component library in Figma.',
      'Built responsive layouts from mobile up rather than desktop down.',
      'Prototyped the flow interactively so it could be tested rather than described.',
    ],
    process: [
      'Wrote the problem statement and success criteria before opening a design tool.',
      'Sketched flows and mapped every state, including the empty and error ones.',
      'Wireframed at low fidelity and cut the screens that were not earning their place.',
      'Built components with real constraints — variants, auto layout, tokens.',
      'Prototyped, tested the flow with fresh eyes, and revised what confused people.',
    ],
    decisions: [
      {
        q: 'Mobile first, or desktop first?',
        a: 'Designing the narrow view first forces the hierarchy decision immediately. The desktop layout then has room, instead of the mobile one having excuses.',
      },
      {
        q: 'Screens, or components?',
        a: 'A component library takes longer before anything looks finished, and then every subsequent screen takes minutes.',
      },
    ],
    results: [
      'A complete, testable prototype rather than a set of static screens.',
      'A component library with documented states that could be handed to a developer.',
      'Responsive behaviour designed rather than inferred.',
    ],
    reflection:
      'Working without an existing system made me appreciate how much of production design is negotiation with what already exists — and how much faster you move when the constraints are explicit.',
    tools: ['Figma', 'Prototyping', 'Design systems', 'Responsive design', 'Wireframing', 'User flows'],
  },

  {
    id: 'amazon',
    num: '08',
    title: 'Amazon Marketplace Operations',
    kicker: 'Technical case study',
    category: 'Ecommerce',
    tags: ['Ecommerce'],
    org: 'Matuska Taxidermy Supply Company',
    timeline: '2023 – present',
    role: 'Marketplace catalog operations',
    art: { kind: 'nodes', seed: 17 },
    summary:
      'The unglamorous half of ecommerce: bulk catalog operations, listing compliance, variation structures, and the diagnostic work that gets suppressed products back into search results.',
    challenge: [
      'Marketplace catalog work fails quietly. A listing is live but suppressed, a variation family is split, a product needs a GTIN exemption — and none of it announces itself. Diagnosing why a product is not showing is most of the job.',
    ],
    contribution: [
      'Managed Seller Central catalog operations, including bulk uploads via flat files.',
      'Handled GTIN-exempt products and the documentation they require.',
      'Built and repaired parent-child variation families.',
      'Resolved listing compliance issues and search-suppression errors.',
      'Troubleshot product data problems across the catalog.',
    ],
    process: [
      'Audited the catalog for suppressed, stranded, and incomplete listings.',
      'Fixed the data at the source — the flat file — instead of patching listings one at a time.',
      'Rebuilt variation families so related products sit together on one detail page.',
      'Worked the exemption and compliance cases that cannot be automated.',
      'Re-audited after each upload, because marketplace errors surface late.',
    ],
    decisions: [
      {
        q: 'Fix listings individually, or fix the file?',
        a: 'One-off edits do not survive the next bulk upload. Correcting the source data is the only version that holds.',
      },
      {
        q: 'Flat variations, or parent-child families?',
        a: 'Proper variation families consolidate reviews and search relevance onto one detail page rather than scattering them across near-duplicates.',
      },
    ],
    results: [
      'Suppressed and stranded listings returned to search results.',
      'Variation families corrected so related products share a single detail page.',
      'Bulk upload process that holds up rather than reintroducing the same errors.',
    ],
    reflection:
      'Marketplace operations is where I learned to read an error message as a data problem. It is the same instinct that makes storefront debugging quick.',
    tools: ['Amazon Seller Central', 'Flat file bulk uploads', 'GTIN exemption', 'Parent-child variations', 'Listing compliance', 'Catalog data'],
  },
]

export const filters = ['All', 'Ecommerce', 'Design', 'Marketing', 'Creative Production', 'Live Media']

/* Where each panel hangs. side: -1 = left wall, 1 = right wall. */
export const panelPlacement = [
  { id: 'bigcommerce', z: -8, side: -1, scale: 1.18 },
  { id: 'email', z: -14, side: 1, scale: 1 },
  { id: 'paid', z: -20, side: -1, scale: 1 },
  { id: 'catalog', z: -26, side: 1, scale: 1.06 },
  { id: 'broadcast', z: -32, side: -1, scale: 1 },
  { id: 'brand', z: -38, side: 1, scale: 1 },
  { id: 'uiux', z: -44, side: -1, scale: 1 },
  { id: 'amazon', z: -50, side: 1, scale: 1 },
]

/** The glowing featured panel at the end of the entrance hall. */
export const featured = { id: 'bigcommerce', z: 0.5, x: 3.6, rotY: -0.38, scale: 1.1 }

/* ------------------------------------------------------------------ */
/* About — told as a walk through the space                            */
/* ------------------------------------------------------------------ */

/** Depths of the four standing chapter markers, shared by the scene and the overlay. */
export const CHAPTER_Z = [-59.5, -64, -68.5, -73]

/** Where the closing statement wall stands in the quiet room. */
export const CONTACT_Z = -114.5

export const about = {
  title: 'About',
  lede: 'A designer who learned ecommerce by running one, and a marketer who learned design by producing it.',
  chapters: [
    {
      id: 'story',
      heading: 'The story',
      body: [
        'I started in a marketing coordinator’s seat, leading a small design team and producing catalogs, magazine advertising, and campaign work for a specialty retailer. The catalogs were hundreds of pages long, which is how I learned that design at scale is really systems work.',
        'When the business needed its storefront to carry more weight, I went and learned to build it. Now I lead end-to-end digital operations for that same multimillion-dollar business — the site, the merchandising, the campaigns, the marketplace, and the print that still matters in this industry.',
        'Alongside it I run Hope in Print, my own studio, building brands and websites for small businesses, ministries, and nonprofits.',
      ],
    },
    {
      id: 'approach',
      heading: 'The approach',
      body: [
        'I start from the business problem and design backwards to the pixels. That order matters: a beautiful category page that hides the product is a failure, and a fast checkout nobody trusts is worse.',
        'I favour the least invasive change that solves the problem, because I have to live with the system afterwards. Reversible beats clever. Systems beat one-offs. Documented beats impressive.',
      ],
    },
    {
      id: 'range',
      heading: 'The range',
      body: [
        'Most people who can write the front-end code cannot art-direct the photography. Most people who can produce a two-hundred-page catalog cannot debug a suppressed Amazon listing. I do both, and the value is not that I can do many things — it is that fewer handoffs means fewer places for the work to lose its intent.',
        'The storefront, the email that drives traffic to it, the ad creative, the catalog, and the live broadcast that announces the season are all the same brand. I can keep them that way because I make all of them.',
      ],
    },
    {
      id: 'leadership',
      heading: 'Leadership',
      body: [
        'I have led a team of designers, run campaign calendars and creative reviews, and presented to stakeholders across sales, operations, and product. I have also spent years teaching Sunday school and youth classes and delivering meals to seniors — which is where I actually learned to explain something clearly to someone who has no reason to care yet.',
        'That is most of creative direction: making the work make sense to the person who has to approve it, build it, or use it.',
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Expertise — six materials on pedestals                              */
/* ------------------------------------------------------------------ */

export const expertise = [
  {
    id: 'ecommerce',
    title: 'Ecommerce',
    material: 'metal',
    blurb: 'Storefront ownership end to end — merchandising, product data, conversion paths, and marketplace operations.',
    items: ['BigCommerce', 'Shopify', 'Squarespace', 'Wix', 'Amazon Seller Central', 'Catalog management', 'Conversion optimization', 'Web merchandising'],
  },
  {
    id: 'web',
    title: 'Web',
    material: 'glass',
    blurb: 'Front-end work on live storefronts: responsive UI, custom script layers, and app integrations that stay maintainable.',
    items: ['HTML', 'CSS', 'JavaScript', 'Responsive design', 'UI/UX', 'Script Manager', 'App integrations', 'SEO'],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    material: 'stone',
    blurb: 'Integrated campaigns where the ad, the email, the landing page, and the promotion are designed as one thing.',
    items: ['Meta Ads Manager', 'AdRoll', 'Mailchimp', 'Klaviyo', 'Segmentation', 'Campaign strategy', 'Retargeting', 'Performance review'],
  },
  {
    id: 'production',
    title: 'Creative Production',
    material: 'paper',
    blurb: 'Print and digital production at scale — catalogs, advertising, packaging, and the systems that keep them consistent.',
    items: ['InDesign', 'Photoshop', 'Illustrator', 'Print catalogs', 'Magazine ads', 'Packaging', 'Interactive PDF', 'Prepress'],
  },
  {
    id: 'live',
    title: 'Live Media',
    material: 'light',
    blurb: 'Weekly live broadcast production and post — scenes, switching, audio, distribution, and the edit.',
    items: ['OBS Studio', 'Restream', 'Premiere Pro', 'Live audio', 'Motion graphics', 'Photography', 'Video post-production'],
  },
  {
    id: 'strategy',
    title: 'Strategy',
    material: 'wood',
    blurb: 'Creative direction and project leadership — turning a business goal into a plan a team can actually ship.',
    items: ['Creative direction', 'Campaign calendars', 'Project planning', 'Team coordination', 'Stakeholder communication', 'Workflow improvement'],
  },
]

/* ------------------------------------------------------------------ */
/* Résumé                                                              */
/* ------------------------------------------------------------------ */

export const resume = {
  summary:
    'Multidisciplinary ecommerce and digital experience specialist with 4+ years leading the strategy, design, development, and marketing of online storefronts and client brands. Combines hands-on BigCommerce administration and front-end development with UI/UX, paid media, email marketing, marketplace catalog management, and print production.',
  experience: [
    {
      org: 'Matuska Taxidermy Supply Company',
      title: 'Freelance Marketing & Design Specialist / Ecommerce Lead',
      meta: 'Remote · January 2025 – Present',
      points: [
        'Lead day-to-day front-end and back-end operations for a multimillion-dollar ecommerce business, owning site experience, merchandising, content, and technical problem-solving.',
        'Manage and continuously improve a custom BigCommerce storefront through HTML, CSS, JavaScript, Script Manager, app integrations, responsive UI, navigation, product pages, and checkout workflows.',
        'Plan and execute integrated marketing across Meta Ads, AdRoll retargeting and display, email, social, onsite promotions, and seasonal campaigns.',
        'Direct email marketing from campaign planning and design through segmentation, scheduling, deployment, and results analysis.',
        'Produce print catalogs, digital catalogs, magazine advertisements, brochures, banners, product graphics, packaging, and sales materials on a consistent brand system.',
        'Manage Amazon Seller Central catalog operations including bulk uploads, GTIN-exempt products, parent-child variations, listing compliance, and search-suppression issues.',
      ],
    },
    {
      org: 'Matuska Taxidermy Supply Company',
      title: 'Marketing Coordinator',
      meta: 'In-Office · August 2022 – December 2024',
      points: [
        'Led a team of designers and coordinated integrated campaigns across ecommerce, email, social media, print, and trade publications.',
        'Directed production of large print and digital product catalogs — page planning, design systems, product content, proofing, and print-ready files.',
        'Designed magazine advertisements, brochures, packaging, product collateral, email campaigns, social graphics, and seasonal promotional materials.',
        'Managed campaign calendars, project timelines, creative reviews, and stakeholder presentations across sales, operations, and product teams.',
        'Supported ecommerce merchandising, product launches, web content, photography, and video editing.',
      ],
    },
    {
      org: 'Hope in Print',
      title: 'Owner · Creative, Web & Marketing Specialist',
      meta: 'Self-Employed / Multiple Clients · January 2023 – Present',
      points: [
        'Founded and manage a multidisciplinary creative studio delivering brand strategy, web and ecommerce design, print, film, and marketing for small businesses, ministries, and nonprofits.',
        'Build cohesive brand identities and responsive websites across Shopify, BigCommerce, Squarespace, and Wix.',
        'Develop email, social, content, and paid-campaign creative as consistent digital and print systems.',
        'Manage the full client lifecycle: discovery, proposals, scope, timelines, feedback, production, launch, and post-launch support.',
        'Provide art direction, photography, video editing and post-production, interactive PDFs, and narrative-driven content.',
      ],
    },
  ],
  education: [{ org: 'Minnesota State University', title: 'Bachelor of Science, Marketing', meta: '2016 – 2020' }],
  service: [
    { org: 'Sunday School & Youth Leader · Local Church', meta: '2020 – 2022', note: 'Led Sunday School and Wednesday-night classes, created lessons, and mentored students.' },
    { org: 'Meals on Wheels · Spirit Lake, IA', meta: '2019 – 2020', note: 'Delivered meals and provided companionship to seniors and community members.' },
    { org: 'Feeding Our Communities · Mankato, MN', meta: '2019', note: 'Supported food distribution and event coordination for local families.' },
  ],
  capabilities: [
    { label: 'Ecommerce & Web', value: 'BigCommerce, Shopify, Squarespace, Wix, Amazon Seller Central, responsive design, UI/UX, conversion optimization, SEO, web merchandising, product and catalog management, app integrations, Script Manager, HTML, CSS, JavaScript' },
    { label: 'Digital Marketing', value: 'Meta Ads Manager, AdRoll, retargeting and display, email marketing, campaign strategy, audience segmentation, content marketing, social media, seasonal promotions, performance review' },
    { label: 'Creative & Production', value: 'Adobe Creative Suite (Photoshop, Illustrator, InDesign, Premiere Pro, Acrobat), Figma, Canva, brand identity, print and digital catalogs, magazine ads, brochures, packaging, photography, video post-production, interactive PDFs' },
    { label: 'Leadership & Operations', value: 'Cross-functional collaboration, project planning, creative direction, team coordination, stakeholder communication, campaign calendars, workflow improvement, Google Workspace, Microsoft Office' },
  ],
}

/* ------------------------------------------------------------------ */
/* Studio Work — the side gallery                                      */
/* ------------------------------------------------------------------ */

export const studioWork = {
  intro:
    'A side room for the work that pays in a different currency — painting and personal image-making. Kept deliberately separate from the commercial gallery.',
  hint: 'Drag anywhere to turn and look around the room.',
  note: 'Placeholder plates. Replace the entries below with real photographs of the work.', // VERIFY — swap for real art
  /**
   * Three, hung large. `wall` places each one: 'end' faces you as you arrive,
   * 'left' and 'right' need you to turn your head. Add a fourth and it lands on
   * the end wall beside the first — better to swap one out.
   */
  pieces: [
    { id: 'sw1', title: 'Quiet Hour', meta: 'Oil on canvas · 120 × 150cm', wall: 'end', art: { kind: 'paint', seed: 55 } },
    { id: 'sw2', title: 'Study in Warm Light', meta: 'Acrylic on panel · 90 × 110cm', wall: 'left', art: { kind: 'paint', seed: 21 } },
    { id: 'sw3', title: 'Interior, Morning', meta: 'Gouache · 70 × 90cm', wall: 'right', art: { kind: 'paint', seed: 89 } },
  ],
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export const contact = {
  heading: 'Let’s talk.',
  body: 'Hiring, a project, or a question about something in this room — all welcome. The form opens a pre-filled email; nothing is stored or sent anywhere else.',
  subjects: ['A role', 'A studio project', 'Something else'],
}
