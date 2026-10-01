The clerk, one picture per mood, as used by `components/MascotImage.tsx`:

```
idle.webp  thinking.webp  answering.webp  refusing.webp  error.webp  filed.webp
```

512×512, transparent, the body cut off by the bottom edge on purpose — the
analyst panel draws a desk along that edge. Made from the full-size PNGs
(`folio-*.png`, kept out of git) by cleaning the near-invisible fringe the
background removal left, squaring onto a bottom-aligned canvas, and encoding
WebP at quality 86: about 40 KB each instead of ~1.6 MB.

The header mark (`public/brand/folio-mark.webp`) and the favicon, app icon and
Apple touch icon (`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`) are
cut from `idle`: head and tie, on the brand blue for the icons.

`PROMPTS.md` has the image prompts the poses were generated from.
