# PDF Text Extraction Service Documentation

## Overview

The PDF Text Extraction Service is a comprehensive solution for extracting text content from PDF files uploaded to StudyBase and storing it in the Supabase database. This enables text-based search, AI interactions, and content analysis for uploaded PDFs.

## Features

- **Automatic Text Extraction**: Extract text from PDF files using PDF.js
- **Database Storage**: Store extracted text in Supabase with proper indexing
- **Batch Processing**: Process multiple PDFs in a base simultaneously
- **Status Tracking**: Track extraction status (pending, processing, completed, failed)
- **Text Search**: Search across extracted text content
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Row Level Security (RLS) policies for data protection

## Database Schema

### New Table: `pdf_text_content`

```sql
CREATE TABLE pdf_text_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES base_files(id) ON DELETE CASCADE,
  extracted_text TEXT,
  text_length INTEGER DEFAULT 0,
  extraction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_pdf_text_content_file_id ON pdf_text_content(file_id);
CREATE INDEX idx_pdf_text_content_status ON pdf_text_content(status);
```

### RLS Policies

The table includes comprehensive Row Level Security policies ensuring users can only access text content from their own files.

## Installation

1. **Install Dependencies**:
   ```bash
   npm install pdfjs-dist@4.0.379
   ```

2. **Run Database Migration**:
   Execute the SQL commands in `supabase-queries.sql` to create the new table and policies.

## Usage

### 1. Basic Service Usage

```javascript
import { pdfTextExtractor } from '../services/pdfTextExtractor';

// Extract text from a single PDF
const result = await pdfTextExtractor.extractAndStoreText(
  fileId,      // File ID from base_files table
  filePath,    // Storage path in Supabase
  fileName     // Original filename
);

console.log(result);
// Output: { success: true, text: "extracted text...", message: "Text extracted successfully" }
```

### 2. Using the React Hook

```javascript
import { usePDFTextExtraction } from '../hooks/usePDFTextExtraction';

const MyComponent = () => {
  const {
    isExtracting,
    extractionStatus,
    extractTextFromFile,
    processBasePDFs,
    searchPDFText
  } = usePDFTextExtraction();

  // Extract text from a single file
  const handleExtract = async (file) => {
    const result = await extractTextFromFile(file.id, file.file_path, file.file_name);
    console.log('Extraction result:', result);
  };

  // Process all PDFs in a base
  const handleProcessAll = async (baseId) => {
    const result = await processBasePDFs(baseId);
    console.log('Batch processing result:', result);
  };

  // Search text content
  const handleSearch = async (baseId, searchTerm) => {
    const results = await searchPDFText(baseId, searchTerm);
    console.log('Search results:', results);
  };

  return (
    <div>
      {isExtracting && <div>Processing PDFs...</div>}
      {/* Your UI components */}
    </div>
  );
};
```

### 3. Using the React Component

```javascript
import PDFTextExtraction from '../components/PDFTextExtraction';

const BaseView = ({ baseId, files }) => {
  const handleExtractionComplete = (fileId, result) => {
    console.log('Extraction completed for file:', fileId);
    // Handle the completion (e.g., update UI, trigger AI processing)
  };

  return (
    <div>
      {/* Your existing content */}
      
      <PDFTextExtraction
        baseId={baseId}
        files={files}
        onExtractionComplete={handleExtractionComplete}
      />
    </div>
  );
};
```

## API Reference

### PDFTextExtractor Class

#### Methods

##### `extractAndStoreText(fileId, filePath, fileName)`
Extract text from a single PDF file and store it in the database.

**Parameters:**
- `fileId` (string): File ID from base_files table
- `filePath` (string): Storage path in Supabase
- `fileName` (string): Original filename

**Returns:** Promise<Object>
```javascript
{
  success: boolean,
  text?: string,
  error?: string,
  message: string
}
```

##### `processBasePDFs(baseId)`
Process all PDF files in a base.

**Parameters:**
- `baseId` (string): Base ID

**Returns:** Promise<Object>
```javascript
{
  success: boolean,
  processed: number,
  successCount: number,
  errorCount: number,
  results: Array<Object>,
  message: string
}
```

##### `getExtractionStatus(fileId)`
Get extraction status for a specific file.

**Parameters:**
- `fileId` (string): File ID

**Returns:** Promise<Object>
```javascript
{
  status: string,
  textLength?: number,
  extractionDate?: string,
  errorMessage?: string,
  message: string
}
```

##### `searchPDFText(baseId, searchTerm)`
Search text content across PDFs in a base.

**Parameters:**
- `baseId` (string): Base ID
- `searchTerm` (string): Search term

