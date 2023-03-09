FROM elixir:1.12.1 as build
ENV ERL_AFLAGS "-proto_dist inet6_tcp"
ENV MIX_ENV=prod

RUN apt-get update

RUN apt-get install build-essential git -y

RUN mix local.hex --force && \
    mix local.rebar --force

WORKDIR /build

COPY . .

RUN mix deps.get && \
    mix deps.compile


RUN mix phx.digest

RUN mix release

FROM elixir:1.12.1
ARG BUILD_REL=amps

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

ENV ERLPORT_PYTHON=/usr/bin/python3



CMD ["./amps/bin/amps", "start"]