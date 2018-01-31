apt-get install iperf iperf3
cat "/usr/bin/iperf3 -sD" >> /etc/rc.local
cat "/usr/bin/iperf -sD" >> /etc/rc.local
