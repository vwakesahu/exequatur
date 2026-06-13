# exequatur landing

Landing page for exequatur. Next.js 16 (App Router), React 19, TypeScript, Tailwind, shadcn style.
The hero is a noise displaced icosahedron rendered with three.js and a custom shader, driven by a
GSAP scroll timeline.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build
```

Structure:

```
src/app         layout, page, global styles
src/components   Navbar, Hero (three.js scene), Features, Demo, HowItHolds, Footer
src/components/ui  button + cult buttons and gradient heading
src/shaders     vertex and fragment shaders as TS strings
```
