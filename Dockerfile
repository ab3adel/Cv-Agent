FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Command runs at container runtime, not build
CMD ["npm", "run", "start:dev"]
