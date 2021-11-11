FROM vault:latest

COPY ./config/vault.json /vault/config

EXPOSE 8200

ENTRYPOINT ["vault", "server", "-config=/vault/config/vault.json"]  