# Stage 1: Build dependencies
FROM node:20-alpine AS build
LABEL org.opencontainers.image.description "The main image for the backend of the wigpi project"

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Stage 2: Runtime
FROM node:20-alpine AS runtime

# Set the working directory
WORKDIR /app

# Install tzdata for timezone management
RUN apk add --no-cache tzdata

# Copy node_modules and application code from the build stage
COPY --from=build /app /app

# Expose the port your app runs on
EXPOSE 3000

# Command to run the server
CMD [ "node", "api/wigpi_api.js" ]
