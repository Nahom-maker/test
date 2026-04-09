/**
 * Splits a large text into chunks of maximum ~MAX_LEN chars,
 * trying to break at paragraphs (double newline) or sentences.
 */
export function chunkText(text, maxLen = 1000) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let currentChunk = '';

  // Split by double newline first (paragraphs)
  const paragraphs = text.split('\n\n');

  for (const para of paragraphs) {
    // If adding this paragraph fits
    if (currentChunk.length + para.length + 2 <= maxLen) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      // If the paragraph itself is larger than maxLen, split by sentences
      if (para.length > maxLen) {
        // Push the accumulated currentChunk
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        // Split paragraph by sentences (rough approximation)
        const sentences = para.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g) || [para];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxLen) {
            currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            // If a single sentence is incredibly long
            if (sentence.length > maxLen) {
              const words = sentence.split(' ');
              let wordChunk = '';
              for (const word of words) {
                if (wordChunk.length + word.length + 1 <= maxLen) {
                  wordChunk += (wordChunk ? ' ' : '') + word;
                } else {
                  if (wordChunk) chunks.push(wordChunk);
                  wordChunk = word;
                }
              }
              currentChunk = wordChunk;
            } else {
              currentChunk = sentence.trim();
            }
          }
        }
      } else {
        // Paragraph fits in its own chunk, push old chunk and start new
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = para;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
