ARG NODE_IMAGE=your-artifactory.example.com/docker-virtual/node:20-alpine
ARG NGINX_IMAGE=your-artifactory.example.com/docker-virtual/nginx:1.27-alpine
ARG NPM_REGISTRY=https://your-artifactory.example.com/artifactory/api/npm/npm/

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm config set registry ${NPM_REGISTRY}
RUN npm ci
COPY . .
RUN npm run build

FROM ${NGINX_IMAGE}
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
