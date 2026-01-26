import { supabase } from '../lib/supabase';

class QuizPersistenceService {
  constructor() {
    this.currentUserId = null;
  }

  /**
   * Set the current user ID
   * @param {string} userId - The current user's ID
   */
  setCurrentUser(userId) {
    this.currentUserId = userId;
  }

  /**
   * Create a new quiz with questions and sources
   * @param {Object} quizData - Quiz configuration data
   * @param {Array} questions - Array of generated questions
   * @param {Array} fileIds - Array of selected file IDs
   * @returns {Promise<{success: boolean, quizId?: string, error?: string}>}
   */
  async createQuiz(quizData, questions, fileIds) {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('Creating quiz with data:', quizData);

      // Create quiz record
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          user_id: this.currentUserId,
          quiz_name: quizData.quizName,
          difficulty: quizData.difficulty,
          total_mcqs: quizData.totalMcqs,
          total_saqs: quizData.totalSaqs,
          total_laqs: quizData.totalLaqs,
          status: 'ready'
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error creating quiz:', quizError);
        return {
          success: false,
          error: quizError.message
        };
      }

      console.log('✅ Quiz created successfully:', quiz.id);

      // Create quiz sources
      if (fileIds && fileIds.length > 0) {
        const sourceRecords = fileIds.map(fileId => ({
          quiz_id: quiz.id,
          file_id: fileId,
          base_id: null // Will be populated from file relationship
        }));

        const { error: sourcesError } = await supabase
          .from('quiz_sources')
          .insert(sourceRecords);

        if (sourcesError) {
          console.error('Error creating quiz sources:', sourcesError);
          // Don't fail the entire operation for sources error
        }
      }

      // Create quiz questions
      if (questions && questions.length > 0) {
        const questionRecords = questions.map(q => ({
          quiz_id: quiz.id,
          question_type: q.type,
          question_number: q.questionNumber,
          question_text: q.questionText,
          options: q.options,
          correct_answer: q.correctAnswer,
          correct_option_number: q.correctOptionNumber,
          explanation: q.explanation,
          marks: q.marks
        }));

        const { error: questionsError } = await supabase
          .from('quiz_questions')
          .insert(questionRecords);

        if (questionsError) {
          console.error('Error creating quiz questions:', questionsError);
          return {
            success: false,
            error: questionsError.message
          };
        }

        console.log(`✅ Created ${questions.length} questions for quiz`);
      }

