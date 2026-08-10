FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_BOT_USERNAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME
RUN npm run build
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
