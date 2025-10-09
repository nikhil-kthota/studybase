import { supabase } from '../lib/supabase';

class ChatPersistenceService {
  constructor() {
    this.currentChatId = null;
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
   * Create a new chat session
   * @param {string} baseId - The base ID
   * @param {string} fileId - The file ID (optional)
   * @param {string} chatName - The name for the chat
   * @returns {Promise<{success: boolean, chatId?: string, error?: string}>}
   */
  async createChat(baseId, fileId = null, chatName = 'New Chat') {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: this.currentUserId,
          base_id: baseId,
          file_id: fileId,
          chat_name: chatName,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        return {
          success: false,
          error: error.message
        };
      }

      this.currentChatId = data.id;
      console.log('✅ Chat created successfully:', data.id);
      
      return {
        success: true,
        chatId: data.id
      };
    } catch (error) {
      console.error('Error in createChat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all chats for the current user
   * @param {string} baseId - Optional base ID to filter chats
   * @returns {Promise<{success: boolean, chats?: Array, error?: string}>}
   */
  async getUserChats(baseId = null) {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('chats')
        .select(`
          id,
          user_id,
          base_id,
          file_id,
          chat_name,
          created_at,
          updated_at,
          is_active,
          chat_messages!inner(
            id,
            content,
            timestamp
          )
        `)
        .eq('user_id', this.currentUserId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (baseId) {
        query = query.eq('base_id', baseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user chats:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Process chats to include latest message info
      const processedChats = data.map(chat => {
        const messages = chat.chat_messages || [];
        const latestMessage = messages.length > 0 
          ? messages[messages.length - 1] 
          : null;

        return {
          id: chat.id,
          baseId: chat.base_id,
          fileId: chat.file_id,
          name: chat.chat_name,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          isActive: chat.is_active,
          messageCount: messages.length,
          latestMessage: latestMessage ? {
            content: latestMessage.content,
            timestamp: latestMessage.timestamp
          } : null
        };
      });

      return {
        success: true,
        chats: processedChats
      };
    } catch (error) {
      console.error('Error in getUserChats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get messages for a specific chat
   * @param {string} chatId - The chat ID
   * @returns {Promise<{success: boolean, messages?: Array, error?: string}>}
   */
  async getChatMessages(chatId) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const messages = data.map(msg => ({
        id: msg.id,
        type: msg.message_type,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata || {}
      }));

      return {
        success: true,
        messages: messages
      };
    } catch (error) {
      console.error('Error in getChatMessages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save a message to the current chat
   * @param {string} messageType - Type of message ('user', 'ai', 'error', 'system')
   * @param {string} content - Message content
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async saveMessage(messageType, content, metadata = {}) {
    try {
      if (!this.currentChatId) {
        throw new Error('No active chat session');
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: this.currentChatId,
          message_type: messageType,
          content: content,
          metadata: metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', this.currentChatId);

      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      console.error('Error in saveMessage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update chat name
   * @param {string} chatId - The chat ID
   * @param {string} newName - New name for the chat
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateChatName(chatId, newName) {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ 
          chat_name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (error) {
        console.error('Error updating chat name:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in updateChatName:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a chat and all its messages
   * @param {string} chatId - The chat ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteChat(chatId) {
    try {
      // Delete all messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        return {
          success: false,
          error: messagesError.message
        };
      }

      // Delete the chat
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        console.error('Error deleting chat:', chatError);
        return {
          success: false,
          error: chatError.message
        };
      }

      // Clear current chat if it was deleted
      if (this.currentChatId === chatId) {
        this.currentChatId = null;
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in deleteChat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set the current active chat
   * @param {string} chatId - The chat ID to set as active
   */
  setCurrentChat(chatId) {
    this.currentChatId = chatId;
  }

  /**
   * Get the current active chat ID
   * @returns {string|null} - Current chat ID or null
   */
  getCurrentChatId() {
    return this.currentChatId;
  }

  /**
   * Clear the current chat session
   */
  clearCurrentChat() {
    this.currentChatId = null;
  }
}

export const chatPersistenceService = new ChatPersistenceService();
