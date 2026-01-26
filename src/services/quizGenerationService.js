import { supabase } from '../lib/supabase';

class QuizGenerationService {
  constructor() {
    this.apiKey = process.env.REACT_APP_HF_API_KEY;
    this.apiUrl = "https://router.huggingface.co/v1/chat/completions";

    // Enhanced debugging for API key
    console.log("Quiz Generation Service - Environment check:");
    console.log(
      "- REACT_APP_HF_API_KEY exists:",
      !!process.env.REACT_APP_HF_API_KEY
    );

    if (!this.apiKey) {
      console.error("❌ Hugging Face API key not found!");
      console.error("Please check:");
      console.error("1. .env.local file exists in project root");
      console.error("2. REACT_APP_HF_API_KEY is set correctly");
      console.error("3. Development server has been restarted");
    } else {
      console.log("✅ Hugging Face API key loaded successfully!");
    }
  }

  /**
   * Generate quiz questions from selected PDF files
   * @param {Array<string>} fileIds - Array of file IDs to extract content from
   * @param {Object} quizConfig - Quiz configuration object
   * @returns {Promise<{success: boolean, questions?: Array, error?: string}>}
   */
  async generateQuiz(fileIds, quizConfig) {
    try {
      console.log('Starting quiz generation with config:', quizConfig);
      
      // Extract text content from all selected files
      const context = await this.extractTextFromFiles(fileIds);
      if (!context || context.trim().length === 0) {
        return {
          success: false,
          error: 'No text content found in selected files. Please ensure PDFs have been processed.'
        };
      }

      // Create structured prompt for LLM
      const prompt = this.createQuizPrompt(context, quizConfig);
      
      // Call Hugging Face API
      const llmResponse = await this.callLLM(prompt);
      if (!llmResponse.success) {
        return {
          success: false,
          error: llmResponse.error
        };
      }

      // Parse LLM response into structured questions
      const questions = this.parseQuizResponse(llmResponse.response, quizConfig);
      if (!questions || questions.length === 0) {
        return {
          success: false,
          error: 'Failed to parse questions from LLM response. Please try again.'
        };
      }

      console.log(`Successfully generated ${questions.length} questions`);
      
      return {
        success: true,
        questions: questions
      };

    } catch (error) {
      console.error('Error generating quiz:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract text content from multiple PDF files
   * @param {Array<string>} fileIds - Array of file IDs
   * @returns {Promise<string>} - Combined text content
   */
  async extractTextFromFiles(fileIds) {
    try {
      const { data, error } = await supabase
        .from('pdf_text_content')
        .select(`
          extracted_text,
          base_files!inner(
            id,
            file_name,
            file_type
          )
        `)
        .in('file_id', fileIds)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching text content:', error);
        return '';
      }

      if (!data || data.length === 0) {
        console.log('No extracted text found for selected files');
        return '';
      }

      // Combine text from all files
      let combinedText = '';
      data.forEach((item, index) => {
        if (item.extracted_text) {
          combinedText += `\n\n--- Content from ${item.base_files.file_name} ---\n\n`;
          combinedText += item.extracted_text;
        }
      });

      console.log(`Combined text from ${data.length} files: ${combinedText.length} characters`);
      return combinedText.trim();

    } catch (error) {
      console.error('Error extracting text from files:', error);
      return '';
    }
  }

  /**
   * Create structured prompt for LLM to generate quiz questions
   * @param {string} context - Combined text content from PDFs
   * @param {Object} config - Quiz configuration
   * @returns {string} - Formatted prompt
   */
  createQuizPrompt(context, config) {
    const { difficulty, totalMcqs, totalSaqs, totalLaqs } = config;
    
    // Truncate context if too long (to stay within API limits)
    const maxContextLength = 3000;
    const truncatedContext = context.length > maxContextLength 
      ? context.substring(0, maxContextLength) + "..."
      : context;

    return `You are an expert quiz generator. Based on the following educational content, generate quiz questions according to the specified requirements.

CONTENT:
${truncatedContext}

REQUIREMENTS:
- Difficulty Level: ${difficulty}
- Generate exactly ${totalMcqs} Multiple Choice Questions (MCQs)
- Generate exactly ${totalSaqs} Short Answer Questions (SAQs)  
- Generate exactly ${totalLaqs} Long Answer Questions (LAQs)

FORMAT REQUIREMENTS:
For MCQs, use this exact format:
MCQ: {Question text}
Options: 1) {Option 1} 2) {Option 2} 3) {Option 3} 4) {Option 4}
Answer: {Correct option number}
Explanation: {Detailed explanation}

For SAQs, use this exact format:
SAQ: {Question text}
Answer: {Correct answer}
Explanation: {Detailed explanation}

For LAQs, use this exact format:
LAQ: {Question text}
Answer: {Correct answer}
Explanation: {Detailed explanation}

IMPORTANT:
- Questions should be appropriate for ${difficulty} difficulty level
- MCQs should have exactly 4 options each
- Questions should test understanding, not just memorization
- Answers should be comprehensive and educational
- Ensure questions are directly related to the provided content
- Number questions sequentially (1, 2, 3, etc.)

Generate the questions now:`;
  }

  /**
   * Call Hugging Face LLM API
   * @param {string} prompt - Formatted prompt
   * @returns {Promise<{success: boolean, response?: string, error?: string}>}
   */
  async callLLM(prompt) {
    try {
      if (!this.apiKey) {
        throw new Error(
          "Hugging Face API key not found. Please create a .env.local file in your project root and add: REACT_APP_HF_API_KEY=your_api_key_here"
        );
      }

      console.log('Calling Hugging Face API for quiz generation...');

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.1-8B-Instruct:fireworks-ai",
          messages: [
            { role: "user", content: prompt }
          ],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ LLM API call successful');

        if (data.error) {
          throw new Error(`API error: ${data.error}`);
        }

        const generatedText = data.choices[0].message.content;
        return {
          success: true,
          response: generatedText
        };
      } else {
        const errorData = await response.json();
        throw new Error(
          `API request failed: ${response.status} - ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error('Error calling LLM:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse LLM response into structured questions
   * @param {string} llmResponse - Raw response from LLM
   * @param {Object} config - Quiz configuration
   * @returns {Array} - Array of structured questions
   */
  parseQuizResponse(llmResponse, config) {
    try {
      console.log('Parsing LLM response...');
      console.log('Expected questions:', config.totalMcqs + config.totalSaqs + config.totalLaqs);
      
      const questions = [];
      const lines = llmResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let currentQuestion = null;
      let questionNumber = 1;
      let mcqCount = 0;
      let saqCount = 0;
      let laqCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect question type
        if (line.startsWith('MCQ:') && mcqCount < config.totalMcqs) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            type: 'mcq',
            questionNumber: questionNumber++,
            questionText: line.substring(4).trim(),
            options: {},
            correctAnswer: '',
            correctOptionNumber: null,
            explanation: '',
            marks: 1
          };
          mcqCount++;
        } else if (line.startsWith('SAQ:') && saqCount < config.totalSaqs) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            type: 'saq',
            questionNumber: questionNumber++,
            questionText: line.substring(4).trim(),
            options: null,
            correctAnswer: '',
            correctOptionNumber: null,
            explanation: '',
            marks: 3
          };
          saqCount++;
        } else if (line.startsWith('LAQ:') && laqCount < config.totalLaqs) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            type: 'laq',
            questionNumber: questionNumber++,
            questionText: line.substring(4).trim(),
            options: null,
            correctAnswer: '',
            correctOptionNumber: null,
            explanation: '',
            marks: 5
          };
          laqCount++;
        } else if (currentQuestion) {
          // Parse question details
          if (line.startsWith('Options:')) {
            const optionsText = line.substring(8).trim();
            const optionMatches = optionsText.match(/(\d+)\)\s*([^0-9]+?)(?=\s*\d+\)|$)/g);
            if (optionMatches) {
              optionMatches.forEach(match => {
                const optionMatch = match.match(/(\d+)\)\s*(.+)/);
                if (optionMatch) {
                  currentQuestion.options[optionMatch[1]] = optionMatch[2].trim();
                }
              });
            }
          } else if (line.startsWith('Answer:')) {
            const answerText = line.substring(7).trim();
            if (currentQuestion.type === 'mcq') {
              // Extract option number for MCQ
              const optionMatch = answerText.match(/^(\d+)/);
              if (optionMatch) {
                currentQuestion.correctOptionNumber = parseInt(optionMatch[1]);
                currentQuestion.correctAnswer = currentQuestion.options[optionMatch[1]] || answerText;
              } else {
                currentQuestion.correctAnswer = answerText;
              }
            } else {
              currentQuestion.correctAnswer = answerText;
            }
          } else if (line.startsWith('Explanation:')) {
            currentQuestion.explanation = line.substring(12).trim();
          }
        }
      }

      // Add the last question
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      console.log(`Parsed ${questions.length} questions from LLM response`);
      console.log(`MCQ: ${mcqCount}/${config.totalMcqs}, SAQ: ${saqCount}/${config.totalSaqs}, LAQ: ${laqCount}/${config.totalLaqs}`);
      
      // Validate questions
      const validQuestions = questions.filter(q => 
        q.questionText && 
        q.correctAnswer && 
        q.explanation &&
        (q.type !== 'mcq' || Object.keys(q.options).length === 4)
      );

      console.log(`Valid questions: ${validQuestions.length}`);
      
      // Check if we have the expected number of questions
      const expectedTotal = config.totalMcqs + config.totalSaqs + config.totalLaqs;
      if (validQuestions.length !== expectedTotal) {
        console.warn(`Warning: Expected ${expectedTotal} questions but got ${validQuestions.length}`);
      }
      
      return validQuestions;

    } catch (error) {
      console.error('Error parsing quiz response:', error);
      return [];
    }
  }

  /**
   * Validate quiz configuration
   * @param {Object} config - Quiz configuration
   * @returns {Object} - Validation result
   */
  validateQuizConfig(config) {
    const { quizName, difficulty, totalMcqs, totalSaqs, totalLaqs } = config;
    
    if (!quizName || quizName.trim().length === 0) {
      return { valid: false, error: 'Quiz name is required' };
    }
    
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return { valid: false, error: 'Please select a valid difficulty level' };
    }
    
    if (!totalMcqs || totalMcqs < 0 || totalMcqs > 20) {
      return { valid: false, error: 'MCQ count must be between 0 and 20' };
    }
    
    if (!totalSaqs || totalSaqs < 0 || totalSaqs > 20) {
      return { valid: false, error: 'SAQ count must be between 0 and 20' };
    }
    
    if (!totalLaqs || totalLaqs < 0 || totalLaqs > 20) {
      return { valid: false, error: 'LAQ count must be between 0 and 20' };
    }
    
    const totalQuestions = totalMcqs + totalSaqs + totalLaqs;
    if (totalQuestions === 0) {
      return { valid: false, error: 'At least one question type must be selected' };
    }
    
    if (totalQuestions > 30) {
      return { valid: false, error: 'Total questions cannot exceed 30' };
    }
    
    return { valid: true };
  }
}

export const quizGenerationService = new QuizGenerationService();
