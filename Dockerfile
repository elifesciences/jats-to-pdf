FROM cokoapps/pagedjs:2.0.7
WORKDIR /usr/src/app
COPY package.json .
RUN npm install --production --loglevel notice --no-audit
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]