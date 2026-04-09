import pdfParse from 'pdf-parse';

export async function extractTextFromPdf(pdfUrl) {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the PDF
    const data = await pdfParse(buffer);
    
    return data.text;
  } catch (error) {
    console.error('[Document Extraction Error]', error);
    return null;
  }
}
