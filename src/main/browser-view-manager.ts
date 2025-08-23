import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import path from 'path';

class BrowserViewManager {
  private view: BrowserView | null = null;
  private parentWindow: BrowserWindow | null = null;
  private isRecording: boolean = false;
  private recordingMode: 'CLICK' | 'TYPE' | 'HOVER' | null = null;

  createBrowserView(parentWindow: BrowserWindow) {
    if (this.view) {
      this.destroyBrowserView();
    }

    this.parentWindow = parentWindow;
    this.view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        preload: path.join(__dirname, '../preload/view-preload.js'),
      },
    });

    parentWindow.addBrowserView(this.view);

    // Set up event listeners for the view
    this.view.webContents.on('did-finish-load', () => {
      this.injectRecorderScript();
    });

    // Handle navigation events
    this.view.webContents.on('will-navigate', (event, url) => {
      // Send navigation event to renderer
      parentWindow.webContents.send('browser:navigation', { url });
    });

    // Handle console messages from the page
    this.view.webContents.on('console-message', (event, level, message) => {
      if (message.startsWith('[RECORDER]')) {
        parentWindow.webContents.send('browser:console', { level, message });
      }
    });
  }

  setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    if (this.view) {
      this.view.setBounds(bounds);
      this.view.setAutoResize({
        width: true,
        height: true,
        horizontal: false,
        vertical: false,
      });
    }
  }

  async navigate(url: string) {
    if (!this.view) return;

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      await this.view.webContents.loadURL(url);
    } catch (error) {
      console.error('Navigation error:', error);
      if (this.parentWindow) {
        this.parentWindow.webContents.send('browser:error', {
          type: 'navigation',
          message: `Failed to load ${url}`,
        });
      }
    }
  }

  destroyBrowserView() {
    if (this.view && this.parentWindow) {
      this.parentWindow.removeBrowserView(this.view);
      (this.view.webContents as any).destroy();
      this.view = null;
    }
  }

  async startRecording(mode: 'CLICK' | 'TYPE' | 'HOVER') {
    if (!this.view) return;

    this.isRecording = true;
    this.recordingMode = mode;

    await this.injectRecorderScript();
    await this.view.webContents.executeJavaScript(`
      window.__recorder.startRecording('${mode}');
    `);
  }

  async stopRecording() {
    if (!this.view) return;

    this.isRecording = false;
    this.recordingMode = null;

    await this.view.webContents.executeJavaScript(`
      window.__recorder.stopRecording();
    `);
  }

  private async injectRecorderScript() {
    if (!this.view) return;

    await this.view.webContents.executeJavaScript(`
      // Create recorder object if it doesn't exist
      if (!window.__recorder) {
        window.__recorder = {
          mode: null,
          isRecording: false,
          highlightElement: null,

          // Generate unique CSS selector for an element
          generateSelector: function(element) {
            if (element.id) {
              return '#' + CSS.escape(element.id);
            }

            // Try to find a unique selector
            const path = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE) {
              let selector = current.nodeName.toLowerCase();

              // Add classes if they exist
              if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\\s+/);
                if (classes.length > 0 && classes[0]) {
                  selector += '.' + classes.map(c => CSS.escape(c)).join('.');
                }
              }

              // Add nth-child if needed for uniqueness
              if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children);
                const index = siblings.indexOf(current) + 1;
                if (siblings.length > 1) {
                  selector += ':nth-child(' + index + ')';
                }
              }

              path.unshift(selector);
              current = current.parentNode;

              // Stop at body or html
              if (current && (current.nodeName === 'BODY' || current.nodeName === 'HTML')) {
                break;
              }
            }

            return path.join(' > ');
          },

          // Get element text content (for validation)
          getElementText: function(element) {
            return element.textContent ? element.textContent.trim().substring(0, 100) : '';
          },

          // Get element attributes
          getElementAttributes: function(element) {
            const attrs = {};
            for (const attr of element.attributes) {
              attrs[attr.name] = attr.value;
            }
            return attrs;
          },

          // Highlight element on hover
          highlightElement: function(element) {
            if (this.highlightOverlay) {
              this.highlightOverlay.remove();
            }

            const rect = element.getBoundingClientRect();
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.left = rect.left + 'px';
            overlay.style.top = rect.top + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
            overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
            overlay.style.border = '2px solid #3B82F6';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '999999';
            document.body.appendChild(overlay);
            this.highlightOverlay = overlay;
          },

          // Remove highlight
          removeHighlight: function() {
            if (this.highlightOverlay) {
              this.highlightOverlay.remove();
              this.highlightOverlay = null;
            }
          },

          // Handle click recording
          handleClick: function(event) {
            if (!this.isRecording || this.mode !== 'CLICK') return;

            event.preventDefault();
            event.stopPropagation();

            const selector = this.generateSelector(event.target);
            const text = this.getElementText(event.target);
            const attributes = this.getElementAttributes(event.target);

            window.electronAPI.sendToMain('recorder:action', {
              type: 'BROWSER',
              parameters: {
                action: 'CLICK',
                selector: selector,
                text: text,
                attributes: attributes,
                url: window.location.href
              }
            });

            this.stopRecording();
          },

          // Handle type recording
          handleFocus: function(event) {
            if (!this.isRecording || this.mode !== 'TYPE') return;

            const target = event.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              event.preventDefault();
              event.stopPropagation();

              const selector = this.generateSelector(target);
              const attributes = this.getElementAttributes(target);

              // Show input dialog
              const value = prompt('Enter the value to type (use variables like <USER>, <PASS>):');
              if (value !== null) {
                window.electronAPI.sendToMain('recorder:action', {
                  type: 'BROWSER',
                  parameters: {
                    action: 'TYPE',
                    selector: selector,
                    value: value,
                    attributes: attributes,
                    url: window.location.href
                  }
                });
              }

              this.stopRecording();
            }
          },

          // Handle hover for visual feedback
          handleHover: function(event) {
            if (!this.isRecording) return;
            this.highlightElement(event.target);
          },

          // Handle mouse leave
          handleMouseLeave: function(event) {
            this.removeHighlight();
          },

          // Start recording
          startRecording: function(mode) {
            console.log('[RECORDER] Starting recording in mode:', mode);
            this.mode = mode;
            this.isRecording = true;

            // Remove existing listeners
            this.stopRecording();

            // Add new listeners
            this.clickHandler = this.handleClick.bind(this);
            this.focusHandler = this.handleFocus.bind(this);
            this.hoverHandler = this.handleHover.bind(this);
            this.leaveHandler = this.handleMouseLeave.bind(this);

            document.addEventListener('click', this.clickHandler, true);
            document.addEventListener('focusin', this.focusHandler, true);
            document.addEventListener('mouseover', this.hoverHandler, true);
            document.addEventListener('mouseout', this.leaveHandler, true);

            // Add visual indicator
            this.showRecordingIndicator();
          },

          // Stop recording
          stopRecording: function() {
            console.log('[RECORDER] Stopping recording');
            this.isRecording = false;
            this.mode = null;

            // Remove event listeners
            if (this.clickHandler) {
              document.removeEventListener('click', this.clickHandler, true);
            }
            if (this.focusHandler) {
              document.removeEventListener('focusin', this.focusHandler, true);
            }
            if (this.hoverHandler) {
              document.removeEventListener('mouseover', this.hoverHandler, true);
            }
            if (this.leaveHandler) {
              document.removeEventListener('mouseout', this.leaveHandler, true);
            }

            // Remove visual elements
            this.removeHighlight();
            this.hideRecordingIndicator();
          },

          // Show recording indicator
          showRecordingIndicator: function() {
            if (this.indicator) return;

            const indicator = document.createElement('div');
            indicator.innerHTML = '🔴 RECORDING: ' + this.mode;
            indicator.style.position = 'fixed';
            indicator.style.top = '10px';
            indicator.style.right = '10px';
            indicator.style.padding = '10px 20px';
            indicator.style.backgroundColor = '#DC2626';
            indicator.style.color = 'white';
            indicator.style.borderRadius = '8px';
            indicator.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            indicator.style.fontSize = '14px';
            indicator.style.fontWeight = 'bold';
            indicator.style.zIndex = '999999';
            indicator.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            document.body.appendChild(indicator);
            this.indicator = indicator;
          },

          // Hide recording indicator
          hideRecordingIndicator: function() {
            if (this.indicator) {
              this.indicator.remove();
              this.indicator = null;
            }
          }
        };
      }

      // Auto-detect forms and important elements
      window.__recorder.detectImportantElements = function() {
        const elements = [];

        // Find all input fields
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]').forEach(input => {
          elements.push({
            type: 'input',
            selector: this.generateSelector(input),
            name: input.name || input.id || '',
            placeholder: input.placeholder || ''
          });
        });

        // Find all buttons
        document.querySelectorAll('button, input[type="submit"], a.btn, a.button').forEach(button => {
          elements.push({
            type: 'button',
            selector: this.generateSelector(button),
            text: this.getElementText(button)
          });
        });

        return elements;
      };

      true; // Return value for executeJavaScript
    `);
  }

  // Additional utility methods
  async captureScreenshot(): Promise<string> {
    if (!this.view) return '';

    const image = await this.view.webContents.capturePage();
    return image.toDataURL();
  }

  async executeScript(script: string): Promise<any> {
    if (!this.view) return null;

    try {
      return await this.view.webContents.executeJavaScript(script);
    } catch (error) {
      console.error('Script execution error:', error);
      return null;
    }
  }

  async detectElements() {
    if (!this.view) return [];

    return await this.view.webContents.executeJavaScript(`
      window.__recorder.detectImportantElements();
    `);
  }

  // Navigation controls
  async goBack() {
    if (this.view && this.view.webContents.canGoBack()) {
      this.view.webContents.goBack();
    }
  }

  async goForward() {
    if (this.view && this.view.webContents.canGoForward()) {
      this.view.webContents.goForward();
    }
  }

  async reload() {
    if (this.view) {
      this.view.webContents.reload();
    }
  }

  getURL(): string {
    return this.view ? this.view.webContents.getURL() : '';
  }
}

export const browserViewManager = new BrowserViewManager();
