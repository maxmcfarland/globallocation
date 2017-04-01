# Dockerfile
FROM gcr.io/google_appengine/nodejs

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Set environment variables
ENV appDir /var/www/app

# Set the work directory
RUN mkdir -p /var/www/app
WORKDIR ${appDir}

# Add our package.json and install *before* adding our application files
ADD package.json ./
RUN npm i --production

# Install pm2 so we can run our application
RUN npm i -g pm2

# Add application files
ADD . /var/www/app

#Expose the port
EXPOSE 3000

CMD ["pm2", "start", "app.js", "--no-daemon"]\

# voila!
