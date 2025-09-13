# STAGE 1: Build the React application
FROM node:22-slim AS build

WORKDIR /app

# Copy package.json and yarn.lock
COPY package*.json ./

# Install dependencies using Yarn
RUN yarn install

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN yarn build

# STAGE 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the built static files from the build stage to the Nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

