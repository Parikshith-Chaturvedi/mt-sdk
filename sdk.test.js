// sdk.test.js

/**
 * @jest-environment jsdom
 */

const MouseTrackerSDK = require("./sdk");

describe("MouseTrackerSDK", () => {
  let tracker;

  beforeEach(() => {
    tracker = new MouseTrackerSDK({
      maxEvents: 10,
      throttleInterval: 50,
      debug: false,
    });
  });

  afterEach(() => {
    if (tracker.isTracking) {
      tracker.stop();
    }
  });

  describe("Configuration", () => {
    test("should initialize with default values", () => {
      const defaultTracker = new MouseTrackerSDK();
      expect(defaultTracker.maxEvents).toBe(1000);
      expect(defaultTracker.throttleInterval).toBe(50);
      expect(defaultTracker.debug).toBe(false);
    });

    test("should throw error for invalid maxEvents", () => {
      expect(() => new MouseTrackerSDK({ maxEvents: -1 })).toThrow();
      expect(() => new MouseTrackerSDK({ maxEvents: 0 })).toThrow();
      expect(() => new MouseTrackerSDK({ maxEvents: "invalid" })).toThrow();
    });

    test("should throw error for invalid throttleInterval", () => {
      expect(() => new MouseTrackerSDK({ throttleInterval: -1 })).toThrow();
      expect(
        () => new MouseTrackerSDK({ throttleInterval: "invalid" })
      ).toThrow();
    });
  });

  describe("Event Tracking", () => {
    test("should start tracking", () => {
      expect(tracker.start()).toBe(true);
      expect(tracker.isTracking).toBe(true);
    });

    test("should stop tracking", () => {
      tracker.start();
      expect(tracker.stop()).toBe(true);
      expect(tracker.isTracking).toBe(false);
    });

    test("should not start tracking when already tracking", () => {
      tracker.start();
      expect(tracker.start()).toBe(false);
    });

    test("should not stop tracking when not tracking", () => {
      expect(tracker.stop()).toBe(false);
    });
  });

  describe("Event Handling", () => {
    test("should handle mouse move events", () => {
      tracker.start();

      const moveEvent = new MouseEvent("mousemove", {
        clientX: 100,
        clientY: 200,
        screenX: 120,
        screenY: 220,
      });

      document.dispatchEvent(moveEvent);

      const data = tracker.getData();
      expect(data.events.length).toBeGreaterThan(0);
      expect(data.events[0].type).toBe("mousemove");
      expect(data.events[0].x).toBe(100);
      expect(data.events[0].y).toBe(200);
    });

    test("should handle mouse click events", () => {
      tracker.start();

      const clickEvent = new MouseEvent("click", {
        clientX: 150,
        clientY: 250,
        button: 0,
      });

      document.dispatchEvent(clickEvent);

      const data = tracker.getData();
      expect(data.events.length).toBeGreaterThan(0);
      expect(data.events[0].type).toBe("mouseclick");
      expect(data.events[0].x).toBe(150);
      expect(data.events[0].y).toBe(250);
      expect(data.events[0].button).toBe(0);
    });

    test("should throttle mouse move events", (done) => {
      tracker.start();

      // Simulate rapid mouse movements
      for (let i = 0; i < 5; i++) {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: i * 10,
          clientY: i * 10,
        });
        document.dispatchEvent(moveEvent);
      }

      // Check after throttle interval
      setTimeout(() => {
        const data = tracker.getData();
        expect(data.events.length).toBeLessThan(5);
        done();
      }, 100);
    });

    test("should respect maxEvents limit", () => {
      tracker = new MouseTrackerSDK({ maxEvents: 3 });
      tracker.start();

      // Generate 5 events
      for (let i = 0; i < 5; i++) {
        const clickEvent = new MouseEvent("click", {
          clientX: i * 10,
          clientY: i * 10,
        });
        document.dispatchEvent(clickEvent);
      }

      const data = tracker.getData();
      expect(data.events.length).toBe(3);
      // Should keep the 3 most recent events
      expect(data.events[0].x).toBe(20);
      expect(data.events[2].x).toBe(40);
    });
  });

  describe("Event Emitter", () => {
    test("should emit events correctly", (done) => {
      const events = [];

      tracker.on("mouseclick", (event) => {
        events.push(event);
      });

      tracker.start();

      const clickEvent = new MouseEvent("click", {
        clientX: 100,
        clientY: 100,
      });

      document.dispatchEvent(clickEvent);

      setTimeout(() => {
        expect(events.length).toBe(1);
        expect(events[0].type).toBe("mouseclick");
        done();
      }, 50);
    });

    test("should allow removing event listeners", () => {
      const listener = jest.fn();

      tracker.on("mouseclick", listener);
      tracker.off("mouseclick", listener);

      tracker.start();
      document.dispatchEvent(new MouseEvent("click"));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Data Management", () => {
    test("should clear data correctly", () => {
      tracker.start();

      document.dispatchEvent(new MouseEvent("click"));
      expect(tracker.getData().events.length).toBeGreaterThan(0);

      tracker.clear();
      expect(tracker.getData().events.length).toBe(0);
    });

    test("should provide correct statistics", () => {
      tracker.start();

      // Simulate movement with known coordinates
      const moveEvent1 = new MouseEvent("mousemove", {
        clientX: 0,
        clientY: 0,
      });

      const moveEvent2 = new MouseEvent("mousemove", {
        clientX: 100,
        clientY: 0,
      });

      document.dispatchEvent(moveEvent1);

      // Wait to ensure events are registered with different timestamps
      setTimeout(() => {
        document.dispatchEvent(moveEvent2);

        const data = tracker.getData();
        const stats = data.statistics;

        expect(stats.moveEvents).toBe(2);
        expect(stats.averageMovementSpeed).toBeGreaterThan(0);
      }, 100);
    });
  });

  describe('Logging', () => {
    test('should log errors correctly', () => {
        const error = new Error('Test error');
        tracker.logError('Test error message', error);
        
        expect(console.error).toHaveBeenCalledWith(
            '[MouseTracker]',
            'Test error message',
            error
        );
    });

    test('should log warnings correctly', () => {
        tracker.logWarning('Test warning message');
        
        expect(console.warn).toHaveBeenCalledWith(
            '[MouseTracker]',
            'Test warning message'
        );
    });

    test('should log debug messages only when debug is enabled', () => {
        // With debug disabled
        tracker.logDebug('Test debug message');
        expect(console.log).not.toHaveBeenCalled();

        // With debug enabled
        tracker = new MouseTrackerSDK({ debug: true });
        tracker.logDebug('Test debug message');
        expect(console.log).toHaveBeenCalledWith(
            '[MouseTracker]',
            'Test debug message'
        );
    });
});

describe('Error Handling', () => {
    test('should handle invalid event data gracefully', () => {
        expect(() => {
            tracker.addEvent(null);
        }).toThrow();
        expect(console.error).toHaveBeenCalled();
    });

    test('should log error when event listener throws', () => {
        const errorListener = () => {
            throw new Error('Listener error');
        };
        
        tracker.on('mouseclick', errorListener);
        tracker.start();
        
        document.dispatchEvent(new MouseEvent('click'));
        
        expect(console.error).toHaveBeenCalled();
    });

    test('should handle DOM exceptions', () => {
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = jest.fn(() => {
            throw new Error('DOM Exception');
        });
        
        expect(() => tracker.start()).toThrow('DOM Exception');
        expect(console.error).toHaveBeenCalled();
        
        document.addEventListener = originalAddEventListener;
    });
});

  describe("Performance", () => {
    test("should handle rapid events efficiently", (done) => {
      tracker.start();

      const startTime = performance.now();

      // Simulate 1000 rapid mouse moves
      for (let i = 0; i < 1000; i++) {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: i,
            clientY: i,
          })
        );
      }

      const endTime = performance.now();

      // Processing should take less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
      done();
    });
  });
});
