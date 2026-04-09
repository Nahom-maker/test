/**
 * Format output for Telegram.
 * We resolve complex or poorly formatted AI text into clean HTML for Telegram's HTML parse_mode.
 * Using HTML instead of MarkdownV2 reduces the chance of unclosed tags or escaping issues causing API 400 errors.
 */

export function cleanTextForTelegram(text) {
  if (!text) return '';

  let cleaned = text;

  // 1. Math / LaTeX handling: Convert $...$ or $$...$$ to plain text or code block
  // Replace block math $$...$$
  cleaned = cleaned.replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    return `\n<pre>${escapeHtml(math.trim())}</pre>\n`;
  });

  // Replace inline math $...$
  cleaned = cleaned.replace(/\$(.*?)\$/g, (_, math) => {
    return `<code>${escapeHtml(math.trim())}</code>`;
  });

  // 2. Markdown normalization
  // Convert ##text## -> <b>text</b>
  cleaned = cleaned.replace(/##(.*?)##/g, '<b>$1</b>');
  // Convert **text** -> <b>text</b>
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  // Convert *text* -> <i>text</i>  (avoid catching list asterisks by checking word boundaries or non-spaces)
  cleaned = cleaned.replace(/\b\*(.*?)\*\b/g, '<i>$1</i>');

  // 3. Structure correction for messy lists
  // e.g. "1. item 2. item 3. item" into proper spacing
  cleaned = cleaned.replace(/(\d+\.)\s*(?=[A-Z])/g, '\n$1 ');

  // 4. Escape general HTML, but keep our allowed tags
  // Using a selective mapping is necessary to avoid stripping our newly added b/i/code tags.
  // We'll trust the LLM won't output arbitrary malicious HTML, but we must escape `<` and `>` that aren't our tags.
  cleaned = escapeNonAllowedHtml(cleaned);

  // 5. Paragraph spacing
  // Avoid more than 2 consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Escapes HTML characters securely.
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes `<` and `>` only if they aren't part of Telegram's allowed HTML tags.
 * Built-in tags: <b>, <strong>, <i>, <em>, <u>, <ins>, <s>, <strike>, <del>, <span>, <tg-spoiler>, <a>, <code>, <pre>, <tg-emoji>, <blockquote>, <expandable>
 */
function escapeNonAllowedHtml(text) {
  const allowedTags = ['b', 'i', 'code', 'pre', 'a', 'u', 's'];
  const allowedPattern = new RegExp(`<\/?(?:${allowedTags.join('|')})[^>]*>`, 'gi');
  
  let parts = [];
  let lastIndex = 0;
  let match;

  while ((match = allowedPattern.exec(text)) !== null) {
    // Escape the text before the tag
    parts.push(escapeHtml(text.substring(lastIndex, match.index)));
    // Push the tag unescaped
    parts.push(match[0]);
    lastIndex = allowedPattern.lastIndex;
  }
  // Escape the remaining text
  parts.push(escapeHtml(text.substring(lastIndex)));

  return parts.join('');
}
