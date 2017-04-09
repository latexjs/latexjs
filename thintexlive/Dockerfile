FROM latexjs/texlive
COPY build_raw_stats.js build_thinfs_db.py /app/
RUN mkdir /app/build_thinfs_db/ && \
    cd /app/build_thinfs_db && mv ../build_raw_stats.js ../build_thinfs_db.py . && \
    npm install glob && node build_raw_stats.js && python build_thinfs_db.py && \
    cd /app/ && mv ./build_thinfs_db/thinfs_db.json . && rm -rf ./build_thinfs_db
