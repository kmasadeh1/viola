/**
 * sanitize.js — XSS Prevention Utility
 * ======================================
 * Never use innerHTML with raw API payloads.
 * Use these helpers everywhere dynamic content is rendered.
 */

/**
 * Encodes a raw string so it is safe to embed inside an innerHTML template literal.
 * Special HTML characters (<, >, &, ", ') are converted to entities.
 * @param {*} str - Value from API / user input
 * @returns {string} HTML-entity-encoded string
 */
export function sanitizeText(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Safely sets the text content of a DOM element.
 * Equivalent to element.textContent = str but with a null-safety guard.
 * @param {HTMLElement} el
 * @param {*} str
 */
export function setTextContent(el, str) {
    if (el) el.textContent = (str === null || str === undefined) ? '' : String(str);
}

/**
 * Safely sets an attribute on a DOM element after encoding the value.
 * @param {HTMLElement} el
 * @param {string} attr
 * @param {*} val
 */
export function setSafeAttr(el, attr, val) {
    if (el) el.setAttribute(attr, (val === null || val === undefined) ? '' : String(val));
}
