FROM directus/directus:11.17.2

USER root
RUN apk add --no-cache python3 py3-setuptools build-base

USER node
ENV HOME=/home/node

COPY ./schema-sync ./schema-sync