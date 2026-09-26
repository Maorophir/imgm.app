FROM node:22-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

EXPOSE 5173

# Start Vite development server, exposed to the Docker network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
