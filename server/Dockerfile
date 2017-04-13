FROM latexjs/latexjs
RUN apt-get install nginx gettext-base -y && \
    ln -s /app/texlive /app/thinfs && \
    gzip -9vk ./apps/* thinfs_db.json
COPY nginx.conf /etc/nginx/.latexjs.template

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
	&& ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80 443

CMD ["/bin/bash", "-c", "envsubst < /etc/nginx/.latexjs.template > /etc/nginx/sites-enabled/default && nginx -g 'daemon off;'"]
