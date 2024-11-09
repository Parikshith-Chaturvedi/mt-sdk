// sdk.js

/**
 * @typedef {Object} MouseEvent
 * @property {string} type - Type of the event ('mousemove' or 'mouseclick')
 * @property {number} x - X coordinate of the event
 * @property {number} y - Y coordinate of the event
 * @property {number} timestamp - Timestamp of when the event occurred
 * @property {string} target - Target element tagName
 * @property {string[]} path - DOM path to the event target
 * @property {number} [button] - Mouse button (for click events)
 */

/**
 * @typedef {Object} TrackerData
 * @property {number} totalEvents - Total number of events recorded
 * @property {boolean} isTracking - Current tracking status
 * @property {MouseEvent[]} events - Array of recorded events
 */

class MouseTrackerSDK {
  /**
   * @param {Object} config - Configuration object
   * @param {number} [config.maxEvents=1000] - Maximum number of events to store
   * @param {number} [config.throttleInterval=50] - Mousemove throttle interval in ms
   * @param {boolean} [config.debug=false] - Enable debug logging
   * @throws {Error} If invalid configuration is provided
   */
  constructor(config = {}) {
    this.validateConfig(config);

    this.maxEvents = config.maxEvents || 1000;
    this.throttleInterval = config.throttleInterval || 50;
    this.debug = config.debug || false;

    this.events = [];
    this.isTracking = false;
    this.lastMoveTimestamp = 0;

    // Bind event handlers
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
    this.boundMouseClickHandler = this.handleMouseClick.bind(this);

    // Performance optimization: Pre-allocate events array
    this.events = new Array(this.maxEvents);
    this.currentIndex = 0;

    // Add event emitter functionality
    this.eventListeners = new Map();
  }

  /**
   * Validates configuration parameters
   * @private
   * @param {Object} config - Configuration object to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (
      config.maxEvents &&
      (!Number.isInteger(config.maxEvents) || config.maxEvents <= 0)
    ) {
      throw new Error("maxEvents must be a positive integer");
    }
    if (
      config.throttleInterval &&
      (!Number.isInteger(config.throttleInterval) ||
        config.throttleInterval < 0)
    ) {
      throw new Error("throttleInterval must be a non-negative integer");
    }
  }

  /**
   * Adds an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Removes an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  /**
   * Emits an event
   * @private
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.logError("Error in event listener:", error);
        }
      });
    }
  }

  /**
   * Handles mouse move events
   * @private
   * @param {MouseEvent} event - DOM mouse event
   */
  handleMouseMove(event) {
    const now = Date.now();
    if (now - this.lastMoveTimestamp < this.throttleInterval) {
      return;
    }
    this.lastMoveTimestamp = now;

    try {
      const eventData = this.createEventData("mousemove", event);
      this.addEvent(eventData);
      this.emit("mousemove", eventData);
    } catch (error) {
      this.logError("Error handling mouse move:", error);
    }
  }

  /**
   * Handles mouse click events
   * @private
   * @param {MouseEvent} event - DOM mouse event
   */
  handleMouseClick(event) {
    try {
      const eventData = this.createEventData("mouseclick", event);
      eventData.button = event.button;
      this.addEvent(eventData);
      this.emit("mouseclick", eventData);
    } catch (error) {
      this.logError("Error handling mouse click:", error);
    }
  }

