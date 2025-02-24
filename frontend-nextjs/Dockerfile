FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies with npm
RUN npm install

# Copy the rest of the frontend files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["npm", "start"]