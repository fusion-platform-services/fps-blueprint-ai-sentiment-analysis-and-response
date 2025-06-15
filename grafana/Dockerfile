FROM grafana/grafana-oss:latest

USER root
RUN apk add --no-cache gettext
COPY docker-entrypoint.sh /etc/grafana/docker-entrypoint.sh
COPY datasources /etc/grafana/datasources/
COPY dashboards /etc/grafana/dashboards/

ENTRYPOINT ["/etc/grafana/docker-entrypoint.sh"]