FROM latexjs/latexjs
RUN apt-get install nginx -y && \
    ln -s /app/texlive /app/thinfs && \
    gzip -9vk ./apps/* thinfs_db.json
COPY nginx.conf /etc/nginx/sites-enabled/default
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
