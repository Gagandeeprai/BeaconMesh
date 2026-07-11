FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Set build environment variable for Vite
ENV VITE_API_URL=http://localhost:8080
RUN npm run build

# Expose server port
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
