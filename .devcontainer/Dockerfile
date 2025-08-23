# Use the official Microsoft Dev Container image for Node.js & TypeScript
FROM mcr.microsoft.com/devcontainers/typescript-node:18

# Install system dependencies required for Electron and Playwright
RUN sudo apt-get update && sudo apt-get install -y \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    --no-install-recommends

# Install Playwright's browser dependencies
RUN npx playwright install-deps
