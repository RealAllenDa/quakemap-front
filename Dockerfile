# build
FROM node:lts-alpine as build-stage
ARG sentry_token
ARG environment=production
WORKDIR /app
COPY package*.json ./
RUN npm install --sentrycli_cdnurl=https://npmmirror.com/mirrors/sentry-cli
COPY . .
ENV SENTRY_AUTH_TOKEN=$sentry_token
RUN npm run build
RUN npm run delete-maps

# production
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
