FROM python:3.11.9-slim-bookworm

# Set custom bash prompt
RUN echo "PS1='ZenML Quickstart$ '" >> /root/.bashrc

# Install git (dev only)
RUN apt-get -y update
RUN apt-get -y install git

# Install node (dev only)
RUN apt-get -y install nodejs
RUN apt-get -y install npm

# Install ZenML
RUN pip install --no-cache-dir zenml
RUN zenml integration install sklearn -y
