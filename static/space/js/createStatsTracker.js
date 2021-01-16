import Service from './Service.js';

export const createStatsTracker = () => {
  let ws;
  Service.get('ws', (x) => (ws = x));
  return {
    fpsHistory: [],
    frames: null,
    startTime: null,
    begin() {
      if (!this.startTime) {
        this.startTime = +new Date();
        this.frames = 0;
        setTimeout(() => {
          const delta = +new Date() - this.startTime;
          const fps = this.frames / (delta / 1000);
          this.recordFps(fps);
          try {
            ws.send({ type: 'debug.fps', body: fps });
          } catch (e) {}
          this.startTime = null;
        }, 1000);
      }
      this.frames++;
    },
    end() {},
    recordFps(fps) {
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      if (this.fpsHistory.length < 10) return;
      const sortedFps = this.fpsHistory.slice().sort();
      const middle = (sortedFps.length + 1) / 2;
      const median = sortedFps[Math.floor(middle)];
      if (median < 29) {
        this.onPerformanceNeeded();
        this.fpsHistory.length = 5;
      }
      if (median > 50) {
        this.onPerformanceGood();
        this.fpsHistory.length = 5;
      }
    },
  };
};
