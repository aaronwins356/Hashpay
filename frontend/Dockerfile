FROM node:20-bullseye

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . ./

ENV EXPO_DEV_SERVER_PORT=8081
EXPOSE 8081

CMD ["npm", "run", "start", "--", "--tunnel"]
