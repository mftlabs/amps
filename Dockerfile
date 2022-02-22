FROM elixir:1.12.1 as build

ENV MIX_ENV=prod

WORKDIR /build
RUN apt-get update

RUN apt-get install build-essential git -y

RUN mix local.hex --force && \
    mix local.rebar --force

COPY mix.exs mix.lock config/ ./
COPY apps ./apps


RUN mix deps.get --only prod && \
    mix deps.compile

COPY . .

RUN mix release

FROM elixir:1.12.1

ARG BUILD_ENV=prod
ARG BUILD_REL=amps
## Configure environment

RUN apt-get install python

ENV RELEASE_DISTRIBUTION="name"

# This value should be overriden at runtime
ENV RELEASE_IP="127.0.0.1"

# This will be the basename of our node
ENV RELEASE_NAME="${BUILD_REL}"

# This will be the full nodename
ENV RELEASE_NODE="${RELEASE_NAME}@${RELEASE_IP}"

# RUN addgroup -S release && \
#     adduser -S -G release release && \
#     mkdir /release && \
#     chown -R release: /release

# WORKDIR /release




COPY --from=build /build/_build/${BUILD_ENV}/rel/${BUILD_REL} ./amps
# --chown=release:release 
# USER release
# EXPOSE 4000

CMD ["./amps/bin/amps", "start"]