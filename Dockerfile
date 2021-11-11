FROM elixir:1.12.1-alpine as build

ENV MIX_ENV=prod

WORKDIR /build

RUN apk add --no-cache build-base git && \
    mix local.hex --force && \
    mix local.rebar --force

COPY mix.exs mix.lock config/ ./
COPY apps/amps/mix.exs ./apps/amps/
COPY apps/amps_web/mix.exs ./apps/amps_web/

RUN mix deps.get --only prod && \
    mix deps.compile

COPY . .

RUN mix release

FROM elixir:1.12.1-alpine

# RUN addgroup -S release && \
#     adduser -S -G release release && \
#     mkdir /release && \
#     chown -R release: /release

WORKDIR /release

COPY --from=build /build/_build/prod/rel/amps .
# --chown=release:release 
USER release
EXPOSE 4000

CMD ["bin/amps", "start"]