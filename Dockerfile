FROM node:lts

WORKDIR /app

COPY package.json /app/
COPY *.js /app/
COPY vars/*.json /app/vars/
COPY *.sh /app/

ENTRYPOINT ["./run.sh"]
