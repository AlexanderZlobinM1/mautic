import mjml2html from 'mjml-browser';

export default class MjmlService {
  /**
   * Get the mjml document from the dom
   *
   * @returns string
   */
  static getOriginalContentMjml() {
    return mQuery('textarea.builder-mjml').val();
  }

  /**
   * Get the editors mjml and transform it to html
   * @param {Grapesjs Editor} editor
   * @returns string
   */
  static getEditorHtmlContent(editor) {
    // Try catch for mjml parser error
    try {
      // html needs to be beautified for the click tracking to work. Therefore, we can
      // not use the built in command: mjml-get-code
      const mjml = this.getEditorMjmlContent(editor);
      const code = this.mjmlToHtml(mjml);

      return code.html ? code.html.trim() : '';
    } catch (error) {
      console.warn(error.message);
      alert('Errors inside your template. Template will not be saved.');
    }
    return '';
  }

  /**
   * Get the editors mjml
   * @param {Grapesjs Editor} editor
   * @returns string
   */
  static getEditorMjmlContent(editor) {
    // cleanId: Remove unnecessary IDs (eg. those created automatically)
    return editor.getHtml({ cleanId: true }).trim();
  }

  /**
   * Normalise HTML entities inside inline style attribute values.
   *
   * Mautic issue #17575: an entity-encoded quote inside a style value (e.g.
   * style="font-family:&quot;Segoe UI&quot;, Arial;") reaches juice's CSS
   * parser with the entity text intact. The entity ends with a semicolon, so
   * the CSS parser splits the declaration there and inline-css receives a
   * declaration without a property name, which makes it evaluate
   * e.prop.indexOf("--") on undefined and throw. The error is swallowed by
   * mjmlToHtml(), so the builder save silently does nothing.
   *
   * Entity-encoded quotes are normalised to single quotes: valid CSS for a
   * quoted font name, and it keeps the attribute quoting intact.
   *
   * @param {string} mjml
   * @returns string
   */
  static normalizeStyleEntities(mjml) {
    if (typeof mjml !== 'string') {
      return mjml;
    }

    const lower = mjml.toLowerCase();
    if (lower.indexOf('&quot;') === -1 && lower.indexOf('&apos;') === -1) {
      return mjml;
    }

    return mjml.replace(/(style\s*=\s*)(["'])(.*?)\2/gi, (match, prefix, quote, value) => {
      const normalized = value.replace(/&quot;/gi, "'").replace(/&apos;/gi, "'");

      return normalized === value ? match : prefix + quote + normalized + quote;
    });
  }

  /**
   * Transform MJML to HTML
   * @todo show validation errors in the UI
   * @returns string
   */
  static mjmlToHtml(mjml, endpoint = '') {
    let html = '';

      if (typeof mjml !== 'string' || !/<mjml(?:\s[^>]*)?>/i.test(mjml)) {
      throw new Error('No valid MJML provided');
    }

    // Mautic issue #17575: entity-encoded quotes inside inline style values
    // break juice's CSS parser (the entity ends with ';'), which makes
    // mjmlToHtml() swallow a TypeError and leaves the builder save dead.
    mjml = MjmlService.normalizeStyleEntities(mjml);

    if (endpoint !== '') {
      html = MjmlService.mjmlToHtmlViaEndpoint(mjml, endpoint);
    } else {
      // html needs to be beautified for the click tracking to work.
      // strict mode not working with e.g. id="" and data-type parameters that
      // are e.g. used for Dynamic Content
      html = mjml2html(mjml, { beautify: true });
    }

    return html;
  }

  /**
   * Transform MJML to HTML via endpoint
   * @returns string
   */
  static mjmlToHtmlViaEndpoint(mjml, endpoint) {
    const xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open('POST', endpoint, false);
    xmlHttpRequest.setRequestHeader('Content-type', 'application/json');
    xmlHttpRequest.send(JSON.stringify({ mjml }));

    return xmlHttpRequest.responseText ? JSON.parse(xmlHttpRequest.responseText) : '';
  }
}
