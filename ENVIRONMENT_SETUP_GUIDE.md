# Environment Variables Setup Guide

## Problem
The chat module is showing the error: "Hugging Face API key not found. Please check your environment variables."

## Solution
You need to create an environment file with your Hugging Face API key.

## Step-by-Step Setup

### 1. Create Environment File
Create a file named `.env.local` in your project root directory (same level as `package.json`):

```bash
# In your project root directory
touch .env.local
```

### 2. Add Your API Key
Open `.env.local` and add the following content:

```env
# Hugging Face API Key for Chat Module
REACT_APP_HF_API_KEY=your_actual_api_key_here
```

### 3. Get Your Hugging Face API Key
1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Sign in to your Hugging Face account
3. Click "New token"
4. Give it a name (e.g., "StudyBase Chat")
5. Select "Read" permissions
6. Click "Generate a token"
7. Copy the generated token

### 4. Replace the Placeholder
Replace `your_actual_api_key_here` with your actual API key:

```env
REACT_APP_HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Restart Your Development Server
After creating the `.env.local` file, restart your React development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

## File Structure
Your project should look like this:

```
studybase/
├── .env.local          ← New file you created
├── package.json
├── src/
├── public/
└── ...
```

## Verification
After setting up the environment variable:

1. **Check Console**: Look for "Hugging Face API key loaded successfully." in the browser console
2. **Test Chat**: Try asking a question in the chat module
3. **No Errors**: The API key error should disappear

## Alternative: Using .env File
If `.env.local` doesn't work, try creating a `.env` file instead:

```env
REACT_APP_HF_API_KEY=your_actual_api_key_here
```

## Troubleshooting

### Issue: API Key Still Not Found
**Solution**: 
1. Make sure the file is named exactly `.env.local` (with the dot)
2. Ensure the file is in the project root directory
3. Restart your development server
4. Check that there are no extra spaces around the API key

### Issue: API Key Invalid
**Solution**:
1. Verify the API key is correct
2. Check that the token has "Read" permissions
3. Make sure the token hasn't expired

### Issue: Still Getting Errors
**Solution**:
1. Check browser console for detailed error messages
2. Verify the API key format (should start with `hf_`)
3. Try generating a new API key

## Security Notes
- Never commit `.env.local` or `.env` files to version control
- Keep your API key private and secure
- The `.env.local` file is already in `.gitignore` to prevent accidental commits

## Example .env.local File
```env
# Environment Variables for StudyBase

# Hugging Face API Key for Chat Module
# Get your API key from: https://huggingface.co/settings/tokens
REACT_APP_HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Supabase Configuration (if needed)
# REACT_APP_SUPABASE_URL=your_supabase_url
# REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Setup
Once you've set up the API key:

1. **Navigate to a base** with PDF files
2. **Select a PDF file** that has extracted text
3. **Type a question** in the chat: "What is this document about?"
4. **Press Enter** or click Send
5. **Expected Result**: AI response appears in chat

If you still get errors, check the browser console for more detailed error messages.
