import '@testing-library/jest-dom'

// Mock Worker for tests since it's not available in Jest environment
global.Worker = class {
  constructor(url) {
    this.url = url
    this.onmessage = null
    this.onerror = null
  }

  postMessage(data) {
    // Simulate async behavior
    setTimeout(() => {
      if (this.onmessage) {
        // Mock responses based on message type
        if (data.type === 'init') {
          this.onmessage({ data: { type: 'init-complete' } })
        } else if (data.type === 'execute') {
          this.onmessage({
            data: {
              type: 'result',
              result: `Mock output for: ${data.code}`,
            },
          })
        }
      }
    }, 100)
  }

  terminate() {
    // Mock terminate
  }
}

// Mock URL.createObjectURL since it's not available in Jest
global.URL.createObjectURL = jest.fn(() => 'mocked-url')

// Mock import.meta.url
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      url: 'file:///mock/path',
    },
  },
})
