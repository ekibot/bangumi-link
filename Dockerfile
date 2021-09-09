FROM node:lts

WORKDIR /app

COPY package.json /app/package.json
COPY *.js /app/

RUN npm i

ENTRYPOINT ["node", "spider"]
