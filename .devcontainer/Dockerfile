FROM python:3.11.9-slim-bookworm

# Set custom bash prompt
RUN echo "PS1='ZenML Quickstart$ '" >> /root/.bashrc

RUN pip install --no-cache-dir "zenml[server]==0.62.0"
RUN pip install --no-cache-dir pyarrow 
RUN zenml integration install sklearn -y

