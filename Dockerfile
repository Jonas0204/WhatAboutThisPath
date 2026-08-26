# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite inlines these into the client bundle at build time (see .env.example);
# both are meant to be public (a domain-restricted API key, and a password
# *hash*, not the password itself) — same as the GitHub Pages build.
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html/WhatAboutThisPath
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
