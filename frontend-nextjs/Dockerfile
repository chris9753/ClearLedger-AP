FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies with npm
RUN npm install

# Copy the rest of the frontend files
COPY . .

# API URL is baked in at build time (override in CI via build-arg)
ARG NEXT_PUBLIC_MAIN_API_URL=https://clearledger-ap-production.up.railway.app
ENV NEXT_PUBLIC_MAIN_API_URL=$NEXT_PUBLIC_MAIN_API_URL

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["npm", "start"]