# Vanilla Docs and Demo

This folder includes two runnable static pages:

- `index.html` - main product demo (prediction cone + safe triangle)
- `docs.html` - detailed docs page with interactive API examples editor

## Local run

Use any static server so JSON loading works (`docs.html` fetches `api-examples.json`).

```bash
cd /Users/pavel/PhpstormProjects/prediction_cone
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/examples/vanilla/index.html`
- `http://localhost:4173/examples/vanilla/docs.html`

## Interactive docs behavior

- Add/edit/delete examples in the form
- Search examples in real time
- Data persists in browser `localStorage`
- Export current examples as JSON
- Reset back to `api-examples.json` defaults

