# NanaImg.net - The Image Server

[NanaImg main site](https://nanaimg.net)

The image server for NanaImg is located at img.nanaimg.net. The reason the two servers are split up is that it makes updating NanaImg much easier. Whenever I update the site, I turn off the main server and replace it with a server that serves "NanaImg is under maintenance" pages to everyone who tries to visit the site. I then remove the entire NanaImg directory, then use git clone to pull the updated version from my Github, npm install, etc etc. If the servers were not separate, this would mean that I would have to make a backup of all the images every time I wanted to update the site, and it would make updating the site very time-consuming. In addition, it would mean that every webpage on the internet that has a direct link to an image on NanaImg would have a broken image link. Therefore, I have this separate server which exists only to serve and save images, and will hopefully never have to be disturbed. 
