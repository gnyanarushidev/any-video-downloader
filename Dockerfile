FROM ubuntu:latest 

WORKDIR /app 


RUN apt update && apt upgrade 
RUN snap install yt-dlp  

