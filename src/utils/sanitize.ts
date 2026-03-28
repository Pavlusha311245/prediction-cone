/**
 * Minimal HTML/SVG sanitizer for icon content.
 *
 * Uses the built-in HTMLRewriter API — zero extra dependencies,
 * works natively in both browsers and Bun (test environment).
 * Removes script tags, event handlers, and javascript: URLs.
 *
 * @module prediction-cone/utils/sanitize
 */

/**
 * Tags that are removed entirely (along with their content).
 */
const DANGEROUS_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "base",
  "template",
  "noscript",
  "applet",
  "xml",
]);

/**
 * Tags that are allowed through. Anything else is unwrapped
 * (element removed, children kept) via removeAndKeepContent().
 */
const ALLOWED_TAGS = new Set([
  // SVG structural
  "svg",
  "g",
  "defs",
  "use",
  "symbol",
  "desc",
  "title",
  // SVG shapes
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  // SVG text
  "text",
  "tspan",
  // SVG effects / gradients / clip
  "clippath",
  "mask",
  "filter",
  "lineargradient",
  "radialgradient",
  "stop",
  "fegaussianblur",
  "feoffset",
  "feblend",
  "fecolormatrix",
  "fecomposite",
  "feflood",
  "femerge",
  "femergenode",
  // Inline HTML
  "span",
  "i",
  "b",
  "strong",
  "em",
  "img",
]);

/**
 * Attributes that are allowed. Anything else is stripped.
 * data-* and aria-* are always allowed (checked by prefix below).
 */
const ALLOWED_ATTRS = new Set([
  // Universal
  "id",
  "class",
  "style",
  "title",
  // Accessibility
  "aria-hidden",
  "aria-label",
  "role",
  // SVG presentation
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "clip-rule",
  "color",
  "display",
  "visibility",
  "overflow",
  "transform",
  "color-interpolation-filters",
  // SVG geometry / structural
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
  "points",
  "viewbox",
  "preserveaspectratio",
  "xmlns",
  "clip-path",
  "mask",
  "marker-end",
  "marker-start",
  "marker-mid",
  // Gradient / filter internals
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "offset",
  "stop-color",
  "stop-opacity",
  "filterunits",
  "primitiveunits",
  "result",
  "in",
  "in2",
  "type",
  "values",
  "mode",
  "stddeviation",
  "dx",
  "dy",
  "flood-color",
  "flood-opacity",
  // HTML img
  "src",
  "alt",
]);

/**
 * URL-bearing attributes where javascript:/vbscript:/data:text/html must be rejected.
 */
const URL_ATTRS = new Set(["href", "src", "xlink:href", "action", "formaction"]);

/**
 * Sanitize an HTML/SVG string and return safe markup.
 *
 * Uses HTMLRewriter (built into Bun and modern browsers) with a strict allowlist.
 * Suitable for developer-supplied icon strings (SVG, inline HTML snippets).
 *
 * @example
 * await sanitizeHtml('<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>') // ✅ passes through
 * await sanitizeHtml('<img src=x onerror=alert(1)>')                        // ✅ strips onerror
 * await sanitizeHtml('<script>alert(1)</script>')                           // ✅ removed entirely
 */
export async function sanitizeHtml(html: string): Promise<string> {
  const rewriter = new HTMLRewriter().on("*", {
    element(el) {
      const tag = el.tagName.toLowerCase();

      // Dangerous tags: remove element + its content entirely
      if (DANGEROUS_TAGS.has(tag)) {
        el.remove();
        return;
      }

      // Unknown (non-dangerous) tags: strip the element but keep children
      if (!ALLOWED_TAGS.has(tag)) {
        el.removeAndKeepContent();
        return;
      }

      // Allowed tag: audit attributes
      // Collect first, then remove — safe against mutating the iterator
      const toRemove: string[] = [];

      for (const [name, value] of el.attributes) {
        const nameLower = name.toLowerCase();

        // Strip all event handlers (onclick, onerror, onmouseover, …)
        if (nameLower.startsWith("on")) {
          toRemove.push(name);
          continue;
        }

        // Strip attributes not on the allowlist (data-* and aria-* are always OK)
        if (
          !ALLOWED_ATTRS.has(nameLower) &&
          !nameLower.startsWith("data-") &&
          !nameLower.startsWith("aria-")
        ) {
          toRemove.push(name);
          continue;
        }

        // Strip dangerous URL schemes from URL-bearing attributes
        if (URL_ATTRS.has(nameLower)) {
          const normalized = value.trim().toLowerCase().replace(/\s/g, "");
          if (
            normalized.startsWith("javascript:") ||
            normalized.startsWith("vbscript:") ||
            normalized.startsWith("data:text/html")
          ) {
            toRemove.push(name);
          }
        }
      }

      for (const name of toRemove) {
        el.removeAttribute(name);
      }
    },
  });

  return rewriter.transform(new Response(html)).text();
}
