# Before this goes live

Everything on the site is drawn from your résumé and from work you actually did.
Where a number belongs but I could not confirm it, the copy stays qualitative
rather than inventing a figure — those are the lines below.

All of it lives in [`src/data/content.js`](src/data/content.js), marked
`// VERIFY`.

## Must fix

- [ ] **LinkedIn URL.** Your résumé prints `linkedin.com/katelynnnoah`, which is
      missing the `/in/`. The site links to `https://www.linkedin.com/in/katelynnnoah`.
      Confirm that resolves, or paste the real one into `identity.linkedin.href`.
- [ ] **Location.** Set to `Remote · United States` because the résumé does not
      state a city. Put your real city/state in `identity.location` if you want
      it shown — recruiters filter on it.
- [ ] **Availability line.** Currently *"Open to full-time roles and select
      studio projects."* Change it or remove it.

## Case study 05 — Weekly Live Broadcast Production

This is the one project with no detail on the résumé, so it is the thinnest.

- [ ] **Who it is for.** Listed as `Independent / studio production`. Name the
      show, church, or client if you are able to.
- [ ] **When it started.** Listed as `Weekly, ongoing`. Add a start year.
- [ ] Consider adding: episode count, platforms it goes out to, typical audience.

## Case study 07 — UI/UX Product Concept

- [ ] **Year.** Set to `2025` as a placeholder.
- [ ] **What the concept actually is.** The copy describes the *process*
      honestly but deliberately never names the product, because I do not know
      it. One or two sentences naming the problem would make this much stronger.

## Studio work (the side gallery)

- [ ] The four pieces — *Study in Warm Light*, *Field Notes*, *Quiet Hour*,
      *Interior, Morning* — are **invented placeholders** with generated
      paintings. Replace `studioWork.pieces` with your real work, or delete the
      section from `sections` if you would rather not show it yet.

## Numbers you could add

The BigCommerce case study is the only one with hard figures, and they are real
(≈30 tiles collapsed into one doorway, zero catalog records edited, fully
reversible). Everywhere else the results are written as outcomes you can defend
without a metric. If you have any of the following, they would each strengthen a
case study considerably:

- [ ] **02 Email** — list size, open/click rates before and after, revenue per send
- [ ] **03 Paid media** — ROAS, cost per acquisition, spend scale
- [ ] **04 Catalog** — page count, SKU count, how many editions a year
- [ ] **05 Broadcast** — episodes to date, concurrent viewers, platform count
- [ ] **06 Brand** — how many clients, any you can name
- [ ] **08 Amazon** — SKUs managed, listings recovered from suppression

## Deliberately left out

Named here so you can decide differently, not because I forgot:

- **Your employer is named.** Matuska Taxidermy Supply Company appears, because
  it is printed on your public résumé. If you would rather it read
  *"a multimillion-dollar specialty outdoor retailer"*, change `org` on projects
  01, 03, 04 and 08 and in `resume.experience`.
- **No internal data.** No store hashes, admin URLs, CDN paths, customer data,
  revenue figures, or private links anywhere in the build.
- **No client work is shown as imagery.** Every panel artwork is an abstract
  diagram of the *kind* of work, generated in code. Nothing is a screenshot of a
  real client asset. If you want real screenshots, they would go in as textures
  on the panel faces — worth doing for 01 and 04 especially.

## Launch checklist

- [ ] Swap the résumé PDF in `public/` when you next update it (keep the filename,
      or change `identity.resumeFile`).
- [ ] Set the repo's **Pages → Source → GitHub Actions**, push to `main`.
- [ ] Point your domain at it and update the `og:image` URL if you want link
      previews to use a hosted image rather than the bundled `social.svg`.
- [ ] Ask one person to open it cold and tell you what you do, without being
      told anything first.
