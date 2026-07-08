FROM node:20-alpine

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of source
COPY tsconfig.json ./
COPY src ./src
COPY examples ./examples

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
