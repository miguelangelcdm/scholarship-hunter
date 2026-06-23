FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite port
EXPOSE 8080

# Run Vite in dev mode, exposing host
CMD ["npm", "run", "dev", "--", "--host"]
