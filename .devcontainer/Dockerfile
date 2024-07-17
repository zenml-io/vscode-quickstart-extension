FROM python:3.11.9-slim-bookworm

# Set custom bash prompt
RUN echo "PS1='ZenML$ '" >> /root/.bashrc

# Install git (dev only)
RUN apt-get -y update
RUN apt-get -y install git

# Install ZenML
RUN pip install --no-cache-dir zenml
RUN zenml integration install sklearn -y
