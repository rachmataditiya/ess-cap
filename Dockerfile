FROM node:latest

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Fix xdg-open error
RUN apt-get update && apt-get install -y xdg-utils

EXPOSE 4173

CMD ["npm", "run", "preview"]
