# Stage 1: Build dependencies
FROM node:20-alpine AS build
LABEL org.opencontainers.image.description "The main image for the backend of the wigpi project"

# Set the working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy specific directories and files
COPY api/ ./api/
COPY config/ ./config/
COPY discord_webhook/ ./discord_webhook/
COPY libs/ ./libs/
COPY template.html ./
COPY main.js ./
COPY testcompare.js ./

# Create necessary output directories and install tzdata for timezone management
RUN mkdir -p output/icsFiles output/jsonFiles output/pngFiles output/lockFiles output/htmlFiles logs && \
	apk add --no-cache tzdata

# Tell Docker about the port we'll run on
EXPOSE 3000

RUN ls -R /app

# Command to run the server
CMD [ "node", "api/wigpi_api.js" ]
