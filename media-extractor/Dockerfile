FROM node:22-bookworm-slim

# Install Python 3 and yt-dlp dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg wget curl && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Ensure /tmp exists and is writable
RUN mkdir -p /tmp && chmod 777 /tmp

# Add cookies.txt
COPY cookies.txt /usr/src/app/cookies.txt

EXPOSE 8080
CMD [ "node", "server.js" ]