  /**
   * Creates standardized event data
   * @private
   * @param {string} type - Event type
   * @param {MouseEvent} event - DOM mouse event
   * @returns {Object} Standardized event data
   */
  createEventData(type, event) {
    return {
      type,
      x: event.clientX,
      y: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      timestamp: Date.now(),
      target: event.target.tagName.toLowerCase(),
      path: this.getEventPath(event),
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      },
    };
  }

  /**
   * Gets the DOM path for an event
   * @private
   * @param {MouseEvent} event - DOM mouse event
   * @returns {string[]} Array of element tags in the path
   */
  getEventPath(event) {
    const path = [];
    let element = event.target;

    while (element) {
      path.push({
        tag: element.tagName.toLowerCase(),
        id: element.id || undefined,
        className: element.className || undefined,
      });
      element = element.parentElement;
    }

    return path;
  }

  /**
   * Adds an event to the storage
   * @private
   * @param {Object} event - Event data to store
   */
  addEvent(event) {
    try {
      this.events[this.currentIndex] = event;
      this.currentIndex = (this.currentIndex + 1) % this.maxEvents;
      this.emit("eventAdded", event);
    } catch (error) {
      this.logError("Error adding event:", error);
      throw error;
    }
  }

  /**
   * Starts event tracking
   * @returns {boolean} Success status
   * @throws {Error} If tracking cannot be started
   */
  start() {
    if (this.isTracking) {
      this.logWarning("Mouse tracking is already active");
      return false;
    }

    try {
      document.addEventListener("mousemove", this.boundMouseMoveHandler, {
        passive: true,
      });
      document.addEventListener("click", this.boundMouseClickHandler, {
        passive: true,
      });
      this.isTracking = true;
      this.emit("trackingStarted", null);
      this.logDebug("Mouse tracking started");
      return true;
    } catch (error) {
      this.logError("Error starting mouse tracking:", error);
      throw error;
    }
  }

  /**
   * Stops event tracking
   * @returns {boolean} Success status
   * @throws {Error} If tracking cannot be stopped
   */
  stop() {
    if (!this.isTracking) {
      this.logWarning("Mouse tracking is not active");
      return false;
    }

    try {
      document.removeEventListener("mousemove", this.boundMouseMoveHandler);
      document.removeEventListener("click", this.boundMouseClickHandler);
      this.isTracking = false;
      this.emit("trackingStopped", null);
      this.logDebug("Mouse tracking stopped");
      return true;
    } catch (error) {
      this.logError("Error stopping mouse tracking:", error);
      throw error;
    }
  }

  /**
   * Returns collected event data
   * @returns {TrackerData} Collected event data
   */
  getData() {
    try {
      // Filter out undefined entries and create a clean array
      const events = this.events
        .filter((event) => event !== undefined)
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        totalEvents: events.length,
        isTracking: this.isTracking,
        events,
        statistics: this.getStatistics(events),
      };
    } catch (error) {
      this.logError("Error getting data:", error);
      throw error;
    }
  }

  /**
   * Calculates statistics from events
   * @private
   * @param {MouseEvent[]} events - Array of events
   * @returns {Object} Statistics object
   */
  getStatistics(events) {
    const moveEvents = events.filter((e) => e.type === "mousemove");
    const clickEvents = events.filter((e) => e.type === "mouseclick");

    return {
      moveEvents: moveEvents.length,
      clickEvents: clickEvents.length,
      eventRate: events.length
        ? events.length / ((Date.now() - events[0].timestamp) / 1000)
        : 0,
      averageMovementSpeed: this.calculateAverageMovementSpeed(moveEvents),
    };
  }

  /**
   * Calculates average movement speed
   * @private
   * @param {MouseEvent[]} moveEvents - Array of movement events
   * @returns {number} Average speed in pixels per second
   */
  calculateAverageMovementSpeed(moveEvents) {
    if (moveEvents.length < 2) return 0;

    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 1; i < moveEvents.length; i++) {
      const dx = moveEvents[i].x - moveEvents[i - 1].x;
      const dy = moveEvents[i].y - moveEvents[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const time =
        (moveEvents[i].timestamp - moveEvents[i - 1].timestamp) / 1000;

      totalDistance += distance;
      totalTime += time;
    }

    return totalTime > 0 ? totalDistance / totalTime : 0;
  }

  /**
   * Clears collected data
   * @returns {boolean} Success status
   */
  clear() {
    try {
      this.events = new Array(this.maxEvents);
      this.currentIndex = 0;
      this.emit("dataCleared", null);
      this.logDebug("Event data cleared");
      return true;
    } catch (error) {
      this.logError("Error clearing data:", error);
      throw error;
    }
  }

  /**
   * Logging utilities
   * @private
   */
  logDebug(...args) {
    if (this.debug) console.log("[MouseTracker]", ...args);
  }

  logWarning(...args) {
    console.warn("[MouseTracker]", ...args);
  }

  logError(...args) {
    console.error("[MouseTracker]", ...args);
  }
}

// Export for both module and non-module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = MouseTrackerSDK;
} else if (typeof window !== "undefined") {
  window.MouseTrackerSDK = MouseTrackerSDK;
}
