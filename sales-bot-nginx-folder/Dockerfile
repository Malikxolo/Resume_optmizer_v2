FROM nginx:1.27-alpine

LABEL org.opencontainers.image.source="https://github.com/Malikxolo/sales-bot-platform"

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directory for ACME challenges (Let's Encrypt / Certbot)
RUN mkdir -p /var/www/certbot

EXPOSE 80 443
