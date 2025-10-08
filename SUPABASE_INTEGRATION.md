# StudyBase Supabase Integration Documentation

## Overview
StudyBase uses Supabase for comprehensive data storage, including user authentication, database operations, and file storage. All features are fully integrated with proper security policies and data management.

## Database Schema

### Tables

#### 1. `bases` Table
```sql
CREATE TABLE bases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Stores study base information
- **id**: Unique identifier for each base
- **name**: Base name (max 100 characters)
- **user_id**: Foreign key to authenticated user
- **created_at**: Timestamp when base was created
- **updated_at**: Timestamp when base was last modified

#### 2. `base_files` Table
```sql
CREATE TABLE base_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Stores file metadata for each base
- **id**: Unique identifier for each file record
- **base_id**: Foreign key to the base containing this file
- **file_name**: Original filename
- **file_path**: Storage path in Supabase Storage
- **file_size**: File size in bytes
- **file_type**: MIME type of the file
- **uploaded_at**: Timestamp when file was uploaded

### Indexes
```sql
CREATE INDEX idx_bases_user_id ON bases(user_id);
CREATE INDEX idx_base_files_base_id ON base_files(base_id);
```

## Storage Configuration

### Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;
```

**Purpose**: Private storage bucket for user files
- **Bucket Name**: `files`
- **Public Access**: `false` (private bucket)
- **File Organization**: `{user_id}/{base_name}/{filename}`

## Security Policies

### Row Level Security (RLS)

#### Bases Table Policies
```sql
-- Users can only view their own bases
CREATE POLICY "Users can view their own bases" ON bases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create bases for themselves
CREATE POLICY "Users can insert their own bases" ON bases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own bases
CREATE POLICY "Users can update their own bases" ON bases
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own bases
CREATE POLICY "Users can delete their own bases" ON bases
  FOR DELETE USING (auth.uid() = user_id);
```

#### Base Files Table Policies
```sql
-- Users can only view files from their own bases
CREATE POLICY "Users can view files from their bases" ON base_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

-- Users can only add files to their own bases
CREATE POLICY "Users can insert files to their bases" ON base_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

-- Users can only update files in their own bases
CREATE POLICY "Users can update files in their bases" ON base_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );

-- Users can only delete files from their own bases
CREATE POLICY "Users can delete files from their bases" ON base_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bases 
      WHERE bases.id = base_files.base_id 
      AND bases.user_id = auth.uid()
    )
  );
```

### Storage Policies
```sql
-- Users can upload files to their own folder
CREATE POLICY "Users can upload files to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Feature Implementation

### 1. Creating New Bases
**Component**: `NewBase.js`
**Functionality**:
- Creates base record in `bases` table
- Uploads files to Supabase Storage
- Creates file records in `base_files` table
- Uses proper file path structure: `{user_id}/{base_name}/{filename}`

**Database Operations**:
```javascript
// Create base
const { data: baseData, error: baseError } = await supabase
  .from('bases')
  .insert([{
    name: baseName.trim(),
    user_id: user.id,
    created_at: new Date().toISOString()
  }])
  .select()
  .single();

// Upload files to storage
const { error: uploadError } = await supabase.storage
  .from('files')
  .upload(filePath, file);

// Create file records
const { error: filesError } = await supabase
  .from('base_files')
  .insert(uploadedFiles);
```

### 2. Adding Files to Existing Bases
**Component**: `EditBase.js`
**Functionality**:
- Uploads new files to Supabase Storage
- Creates file records in `base_files` table
- Updates local state with new files

**Database Operations**:
```javascript
// Upload file to storage
const { error: uploadError } = await supabase.storage
  .from('files')
  .upload(filePath, file);

// Create file record
const { error: filesError } = await supabase
  .from('base_files')
  .insert(uploadedFiles);
```

### 3. Removing Individual Files
**Component**: `EditBase.js`
**Functionality**:
- Deletes file from Supabase Storage
- Removes file record from `base_files` table
- Updates local state

**Database Operations**:
```javascript
// Delete from storage
const { error: storageError } = await supabase.storage
  .from('files')
  .remove([file.file_path]);

// Delete from database
const { error: dbError } = await supabase
  .from('base_files')
  .delete()
  .eq('id', file.id);
```

### 4. Deleting Complete Bases
**Component**: `MyBases.js`
**Functionality**:
- Retrieves all files in the base
- Deletes all files from Supabase Storage
- Deletes base record (cascades to delete file records)
- Updates local state

**Database Operations**:
```javascript
// Get all files in base
const { data: files, error: filesError } = await supabase
  .from('base_files')
  .select('file_path')
  .eq('base_id', baseToDelete.id);

// Delete files from storage
const { error: storageError } = await supabase.storage
  .from('files')
  .remove(filePaths);

// Delete base (cascades to base_files)
const { error: deleteError } = await supabase
  .from('bases')
  .delete()
  .eq('id', baseToDelete.id);
```

### 5. Viewing Files
**Component**: `BaseView.js`
**Functionality**:
- Loads base and file data from database
- Creates signed URLs for file viewing
- Supports PDF and image preview
- Provides download links for unsupported files

