// Mock TransformStream for MSW compatibility in Node.js
if (typeof global.TransformStream === "undefined") {
	global.TransformStream = class {
		constructor() {}
	};
}
// Mock BroadcastChannel for MSW compatibility in Node.js
if (typeof global.BroadcastChannel === "undefined") {
	global.BroadcastChannel = class {
		constructor() {}
		postMessage() {}
		close() {}
		addEventListener() {}
		removeEventListener() {}
		onmessage = null;
	};
}
import "@testing-library/jest-dom";
import "whatwg-fetch";

// Polyfill TextEncoder and TextDecoder for Node.js
import { TextDecoder, TextEncoder } from "util";

if (typeof global.TextEncoder === "undefined") {
	global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
	global.TextDecoder = TextDecoder;
}

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  })),
  createBuffer: jest.fn(() => ({
    length: 1024,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: jest.fn(() => new Float32Array(1024))
  })),
  decodeAudioData: jest.fn(() => Promise.resolve({
    length: 1024,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: jest.fn(() => new Float32Array(1024))
  })),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  close: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn()
}));

global.webkitAudioContext = global.AudioContext;

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive'
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [],
      addTrack: jest.fn(),
      removeTrack: jest.fn()
    }))
  }
});

// Mock Canvas API - create a more complete mock
const mockCanvas = {
  getContext: jest.fn((type) => {
    if (type === '2d') {
      return {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100 })),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        scale: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        createLinearGradient: jest.fn(() => ({
          addColorStop: jest.fn()
        })),
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic'
      };
    }
    return null;
  }),
  width: 800,
  height: 600,
  style: {},
  getBoundingClientRect: jest.fn(() => ({
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    x: 0,
    y: 0
  }))
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: mockCanvas.getContext
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  writable: true,
  value: mockCanvas.getBoundingClientRect
});

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1
});
