/**
 * universalDispatcher.js
 * A simple implementation of the dispatcher module required by universalDispatcherFunctions.js
 */

// Store dispatches in memory for this simple implementation
const dispatches = new Map();

/**
 * Simple dispatcher implementation
 */
const dispatcher = {
  /**
   * Dispatch a prompt with options
   * @param {Object} promptData - The prompt data to dispatch
   * @param {Object} options - Dispatch options
   * @returns {Object} Result with dispatchId
   */
  dispatch: async (promptData, options = {}) => {
    const dispatchId = `dispatch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store the dispatch
    dispatches.set(dispatchId, {
      id: dispatchId,
      promptData,
      options,
      status: 'pending',
      createdAt: new Date(),
      result: null
    });
    
    // Simulate success after a small delay
    setTimeout(() => {
      const dispatch = dispatches.get(dispatchId);
      if (dispatch && dispatch.status !== 'cancelled') {
        dispatch.status = 'completed';
        dispatch.result = { success: true, message: 'Dispatch completed successfully' };
        dispatches.set(dispatchId, dispatch);
      }
    }, 500);
    
    return {
      dispatchId,
      status: 'pending',
      message: 'Dispatch request accepted'
    };
  },
  
  /**
   * Get the status of a dispatch
   * @param {string} dispatchId - The ID of the dispatch
   * @returns {Object} The status of the dispatch
   */
  getDispatchStatus: async (dispatchId) => {
    const dispatch = dispatches.get(dispatchId);
    if (!dispatch) {
      return {
        status: 'not_found',
        message: `Dispatch ${dispatchId} not found`
      };
    }
    
    return {
      dispatchId,
      status: dispatch.status,
      result: dispatch.result,
      createdAt: dispatch.createdAt
    };
  },
  
  /**
   * Cancel a dispatch
   * @param {string} dispatchId - The ID of the dispatch to cancel
   * @returns {Object} Result of the cancellation
   */
  cancelDispatch: (dispatchId) => {
    const dispatch = dispatches.get(dispatchId);
    if (!dispatch) {
      return {
        success: false,
        message: `Dispatch ${dispatchId} not found`
      };
    }
    
    if (dispatch.status === 'completed') {
      return {
        success: false,
        message: `Dispatch ${dispatchId} already completed`
      };
    }
    
    dispatch.status = 'cancelled';
    dispatches.set(dispatchId, dispatch);
    
    return {
      success: true,
      message: `Dispatch ${dispatchId} cancelled successfully`
    };
  }
};

module.exports = {
  dispatcher
};
