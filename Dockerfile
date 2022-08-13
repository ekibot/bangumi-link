FROM node:lts

WORKDIR /app

COPY package.json /app/
COPY *.js /app/
COPY vars/*.json /app/vars/
COPY *.sh /app/

RUN git clone --depth 1 https://github.com/ekibot/bangumi-link.git data
RUN npm i

ENTRYPOINT ["node", 'extract.js']
