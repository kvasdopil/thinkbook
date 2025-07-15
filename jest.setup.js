import '@testing-library/jest-dom'

// Mock scrollIntoView only in JSDOM environment
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = jest.fn()
}

// Mock TextEncoder/TextDecoder for streaming tests
global.TextEncoder = class TextEncoder {
  encode(input) {
    return new Uint8Array(Buffer.from(input, 'utf8'))
  }
}

global.TextDecoder = class TextDecoder {
  decode(input) {
    return Buffer.from(input).toString('utf8')
  }
}

// Mock Worker only in JSDOM environment
if (typeof Worker !== 'undefined' || typeof window !== 'undefined') {
  global.Worker = class MockWorker {
    onmessage = null
    onerror = null

    postMessage(data) {
      // Simulate async behavior
      setTimeout(() => {
        if (this.onmessage) {
          // Mock responses based on message type
          if (data.type === 'init') {
            this.onmessage({ data: { type: 'init-complete' } })
          } else if (data.type === 'setInterruptBuffer') {
            this.onmessage({ data: { type: 'interrupt-buffer-set' } })
          } else if (data.type === 'execute') {
            // Simulate streaming output for print statements
            const lines = data.code
              .split('\n')
              .filter((line) => line.trim().startsWith('print('))

            if (lines.length > 0) {
              // Send streaming output messages for each print statement
              lines.forEach((line, index) => {
                setTimeout(
                  () => {
                    // Extract the content from print() calls
                    const match = line.match(/print\(["'](.*?)["']\)/)
                    const content = match
                      ? match[1].replace(/['"]/g, '')
                      : 'test output'

                    this.onmessage({
                      data: {
                        type: 'output',
                        output: {
                          type: 'out',
                          value: `${content}\n`,
                        },
                      },
                    })
                  },
                  50 + index * 30
                ) // Stagger the outputs
              })

              // Send completion message after all outputs
              setTimeout(
                () => {
                  this.onmessage({
                    data: {
                      type: 'result',
                      result: '', // Empty result since output was streamed
                    },
                  })
                },
                100 + lines.length * 30
              )
            } else {
              // For code without print statements, just send completion
              this.onmessage({
                data: {
                  type: 'result',
                  result: '',
                },
              })
            }
          }
        }
      }, 100)
    }

    terminate() {
      // Mock terminate
    }
  }
}

// Mock URL.createObjectURL since it's not available in Jest (JSDOM only)
if (typeof URL !== 'undefined' && typeof window !== 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'mocked-url')
}

// Mock import.meta.url
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      url: 'file:///mock/path',
    },
  },
})
