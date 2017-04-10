FROM latexjs/pdftex.js
RUN apt-get install nginx -y
COPY nginx.conf /etc/nginx/sites-enabled/default
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
