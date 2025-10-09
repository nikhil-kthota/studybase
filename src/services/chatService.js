import { supabase } from '../lib/supabase';

class ChatService {
  constructor() {
    this.apiKey = process.env.REACT_APP_HF_API_KEY;
    this.apiUrls = [
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-small',
      'https://api-inference.huggingface.co/models/gpt2',
      'https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-125M',
      'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill'
    ];
    this.currentUrlIndex = 0;
    
    // Enhanced debugging for API key
    console.log('Environment check:');
    console.log('- REACT_APP_HF_API_KEY exists:', !!process.env.REACT_APP_HF_API_KEY);
    console.log('- API key length:', process.env.REACT_APP_HF_API_KEY ? process.env.REACT_APP_HF_API_KEY.length : 0);
    console.log('- API key starts with hf_:', process.env.REACT_APP_HF_API_KEY ? process.env.REACT_APP_HF_API_KEY.startsWith('hf_') : false);
    
    if (!this.apiKey) {
      console.error('❌ Hugging Face API key not found!');
      console.error('Please check:');
      console.error('1. .env.local file exists in project root');
      console.error('2. REACT_APP_HF_API_KEY is set correctly');
      console.error('3. Development server has been restarted');
      console.error('4. No extra spaces around the API key');
    } else {
      console.log('✅ Hugging Face API key loaded successfully!');
      console.log('API key preview:', this.apiKey.substring(0, 10) + '...');
    }
  }

  /**
   * Get extracted text for a specific PDF file
   * @param {string} fileId - The ID of the PDF file
   * @returns {Promise<string|null>} - Extracted text or null if not found
   */
  async getExtractedText(fileId) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select('extracted_text, status')
        .eq('file_id', fileId)
        .eq('status', 'completed')
        .single();

      if (error) {
        console.error('Error fetching extracted text:', error);
        return null;
      }

      return data?.extracted_text || null;
    } catch (error) {
      console.error('Error in getExtractedText:', error);
      return null;
    }
  }

  /**
   * Generate a response using Hugging Face API
   * @param {string} question - User's question
   * @param {string} context - Extracted text from PDF
   * @returns {Promise<{success: boolean, response?: string, error?: string}>}
   */
  async generateResponse(question, context) {
    try {
      if (!this.apiKey) {
        throw new Error('Hugging Face API key not found. Please create a .env.local file in your project root and add: REACT_APP_HF_API_KEY=your_api_key_here. Get your API key from: https://huggingface.co/settings/tokens');
      }

      // Create a comprehensive prompt that includes the context and question
      const prompt = this.createPrompt(question, context);

      // Try each model until one works
      for (let i = 0; i < this.apiUrls.length; i++) {
        const apiUrl = this.apiUrls[i];
        console.log(`Trying model ${i + 1}/${this.apiUrls.length}: ${apiUrl}`);
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_length: 150,
                temperature: 0.7,
                do_sample: true,
                return_full_text: false,
                pad_token_id: 50256
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success with model ${i + 1}:`, data);
            
            if (data.error) {
              throw new Error(`API error: ${data.error}`);
            }

            // Extract the generated text from the response
            const generatedText = Array.isArray(data) && data.length > 0 ? data[0].generated_text : '';
            
            return {
              success: true,
              response: this.cleanResponse(generatedText)
            };
          } else {
            console.log(`❌ Model ${i + 1} failed: ${response.status} ${response.statusText}`);
            if (i === this.apiUrls.length - 1) {
              // Last model failed, throw error
              const errorData = await response.json();
              throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }
          }
        } catch (error) {
          console.log(`❌ Model ${i + 1} error:`, error.message);
          if (i === this.apiUrls.length - 1) {
            // Last model failed, throw error
            throw error;
          }
        }
      }

    } catch (error) {
      console.error('Error generating response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a prompt for the LLM that includes context and question
   * @param {string} question - User's question
   * @param {string} context - Extracted text from PDF
   * @returns {string} - Formatted prompt
   */
  createPrompt(question, context) {
    // Truncate context if it's too long (to stay within API limits)
    const maxContextLength = 2000;
    const truncatedContext = context.length > maxContextLength 
      ? context.substring(0, maxContextLength) + '...' 
      : context;

    return `Context from PDF: ${truncatedContext}

Question: ${question}

Answer based on the context above:`;
  }

  /**
   * Clean and format the response from the API
   * @param {string} response - Raw response from API
   * @returns {string} - Cleaned response
   */
  cleanResponse(response) {
    if (!response) return 'I apologize, but I could not generate a response.';
    
    // Remove any unwanted prefixes or formatting
    let cleaned = response.trim();
    
    // Remove common prefixes that might be added by the model
    const prefixesToRemove = [
      'Answer:',
      'Response:',
      'Based on the context:',
      'According to the text:'
    ];
    
    for (const prefix of prefixesToRemove) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }
    
    return cleaned || 'I apologize, but I could not generate a response.';
  }

  /**
   * Process a chat message (question) and return a response
   * @param {string} fileId - The ID of the selected PDF file
   * @param {string} question - User's question
   * @returns {Promise<{success: boolean, response?: string, error?: string}>}
   */
  async processMessage(fileId, question) {
    try {
      // Get the extracted text for the PDF file
      const extractedText = await this.getExtractedText(fileId);
      
      if (!extractedText) {
        return {
          success: false,
          error: 'No extracted text found for this PDF file. Please ensure the PDF has been processed for text extraction.'
        };
      }

      // Generate response using the LLM
      const result = await this.generateResponse(question, extractedText);
      
      return result;

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a PDF file has extracted text available
   * @param {string} fileId - The ID of the PDF file
   * @returns {Promise<boolean>} - True if extracted text is available
   */
  async hasExtractedText(fileId) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select('status')
        .eq('file_id', fileId)
        .eq('status', 'completed')
        .single();

      return !error && data;
    } catch (error) {
      console.error('Error checking extracted text:', error);
      return false;
    }
  }
}

export const chatService = new ChatService();
