apt-get install nodejs
wget -q -P /root https://raw.githubusercontent.com/bartekmo/ngf-perf/master/c.js
echo "nodejs /root/c.js &" >> /etc/rc.local