      return {
        success: true,
        quizId: quiz.id
      };

    } catch (error) {
      console.error('Error in createQuiz:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save user's answer to a question
   * @param {string} quizId - Quiz ID
   * @param {string} questionId - Question ID
   * @param {string} userAnswer - User's answer
   * @param {Object} evaluation - Evaluation result
   * @returns {Promise<{success: boolean, answerId?: string, error?: string}>}
   */
  async saveAnswer(quizId, questionId, userAnswer, evaluation) {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('quiz_answers')
        .insert({
          quiz_id: quizId,
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: evaluation.isCorrect,
          marks_obtained: evaluation.marksObtained,
          similarity_score: evaluation.similarityScore
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving answer:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Answer saved successfully:', data.id);
      
      return {
        success: true,
        answerId: data.id
      };

    } catch (error) {
      console.error('Error in saveAnswer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quiz with all questions
   * @param {string} quizId - Quiz ID
   * @returns {Promise<{success: boolean, quiz?: Object, error?: string}>}
   */
  async getQuiz(quizId) {
    try {
      // Get quiz data
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('user_id', this.currentUserId)
        .single();

      if (quizError) {
        console.error('Error fetching quiz:', quizError);
        return {
          success: false,
          error: quizError.message
        };
      }

      // Get quiz questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_number', { ascending: true });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        return {
          success: false,
          error: questionsError.message
        };
      }

      return {
        success: true,
        quiz: {
          ...quiz,
          questions: questions
        }
      };

    } catch (error) {
      console.error('Error in getQuiz:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all quizzes for the current user
   * @returns {Promise<{success: boolean, quizzes?: Array, error?: string}>}
   */
  async getUserQuizzes() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user quizzes:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        quizzes: data || []
      };

    } catch (error) {
      console.error('Error in getUserQuizzes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update quiz progress (marks obtained, status, etc.)
   * @param {string} quizId - Quiz ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateQuizProgress(quizId, updateData) {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('quizzes')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', quizId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error updating quiz progress:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Quiz progress updated successfully');
      
      return {
        success: true
      };

    } catch (error) {
      console.error('Error in updateQuizProgress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quiz results with answers and evaluation
   * @param {string} quizId - Quiz ID
   * @returns {Promise<{success: boolean, results?: Object, error?: string}>}
   */
  async getQuizResults(quizId) {
    try {
      // Get quiz with questions
      const quizResult = await this.getQuiz(quizId);
      if (!quizResult.success) {
        return quizResult;
      }

      // Get quiz answers
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select(`
          *,
          quiz_questions!inner(
            id,
            question_type,
            question_number,
            question_text,
            options,
            correct_answer,
            correct_option_number,
            explanation,
            marks
          )
        `)
        .eq('quiz_id', quizId)
        .order('answered_at', { ascending: true });

      if (answersError) {
        console.error('Error fetching quiz answers:', answersError);
        return {
          success: false,
          error: answersError.message
        };
      }

      return {
        success: true,
        results: {
          quiz: quizResult.quiz,
          answers: answers || []
        }
      };

    } catch (error) {
      console.error('Error in getQuizResults:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user quiz statistics
   * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
   */
  async getUserQuizStats() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching quiz stats for user:', this.currentUserId);

      const { data, error } = await supabase.rpc('get_user_quiz_stats', {
        user_uuid: this.currentUserId
      });

      if (error) {
        console.error('Error fetching user quiz stats:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('Raw stats data from database:', data);

      const stats = data[0] || {
        total_quizzes: 0,
        total_questions_attempted: 0,
        average_percentage: 0,
        total_marks_obtained: 0,
        total_possible_marks: 0
      };

      console.log('Processed stats:', stats);

      return {
        success: true,
        stats: stats
      };

    } catch (error) {
      console.error('Error in getUserQuizStats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent quiz performance (last 3 quizzes)
   * @returns {Promise<{success: boolean, performance?: Array, error?: string}>}
   */
  async getRecentQuizPerformance() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_recent_quiz_performance', {
        user_uuid: this.currentUserId
      });

      if (error) {
        console.error('Error fetching recent quiz performance:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        performance: data || []
      };

    } catch (error) {
      console.error('Error in getRecentQuizPerformance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a quiz and all related data
   * @param {string} quizId - Quiz ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteQuiz(quizId) {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      // Delete quiz (cascade will handle related records)
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error deleting quiz:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Quiz deleted successfully');
      
      return {
        success: true
      };

    } catch (error) {
      console.error('Error in deleteQuiz:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has answered a specific question
   * @param {string} quizId - Quiz ID
   * @param {string} questionId - Question ID
   * @returns {Promise<{success: boolean, answered?: boolean, answer?: Object, error?: string}>}
   */
  async checkQuestionAnswered(quizId, questionId) {
    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('question_id', questionId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking question answered:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        answered: !!data,
        answer: data
      };

    } catch (error) {
      console.error('Error in checkQuestionAnswered:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all answered questions for a quiz
   * @param {string} quizId - Quiz ID
   * @returns {Promise<{success: boolean, answeredQuestions?: Array, error?: string}>}
   */
  async getAnsweredQuestions(quizId) {
    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select('question_id')
        .eq('quiz_id', quizId);

      if (error) {
        console.error('Error fetching answered questions:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        answeredQuestions: data.map(item => item.question_id)
      };

    } catch (error) {
      console.error('Error in getAnsweredQuestions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const quizPersistenceService = new QuizPersistenceService();
