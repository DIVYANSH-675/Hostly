FROM --platform=linux/amd64 ubuntu:20.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages including AWS CLI and jq for JSON processing
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    unzip \
    jq \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# --------------------------------------------------
# Install fnm (Fast Node Manager)
# --------------------------------------------------
RUN curl -fsSL https://fnm.vercel.app/install | bash

# Add fnm to PATH (default install location is $HOME/.fnm)
ENV PATH=/root/.fnm:$PATH

# --------------------------------------------------
# Setup Git
# --------------------------------------------------
RUN git config --global user.email "divyanshgupta0704@gmail.com"
RUN git config --global user.name "Hostly Build Runner"


WORKDIR /builder
# --------------------------------------------------
# Copy and set up the bash script to run
# --------------------------------------------------
COPY build.sh .
COPY inject-config.js /app/inject-config.js
RUN chmod +x build.sh

# Use ENTRYPOINT instead of CMD
ENTRYPOINT ["./build.sh"]
