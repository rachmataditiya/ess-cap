FROM node:latest

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 4173 (Vite preview default port)
EXPOSE 4173

# Start the preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"] 