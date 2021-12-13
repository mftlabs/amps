FROM elixir:1.12.1 as build

ENV MIX_ENV=prod

WORKDIR /build
RUN apt-get update

RUN apt-get install build-essential git -y
RUN apt-get install python
RUN mix local.hex --force && \
    mix local.rebar --force

COPY mix.exs mix.lock config/ ./
COPY apps/amps/mix.exs ./apps/amps/
COPY apps/amps_web/mix.exs ./apps/amps_web/
COPY apps/amps_portal/mix.exs ./apps/amps_portal/
COPY apps/proxy/mix.exs ./apps/proxy/


RUN mix deps.get --only prod && \
    mix deps.compile

COPY . .

RUN mix release

FROM elixir:1.12.1

# RUN addgroup -S release && \
#     adduser -S -G release release && \
#     mkdir /release && \
#     chown -R release: /release

# WORKDIR /release

COPY --from=build /build/_build/prod/rel/amps .
# --chown=release:release 
# USER release
# EXPOSE 4000

CMD ["bin/amps", "start"]