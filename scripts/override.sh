#!/bin/bash
# This file is used to override the default docker-compose for SELinux distros

cp docker-compose.yml docker-compose.override.yml

sed -i 's/:ro/:ro,Z/g' docker-compose.override.yml
