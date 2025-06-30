export async function extractTextFromPDF(url: string): Promise<string> {
  try {
    console.log('Extracting text from PDF:', url);
    
    // Dynamic import to avoid build-time issues
    const pdf = (await import('pdf-parse')).default;
    
    // Fetch the PDF from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));
    
    console.log('PDF extraction successful:', {
      numPages: data.numpages,
      textLength: data.text.length,
    });
    
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
} 