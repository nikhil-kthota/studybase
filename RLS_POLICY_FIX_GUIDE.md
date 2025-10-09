# PDF Text Content RLS Policy Error - Fix Guide

## Problem
The error `new row violates row-level security policy for table "pdf_text_content"` occurs when trying to insert extracted text into the database. This is a Row Level Security (RLS) policy issue.

## Root Cause
The RLS policies for the `pdf_text_content` table are either:
1. Not properly configured
2. Not applied to the table
3. Missing or incorrect
4. The table doesn't exist yet

## Solution Steps

### Step 1: Run the SQL Fix Script
Execute the SQL commands in `fix-pdf-text-content-rls.sql` in your Supabase SQL editor:

```sql
-- This will:
-- 1. Drop existing policies
-- 2. Create the table if it doesn't exist
-- 3. Enable RLS
-- 4. Create proper indexes
-- 5. Recreate the RLS policies
-- 6. Create a backup function for storage
```

### Step 2: Verify the Fix
After running the SQL script, check if the policies exist:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'pdf_text_content';
```

You should see 4 policies:
- `Users can view text content from their files`
- `Users can insert text content for their files`
- `Users can update text content for their files`
- `Users can delete text content from their files`

### Step 3: Test the Function
Test if the backup function works:

```sql
-- This should return true for files you own
SELECT test_pdf_text_content_access('your-file-id-here');
```

## Alternative Solutions

### Option 1: Use the Backup Function
The updated PDF text extractor now automatically falls back to using a database function if RLS policies fail:

```javascript
// The service will automatically try this if RLS fails
await supabase.rpc('store_pdf_text_content', {
  p_file_id: fileId,
  p_extracted_text: text,
  p_text_length: text.length,
  p_status: 'completed'
});
```

### Option 2: Temporarily Disable RLS (Not Recommended)
If you need a quick fix for testing:

```sql
-- TEMPORARY - Only for testing
ALTER TABLE pdf_text_content DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable it later:
-- ALTER TABLE pdf_text_content ENABLE ROW LEVEL SECURITY;
```

### Option 3: Check User Authentication
Ensure the user is properly authenticated:

```javascript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

## Testing the Fix

### 1. Test in MyAccount Component
1. Go to "My Account" → "PDF Text Extraction"
2. Click "Show Extraction Tools"
3. Select a PDF file and click "Extract Text from Selected PDFs"
4. Check console for any RLS errors

### 2. Test with Console Commands
```javascript
// Test the extraction service
import { pdfTextExtractor } from './src/services/pdfTextExtractor';

const testExtraction = async () => {
  try {
    const result = await pdfTextExtractor.extractAndStoreText(
      'your-file-id',
      'your-file-path',
      'your-file-name'
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

testExtraction();
```

### 3. Check Database
Verify the text was stored:

```sql
SELECT 
  ptc.*,
  bf.file_name,
  b.name as base_name
FROM pdf_text_content ptc
JOIN base_files bf ON bf.id = ptc.file_id
JOIN bases b ON b.id = bf.base_id
WHERE b.user_id = auth.uid()
ORDER BY ptc.extraction_date DESC;
```

## Expected Results

### ✅ Success Case
- No RLS policy errors in console
- Text extraction works normally
- Data is stored in `pdf_text_content` table
- Status shows "completed" in UI

### ⚠️ Fallback Case
- Console shows "RLS policy error detected, trying alternative storage method..."
- Alternative function is used
- Text is still stored successfully
- Status shows "completed" in UI

### ❌ Error Case
- Clear error messages in console
- User-friendly error display in UI
- Graceful handling of storage failures

## Troubleshooting

### If RLS Policies Still Fail:
1. **Check Table Existence**: Ensure `pdf_text_content` table exists
2. **Verify RLS Status**: Check if RLS is enabled on the table
3. **Check Policy Syntax**: Ensure policies are correctly formatted
4. **Test User Context**: Verify `auth.uid()` returns the correct user ID

### If Alternative Function Fails:
1. **Check Function Existence**: Ensure `store_pdf_text_content` function exists
2. **Verify Permissions**: Check if function has proper SECURITY DEFINER
3. **Test Function Directly**: Run the function in SQL editor

### If All Methods Fail:
1. **Check User Authentication**: Ensure user is logged in
2. **Verify File Ownership**: Check if file belongs to current user
3. **Check Database Connection**: Ensure Supabase connection is working
4. **Review Console Logs**: Look for detailed error messages

## Prevention

### Best Practices:
1. **Always test RLS policies** after creating them
2. **Use SECURITY DEFINER functions** for complex operations
3. **Implement fallback methods** for critical operations
4. **Monitor error logs** for RLS policy violations
5. **Test with different user contexts** to ensure policies work correctly

The fix should resolve the RLS policy error and allow PDF text extraction to work properly!
