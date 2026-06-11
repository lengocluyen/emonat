FROM node:20-alpine
WORKDIR /workspace

# Install dependencies first for better layer caching
COPY server/package.json server/
RUN cd server && npm install --omit=dev

# Copy source
COPY server/ server/
COPY app/ app/

WORKDIR /workspace/server
EXPOSE 5173

# Run migrations then start the server
CMD ["sh", "-c", "node db/migrate.js && node index.js"]
