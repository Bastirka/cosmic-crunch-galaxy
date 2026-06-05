# App icons (placeholders)

Add two PNG app icons here for installable-PWA / home-screen support:

```
public/icons/icon-192.png   (192×192)
public/icons/icon-512.png   (512×512)
```

They are referenced by `public/manifest.webmanifest` and the `apple-touch-icon`
link in `src/routes/__root.tsx`. Use a square, non-copyrighted artwork (the
neon star/planet works well) on a dark `#0a0a14` background. Until you add them
the app still runs and the manifest theme color/standalone behavior apply; only
the home-screen icon image is missing.
