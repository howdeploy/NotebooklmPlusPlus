// YouTube Data API v3 client for fetching comments
// Used by background service worker via importScripts

const YouTubeCommentsAPI = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  REQUEST_DELAY: 100,

  // Error codes
  ERRORS: {
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    COMMENTS_DISABLED: 'COMMENTS_DISABLED',
    VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
    INVALID_REQUEST: 'INVALID_REQUEST',
    NETWORK_ERROR: 'NETWORK_ERROR'
  },

  // Extract video ID from various YouTube URL formats
  extractVideoId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  // Validate API key with a lightweight request
  async validateApiKey(apiKey) {
    try {
      const url = `${this.BASE_URL}/videos?part=id&id=dQw4w9WgXcQ&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (response.ok) return { valid: true };

      const data = await response.json();
      const error = data.error?.errors?.[0];
      if (response.status === 400 || response.status === 403) {
        return { valid: false, error: error?.reason || 'invalid_key' };
      }
      return { valid: false, error: 'unknown' };
    } catch (e) {
      return { valid: false, error: 'network' };
    }
  },

  // Get video metadata (snippet + statistics)
  async getVideoMetadata(videoId, apiKey) {
    const url = `${this.BASE_URL}/videos?part=snippet,statistics&id=${videoId}&key=${encodeURIComponent(apiKey)}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw this._makeError(this.ERRORS.VIDEO_NOT_FOUND, 'Video not found');
    }

    const item = data.items[0];
    return {
      videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
      commentCount: parseInt(item.statistics.commentCount || '0', 10)
    };
  },

  // Fetch ALL comments (paginated), with progress callback and cancel token
  async fetchAllComments(videoId, apiKey, { progressCallback, cancelToken } = {}) {
    const comments = [];
    let nextPageToken = null;
    let fetched = 0;

    do {
      if (cancelToken?.cancelled) return comments;

      let url = `${this.BASE_URL}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=100&textFormat=plainText&order=relevance&key=${encodeURIComponent(apiKey)}`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const response = await this.fetchWithRetry(url);
      const data = await this._parseResponse(response);

      for (const item of (data.items || [])) {
        if (cancelToken?.cancelled) return comments;

        const thread = this._parseThread(item);

        // If thread has more replies than returned, fetch them all
        if (item.snippet.totalReplyCount > (item.replies?.comments?.length || 0)) {
          thread.replies = await this.fetchReplies(item.id, apiKey, cancelToken);
        }

        comments.push(thread);
        fetched++;

        if (progressCallback) {
          progressCallback({ fetched, total: null });
        }
      }

      nextPageToken = data.nextPageToken || null;

      // Delay between requests
      await this._delay(this.REQUEST_DELAY);

    } while (nextPageToken);

    return comments;
  },

  // Fetch all replies for a comment thread
  async fetchReplies(commentId, apiKey, cancelToken) {
    const replies = [];
    let nextPageToken = null;

    do {
      if (cancelToken?.cancelled) return replies;

      let url = `${this.BASE_URL}/comments?part=snippet&parentId=${commentId}&maxResults=100&textFormat=plainText&key=${encodeURIComponent(apiKey)}`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const response = await this.fetchWithRetry(url);
      const data = await this._parseResponse(response);

      for (const item of (data.items || [])) {
        replies.push(this._parseReply(item));
      }

      nextPageToken = data.nextPageToken || null;

      await this._delay(this.REQUEST_DELAY);

    } while (nextPageToken);

    return replies;
  },

  // Fetch with exponential backoff retry for 429/500/503
  async fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (response.ok) return response;

        // Handle specific error status codes
        if (response.status === 403) {
          const data = await response.json();
          const reason = data.error?.errors?.[0]?.reason;
          if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') {
            throw this._makeError(this.ERRORS.QUOTA_EXCEEDED, 'YouTube API quota exceeded');
          }
          if (reason === 'commentsDisabled' || reason === 'forbidden') {
            throw this._makeError(this.ERRORS.COMMENTS_DISABLED, 'Comments are disabled for this video');
          }
          throw this._makeError(this.ERRORS.INVALID_REQUEST, data.error?.message || 'Forbidden');
        }

        if (response.status === 404) {
          throw this._makeError(this.ERRORS.VIDEO_NOT_FOUND, 'Video not found');
        }

        // Retry on 429, 500, 503
        if ([429, 500, 503].includes(response.status) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this._delay(delay);
          continue;
        }

        throw this._makeError(this.ERRORS.INVALID_REQUEST, `HTTP ${response.status}`);
      } catch (e) {
        if (e.code) throw e; // Re-throw our errors
        if (attempt >= maxRetries) {
          throw this._makeError(this.ERRORS.NETWORK_ERROR, e.message);
        }
        const delay = Math.pow(2, attempt) * 1000;
        await this._delay(delay);
      }
    }
  },

  // Parse a comment thread item from API response
  _parseThread(item) {
    const snippet = item.snippet.topLevelComment.snippet;
    const replies = (item.replies?.comments || []).map(r => this._parseReply(r));

    return {
      id: item.id,
      author: snippet.authorDisplayName,
      text: snippet.textOriginal || snippet.textDisplay,
      likeCount: snippet.likeCount || 0,
      publishedAt: snippet.publishedAt,
      totalReplyCount: item.snippet.totalReplyCount || 0,
      replies
    };
  },

  // Parse a reply item
  _parseReply(item) {
    const snippet = item.snippet;
    return {
      id: item.id,
      author: snippet.authorDisplayName,
      text: snippet.textOriginal || snippet.textDisplay,
      likeCount: snippet.likeCount || 0,
      publishedAt: snippet.publishedAt
    };
  },

  // Parse API response, handling error cases
  async _parseResponse(response) {
    const data = await response.json();

    if (data.error) {
      const reason = data.error.errors?.[0]?.reason;
      if (reason === 'commentsDisabled' || reason === 'forbidden') {
        throw this._makeError(this.ERRORS.COMMENTS_DISABLED, 'Comments are disabled for this video');
      }
      if (reason === 'videoNotFound') {
        throw this._makeError(this.ERRORS.VIDEO_NOT_FOUND, 'Video not found');
      }
      if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') {
        throw this._makeError(this.ERRORS.QUOTA_EXCEEDED, 'YouTube API quota exceeded');
      }
      throw this._makeError(this.ERRORS.INVALID_REQUEST, data.error.message);
    }

    return data;
  },

  // Create error with code
  _makeError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  },

  // Delay helper
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
