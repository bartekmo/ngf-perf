apt-get -y install iperf iperf3
echo "/usr/bin/iperf3 -sD" >> /etc/rc.local
echo "/usr/bin/iperf -sD" >> /etc/rc.local
