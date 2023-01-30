# build
FROM node:lts-alpine as build-stage
ARG sentry_token
ARG environment=production
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV SENTRY_AUTH_TOKEN=$sentry_token
RUN npm run build

# production
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