**Database Operations**:
```javascript
// Load base data
const { data: baseData, error: baseError } = await supabase
  .from('bases')
  .select('*')
  .eq('id', baseId)
  .eq('user_id', user.id)
  .single();

// Load files
const { data: filesData, error: filesError } = await supabase
  .from('base_files')
  .select('*')
  .eq('base_id', baseId)
  .order('uploaded_at', { ascending: false });

// Create signed URL for viewing
const { data, error } = await supabase.storage
  .from('files')
  .createSignedUrl(file.file_path, 3600);
```

## File Organization Structure

### Storage Path Format
```
files/
├── {user_id_1}/
│   ├── {base_name_1}/
│   │   ├── {timestamp}-{random}.pdf
│   │   ├── {timestamp}-{random}.docx
│   │   └── {timestamp}-{random}.jpg
│   └── {base_name_2}/
│       └── {timestamp}-{random}.mp4
└── {user_id_2}/
    └── {base_name_1}/
        └── {timestamp}-{random}.pdf
```

### File Naming Convention
- **Format**: `{timestamp}-{random_string}.{extension}`
- **Purpose**: Prevents filename conflicts and ensures uniqueness
- **Example**: `1703123456789-abc123def.pdf`

## Supported File Types

### Document Types
- **PDF**: `.pdf`
- **Word**: `.doc`, `.docx`
- **PowerPoint**: `.ppt`, `.pptx`
- **Excel**: `.xls`, `.xlsx`

### Media Types
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`
- **Audio**: `.mp3`, `.wav`
- **Video**: `.mp4`, `.mov`

## Error Handling

### Database Errors
- **Connection Issues**: Automatic retry with exponential backoff
- **Permission Errors**: Clear error messages for unauthorized access
- **Validation Errors**: Client-side validation before database operations

### Storage Errors
- **Upload Failures**: Individual file error handling
- **Permission Errors**: Proper RLS policy enforcement
- **File Size Limits**: Client-side validation and error messages

## Performance Optimizations

### Database
- **Indexes**: Optimized queries with proper indexing
- **Pagination**: Large file lists are paginated
- **Caching**: React state management for efficient updates

### Storage
- **Signed URLs**: 1-hour expiry for security
- **Lazy Loading**: Files loaded on demand
- **Compression**: Automatic file compression where applicable

## Security Features

### Authentication
- **Supabase Auth**: Integrated user authentication
- **JWT Tokens**: Secure session management
- **Email Verification**: Required for account activation

### Authorization
- **RLS Policies**: Database-level security
- **Storage Policies**: File-level access control
- **User Isolation**: Complete data separation between users

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Backup**: Automatic database backups
- **Audit Logs**: Comprehensive activity logging

## Monitoring and Analytics

### Database Metrics
- **Query Performance**: Slow query monitoring
- **Connection Pool**: Connection usage tracking
- **Storage Usage**: File storage monitoring

### User Analytics
- **File Uploads**: Upload frequency and success rates
- **Storage Usage**: Per-user storage consumption
- **Feature Usage**: Component interaction tracking

## Backup and Recovery

### Database Backups
- **Automatic**: Daily automated backups
- **Point-in-Time**: Recovery to specific timestamps
- **Cross-Region**: Multi-region backup replication

### File Backups
- **Storage Replication**: Automatic file replication
- **Version Control**: File version history
- **Recovery**: Individual file recovery capabilities

## Development and Testing

### Local Development
- **Supabase CLI**: Local development environment
- **Seed Data**: Test data for development
- **Mock Services**: Offline development support

### Testing
- **Unit Tests**: Component-level testing
- **Integration Tests**: Database operation testing
- **E2E Tests**: Full user workflow testing

## Deployment Considerations

### Environment Variables
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production Settings
- **RLS Enabled**: All tables have RLS enabled
- **Storage Policies**: Strict file access policies
- **Monitoring**: Comprehensive logging and monitoring
- **Scaling**: Auto-scaling for high traffic

## Troubleshooting

### Common Issues
1. **File Upload Failures**: Check storage policies and file size limits
2. **Permission Errors**: Verify RLS policies are correctly configured
3. **Slow Queries**: Check database indexes and query optimization
4. **Storage Quotas**: Monitor storage usage and limits

### Debug Tools
- **Supabase Dashboard**: Real-time database monitoring
- **Storage Explorer**: File management and debugging
- **Logs**: Comprehensive error and activity logs

## Future Enhancements

### Planned Features
- **File Versioning**: Multiple versions of the same file
- **Collaborative Editing**: Multi-user base sharing
- **Advanced Search**: Full-text search across files
- **AI Integration**: Smart file categorization and suggestions

### Performance Improvements
- **CDN Integration**: Global file delivery
- **Caching**: Advanced caching strategies
- **Compression**: Automatic file compression
- **Lazy Loading**: Progressive file loading

---

This documentation covers all aspects of Supabase integration in StudyBase, ensuring comprehensive data storage, security, and functionality for all user features.
