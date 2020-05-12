sudo amazon-linux-extras enable nginx1
sudo amazon-linux-extras install nginx1

sudo systemctl enable nginx
sudo systemctl start nginx

sudo amazon-linux-extras install php7.2
sudo yum install php-mysqlnd php-mbstring php-pear php-fpm php-mcrypt php-gd php-opcache php-pecl-apcu-bc

sudo systemctl enable php-fpm
sudo systemctl start php-fpm

wget $WORDPRESS_URL

sudo mkdir /code
sudo mv latest.tar.gz /code

cd /code

sudo tar -xf latest.tar.gz

wget $NGINX_CONFIG_URL
sed 's+$SERVER_NAME+'$DOMAIN'+g' nginx.conf >> default.conf
mv default.conf /etc/nginx/conf.d/default.conf

sudo chmod -R 777 /code