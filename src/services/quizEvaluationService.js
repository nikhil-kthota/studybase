import { supabase } from '../lib/supabase';

class QuizEvaluationService {
  constructor() {
    this.apiKey = process.env.REACT_APP_HF_API_KEY;
    this.apiUrl = "https://router.huggingface.co/v1/chat/completions";

    // Enhanced debugging for API key
    console.log("Quiz Evaluation Service - Environment check:");
    console.log(
      "- REACT_APP_HF_API_KEY exists:",
      !!process.env.REACT_APP_HF_API_KEY
    );

    if (!this.apiKey) {
      console.error("❌ Hugging Face API key not found!");
    } else {
      console.log("✅ Hugging Face API key loaded successfully!");
    }
  }

  /**
   * Evaluate MCQ answer
   * @param {string} userAnswer - User's selected option
   * @param {number} correctOptionNumber - Correct option number
   * @returns {Promise<{isCorrect: boolean, marksObtained: number}>}
   */
  async evaluateMCQ(userAnswer, correctOptionNumber) {
    try {
      // For MCQs, simple comparison of option numbers
      const userOptionNumber = parseInt(userAnswer);
      const isCorrect = userOptionNumber === correctOptionNumber;
      
      return {
        isCorrect: isCorrect,
        marksObtained: isCorrect ? 1 : 0,
        similarityScore: isCorrect ? 100 : 0
      };
    } catch (error) {
      console.error('Error evaluating MCQ:', error);
      return {
        isCorrect: false,
        marksObtained: 0,
        similarityScore: 0
      };
    }
  }

  /**
   * Evaluate SAQ answer using LLM similarity check (90% threshold)
   * @param {string} userAnswer - User's answer
   * @param {string} modelAnswer - Correct answer from model
   * @param {string} question - Question text for context
   * @returns {Promise<{isCorrect: boolean, marksObtained: number, similarityScore: number}>}
   */
  async evaluateSAQ(userAnswer, modelAnswer, question) {
    try {
      const similarityResult = await this.calculateSimilarityWithLLM(
        userAnswer, 
        modelAnswer, 
        question, 
        90 // 90% threshold for SAQs
      );

      return {
        isCorrect: similarityResult.isCorrect,
        marksObtained: similarityResult.isCorrect ? 3 : 0,
        similarityScore: similarityResult.similarityScore
      };
    } catch (error) {
      console.error('Error evaluating SAQ:', error);
      return {
        isCorrect: false,
        marksObtained: 0,
        similarityScore: 0
      };
    }
  }

  /**
   * Evaluate LAQ answer using LLM similarity check (75% threshold)
   * @param {string} userAnswer - User's answer
   * @param {string} modelAnswer - Correct answer from model
   * @param {string} question - Question text for context
   * @returns {Promise<{isCorrect: boolean, marksObtained: number, similarityScore: number}>}
   */
  async evaluateLAQ(userAnswer, modelAnswer, question) {
    try {
      const similarityResult = await this.calculateSimilarityWithLLM(
        userAnswer, 
        modelAnswer, 
        question, 
        75 // 75% threshold for LAQs
      );

      return {
        isCorrect: similarityResult.isCorrect,
        marksObtained: similarityResult.isCorrect ? 5 : 0,
        similarityScore: similarityResult.similarityScore
      };
    } catch (error) {
      console.error('Error evaluating LAQ:', error);
      return {
        isCorrect: false,
        marksObtained: 0,
        similarityScore: 0
      };
    }
  }

