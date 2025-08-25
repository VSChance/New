# Start from a standard Gitpod image
FROM gitpod/workspace-full

# Switch to the root user to install packages
USER root

# Install a lightweight desktop, VNC server, and a web-based VNC client
RUN apt-get update && \
    apt-get install -y --no-install-recommends xfce4 tigervnc-standalone-server novnc websockify && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# --- Add Windsurf Installation Steps Here ---
# You would add the commands to install Windsurf. For example, if it's a .deb file:
# ADD https://example.com/path/to/windsurf.deb /tmp/windsurf.deb
# RUN apt-get install -y /tmp/windsurf.deb
# ---------------------------------------------

# Switch back to the gitpod user
USER gitpod