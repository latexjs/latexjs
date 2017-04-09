FROM latexjs/pdftex.js
RUN apt-get install nginx -y
COPY nginx.conf /etc/nginx/sites-enabled/default
RUN service nginx start
EXPOSE 80