  /**
   * Calculate similarity between user answer and model answer using LLM
   * @param {string} userAnswer - User's answer
   * @param {string} modelAnswer - Correct answer from model
   * @param {string} question - Question text for context
   * @param {number} threshold - Similarity threshold percentage
   * @returns {Promise<{isCorrect: boolean, similarityScore: number}>}
   */
  async calculateSimilarityWithLLM(userAnswer, modelAnswer, question, threshold) {
    try {
      if (!this.apiKey) {
        throw new Error("Hugging Face API key not found");
      }

      const prompt = this.createSimilarityPrompt(userAnswer, modelAnswer, question, threshold);
      
      console.log('Calling LLM for answer similarity evaluation...');

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
        
        if (data.error) {
          throw new Error(`API error: ${data.error}`);
        }

        const llmResponse = data.choices[0].message.content;
        const evaluation = this.parseSimilarityResponse(llmResponse, threshold);
        
        console.log(`Similarity evaluation: ${evaluation.similarityScore}% (threshold: ${threshold}%)`);
        
        return evaluation;
      } else {
        const errorData = await response.json();
        throw new Error(
          `API request failed: ${response.status} - ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error('Error calculating similarity with LLM:', error);
      // Fallback to basic text similarity if LLM fails
      return this.calculateBasicSimilarity(userAnswer, modelAnswer, threshold);
    }
  }

  /**
   * Create prompt for LLM similarity evaluation
   * @param {string} userAnswer - User's answer
   * @param {string} modelAnswer - Correct answer
   * @param {string} question - Question text
   * @param {number} threshold - Similarity threshold
   * @returns {string} - Formatted prompt
   */
  createSimilarityPrompt(userAnswer, modelAnswer, question, threshold) {
    return `You are an expert educational evaluator. Your task is to evaluate how similar a student's answer is to the correct answer for a given question.

QUESTION: ${question}

CORRECT ANSWER: ${modelAnswer}

STUDENT'S ANSWER: ${userAnswer}

EVALUATION CRITERIA:
- Consider conceptual understanding, not just exact wording
- Account for different ways of expressing the same concept
- Look for key points and main ideas
- Ignore minor grammatical differences
- Consider if the student demonstrates understanding of the core concept

REQUIRED OUTPUT FORMAT:
Similarity Score: [0-100]
Explanation: [Brief explanation of your evaluation]
Is Correct: [YES/NO based on ${threshold}% threshold]

Evaluate the student's answer now:`;
  }

  /**
   * Parse LLM response for similarity evaluation
   * @param {string} llmResponse - Raw LLM response
   * @param {number} threshold - Similarity threshold
   * @returns {Object} - Parsed evaluation result
   */
  parseSimilarityResponse(llmResponse, threshold) {
    try {
      const lines = llmResponse.split('\n').map(line => line.trim());
      
      let similarityScore = 0;
      let isCorrect = false;
      
      for (const line of lines) {
        if (line.startsWith('Similarity Score:')) {
          const scoreMatch = line.match(/Similarity Score:\s*(\d+)/);
          if (scoreMatch) {
            similarityScore = parseInt(scoreMatch[1]);
          }
        } else if (line.startsWith('Is Correct:')) {
          const correctMatch = line.match(/Is Correct:\s*(YES|NO)/i);
          if (correctMatch) {
            isCorrect = correctMatch[1].toUpperCase() === 'YES';
          }
        }
      }
      
      // Fallback: determine correctness based on threshold if not explicitly stated
      if (similarityScore > 0 && !isCorrect) {
        isCorrect = similarityScore >= threshold;
      }
      
      return {
        isCorrect: isCorrect,
        similarityScore: similarityScore
      };
    } catch (error) {
      console.error('Error parsing similarity response:', error);
      return {
        isCorrect: false,
        similarityScore: 0
      };
    }
  }

  /**
   * Fallback method for basic text similarity calculation
   * @param {string} userAnswer - User's answer
   * @param {string} modelAnswer - Correct answer
   * @param {number} threshold - Similarity threshold
   * @returns {Object} - Basic similarity result
   */
  calculateBasicSimilarity(userAnswer, modelAnswer, threshold) {
    try {
      // Simple word overlap calculation
      const userWords = userAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      const modelWords = modelAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      
      const commonWords = userWords.filter(word => modelWords.includes(word));
      const similarityScore = Math.round((commonWords.length / Math.max(userWords.length, modelWords.length)) * 100);
      
      const isCorrect = similarityScore >= threshold;
      
      console.log(`Basic similarity calculation: ${similarityScore}% (threshold: ${threshold}%)`);
      
      return {
        isCorrect: isCorrect,
        similarityScore: similarityScore
      };
    } catch (error) {
      console.error('Error in basic similarity calculation:', error);
      return {
        isCorrect: false,
        similarityScore: 0
      };
    }
  }

  /**
   * Evaluate answer based on question type
   * @param {string} questionType - Type of question ('mcq', 'saq', 'laq')
   * @param {string} userAnswer - User's answer
   * @param {Object} questionData - Question data with correct answer
   * @returns {Promise<Object>} - Evaluation result
   */
  async evaluateAnswer(questionType, userAnswer, questionData) {
    try {
      const { correctAnswer, correctOptionNumber, questionText } = questionData;
      
      switch (questionType) {
        case 'mcq':
          return await this.evaluateMCQ(userAnswer, correctOptionNumber);
        
        case 'saq':
          return await this.evaluateSAQ(userAnswer, correctAnswer, questionText);
        
        case 'laq':
          return await this.evaluateLAQ(userAnswer, correctAnswer, questionText);
        
        default:
          throw new Error(`Unknown question type: ${questionType}`);
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        isCorrect: false,
        marksObtained: 0,
        similarityScore: 0
      };
    }
  }

  /**
   * Batch evaluate multiple answers
   * @param {Array} answers - Array of answer objects
   * @returns {Promise<Array>} - Array of evaluation results
   */
  async batchEvaluateAnswers(answers) {
    try {
      const evaluations = [];
      
      for (const answer of answers) {
        const evaluation = await this.evaluateAnswer(
          answer.questionType,
          answer.userAnswer,
          answer.questionData
        );
        
        evaluations.push({
          ...answer,
          evaluation: evaluation
        });
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return evaluations;
    } catch (error) {
      console.error('Error in batch evaluation:', error);
      return [];
    }
  }
}

export const quizEvaluationService = new QuizEvaluationService();
