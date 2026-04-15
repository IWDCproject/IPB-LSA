FROM directus/directus:11.17.2

USER root
RUN apk add --no-cache python3 py3-setuptools build-base
RUN corepack enable && corepack prepare pnpm@8.9.0 --activate

USER node
ENV HOME=/home/node

# Install package langsung pada node modules
RUN pnpm install directus-extension-schema-sync

COPY ./schema-sync ./schema-sync