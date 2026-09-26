FROM node:22-alpine

# Install OpenSSL (Required for Prisma engines on Alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Generate the Prisma client
RUN npx prisma generate

EXPOSE 5000

# Start the development server (nodemon)
CMD ["npm", "run", "dev"]
