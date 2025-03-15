# Stage 1: Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source
COPY . .

# Stage 2: Production stage
FROM node:18-slim

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    mkdir -p /app/node_modules && \
    chown -R nodejs:nodejs /app

# Set security headers
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=error \
    NODE_OPTIONS="--max-old-space-size=2048" \
    PORT=8080

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/package.json .
COPY --from=builder --chown=nodejs:nodejs /app/.env .

# Switch to non-root user
USER nodejs

# Expose port for Cloud Run
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

