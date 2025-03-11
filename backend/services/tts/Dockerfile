# Use the official Node.js 20 image
FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for efficient caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm install --only=production

# Copy source code
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV FUNCTION_TARGET=helloWorld

# Start the server directly using Node.js
CMD ["node", "server.js"]
