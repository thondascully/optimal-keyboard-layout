FROM node:22-alpine as base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base as dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM base as builder
COPY . .
RUN npm run build


FROM nginx:alpine as prod
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]