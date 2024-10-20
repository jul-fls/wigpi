# Use the official Node.js 20 image as a parent image
FROM node:20-alpine
LABEL org.opencontainers.image.description "The main image for the backend of the wigpi project"
# Set the working directory
WORKDIR /app

# Copy the application files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Tell Docker about the port we'll run on.
EXPOSE 3000

# Command to run the server
CMD [ "node", "api/wigpi_api.js" ]
