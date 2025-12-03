# Gunicorn configuration for Socket.IO on Render
import os

# Bind to the port Render provides
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

# Use eventlet worker for Socket.IO support
worker_class = "eventlet"

# Only 1 worker for Socket.IO (required for room management)
workers = 1

# Increase timeout for long-polling
timeout = 120

# Keep alive
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
