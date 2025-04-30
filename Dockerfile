FROM rockmagicnet/sencha-cmd:6.6.0 as ui-build
WORKDIR /build
COPY . .
RUN cd apps/amps_portal/priv/static/amps && sencha app build development
RUN cd apps/amps_web/priv/static/frontend && sencha app build development


FROM node:10.9-alpine as node-build
COPY --from=ui-build /build ./build

WORKDIR /build

RUN cd apps/amps_web/assets && npm install

RUN cd apps/amps_web/assets && node build.js --deploy



FROM elixir:1.12.1 as build
ENV MIX_ENV=prod

RUN apt-get update

RUN apt-get install build-essential git -y

RUN mix local.hex --force && \
    mix local.rebar --force
COPY --from=node-build /build ./build

WORKDIR /build

RUN mix deps.get --only prod && \
    mix deps.compile

RUN mix esbuild amps_portal --minify

RUN mix phx.digest

RUN mix release

FROM elixir:1.12.1
RUN apt-get update
RUN apt-get install python3 python3-pip certbot -y

RUN mkdir /.local
RUN mkdir /.cache
RUN mkdir /.config

RUN mkdir /amps
RUN mkdir -p /amps/data/tmp
RUN mkdir -p /amps/data/modules
COPY --from=build /build/_build/prod/rel/amps /amps/amps 
RUN chgrp -R 0 /amps && \
    chmod -R g=u /amps
RUN chgrp -R 0 /.local && \
    chmod -R g=u /.local
RUN chgrp -R 0 /.cache && \
    chmod -R g=u /.cache
RUN chgrp -R 0 /.config && \
    chmod -R g=u /.config
WORKDIR /amps

ENV PYTHONUSERBASE=/.local

ENV ERLPORT_PYTHON=/amps/py3/bin/python3

CMD ["./amps/bin/amps", "start"]