**Returns:** Promise<Array<Object>>

##### `deleteExtractedText(fileId)`
Delete extracted text for a file.

**Parameters:**
- `fileId` (string): File ID

**Returns:** Promise<void>

### usePDFTextExtraction Hook

#### State
- `isExtracting` (boolean): Whether extraction is in progress
- `extractionProgress` (number): Progress percentage (0-100)
- `extractionStatus` (Object): Status for each file

#### Methods
- `extractTextFromFile(fileId, filePath, fileName)`
- `processBasePDFs(baseId)`
- `getExtractionStatus(fileId)`
- `searchPDFText(baseId, searchTerm)`
- `deleteExtractedText(fileId)`
- `clearExtractionStatus()`

## Integration Examples

### 1. Add to Existing BaseView Component

```javascript
// In BaseView.js
import PDFTextExtraction from './PDFTextExtraction';

const BaseView = () => {
  // ... existing code ...

  const handleExtractionComplete = (fileId, result) => {
    // Update UI or trigger additional processing
    console.log('PDF text extracted:', fileId);
  };

  return (
    <div className="base-view">
      {/* ... existing content ... */}
      
      {/* Add PDF extraction section */}
      <PDFTextExtraction
        baseId={baseId}
        files={files}
        onExtractionComplete={handleExtractionComplete}
      />
    </div>
  );
};
```

### 2. Automatic Extraction on File Upload

```javascript
// In EditBase.js or NewBase.js
import { pdfTextExtractor } from '../services/pdfTextExtractor';

const handleFileUpload = async (file) => {
  // ... existing upload logic ...
  
  // After successful upload, extract text if it's a PDF
  if (file.file_type === 'application/pdf') {
    try {
      await pdfTextExtractor.extractAndStoreText(
        uploadedFile.id,
        uploadedFile.file_path,
        uploadedFile.file_name
      );
      console.log('Text extracted automatically');
    } catch (error) {
      console.error('Auto-extraction failed:', error);
    }
  }
};
```

### 3. Search Integration

```javascript
// Add search functionality to your components
const SearchComponent = ({ baseId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { searchPDFText } = usePDFTextExtraction();

  const handleSearch = async () => {
    const results = await searchPDFText(baseId, searchTerm);
    setSearchResults(results);
  };

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search PDF content..."
      />
      <button onClick={handleSearch}>Search</button>
      
      {searchResults.map((result) => (
        <div key={result.id}>
          <h4>{result.base_files.file_name}</h4>
          <p>{result.extracted_text.substring(0, 200)}...</p>
        </div>
      ))}
    </div>
  );
};
```

## Error Handling

The service includes comprehensive error handling:

```javascript
try {
  const result = await pdfTextExtractor.extractAndStoreText(fileId, filePath, fileName);
  
  if (result.success) {
    console.log('Text extracted successfully');
  } else {
    console.error('Extraction failed:', result.error);
  }
} catch (error) {
  console.error('Service error:', error);
}
```

## Performance Considerations

1. **Large PDFs**: The service processes large PDFs page by page to avoid memory issues
2. **Batch Processing**: Use `processBasePDFs()` for multiple files to avoid overwhelming the system
3. **Caching**: Extracted text is cached in the database to avoid re-processing
4. **Progress Tracking**: Use the hook's `extractionProgress` for user feedback

## Security

- **RLS Policies**: All database operations are protected by Row Level Security
- **User Isolation**: Users can only access text from their own files
- **File Validation**: Only PDF files are processed
- **Error Logging**: Sensitive information is not logged

## Troubleshooting

### Common Issues

1. **PDF.js Worker Error**:
   ```javascript
   // Ensure PDF.js worker is properly configured
   pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
   ```

2. **Memory Issues with Large PDFs**:
   - The service processes PDFs page by page
   - Consider implementing pagination for very large documents

3. **Database Connection Issues**:
   - Check Supabase connection and RLS policies
   - Verify user authentication

### Debug Mode

Enable debug logging:
```javascript
// In your component
const { pdfTextExtractor } = usePDFTextExtraction();

// Add debug logging
pdfTextExtractor.debug = true;
```

## Future Enhancements

- **OCR Support**: Extract text from scanned PDFs using OCR
- **Text Analysis**: Sentiment analysis, keyword extraction
- **AI Integration**: Use extracted text for AI-powered features
- **Version Control**: Track changes in PDF content
- **Export Options**: Export extracted text in various formats

## Support

For issues or questions:
1. Check the console for error messages
2. Verify database schema and RLS policies
3. Test with a simple PDF file first
4. Check Supabase logs for database errors
