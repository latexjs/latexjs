docker rm $(docker ps -q -f status=exited)
docker rmi $(docker images -f "dangling=true" -q)