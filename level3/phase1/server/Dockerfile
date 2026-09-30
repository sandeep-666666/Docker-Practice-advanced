FROM node

WORKDIR /app
# copy all the files that starts with name package
COPY package*.json .
RUN npm install
# copy all the files with their original name in the workdirectory here that is app
COPY . .   


CMD [ "node", "index.js" ]
