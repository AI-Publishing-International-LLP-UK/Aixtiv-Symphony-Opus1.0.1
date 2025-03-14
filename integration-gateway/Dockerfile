# Stage 1: Dependencies and Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript code
RUN npm run build

# Stage 2: Production Runtime
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Set environment to production
ENV NODE_ENV production

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]

