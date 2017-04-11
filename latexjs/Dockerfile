FROM latexjs/pdftex.js
RUN apt-get install nginx -y
COPY nginx.conf /etc/nginx/sites-enabled/default
RUN ln -s /app/texlive /app/thinfs
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
