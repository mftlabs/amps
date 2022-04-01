FROM rockmagicnet/sencha-cmd:6.6.0 as ui-build
WORKDIR /build
COPY . .
RUN cd apps/amps_portal/priv/static/amps && sencha app build development
RUN cd apps/amps_web/priv/static/frontend && sencha app build development

FROM elixir:1.12.1 as build
COPY --from=ui-build /build ./build
ENV MIX_ENV=prod

WORKDIR /build
RUN apt-get update

RUN apt-get install build-essential git npm -y

RUN mix local.hex --force && \
    mix local.rebar --force

RUN mix deps.get --only prod && \
    mix deps.compile

RUN cd apps/amps_web/assets && npm install

RUN cd apps/amps_web/assets && node build.js --deploy


RUN mix esbuild amps_portal --minify

RUN mix phx.digest

RUN mix release

FROM elixir:1.12.1
RUN apt-get update
RUN apt-get install python3 python3-pip -y


RUN pip3 install python-jsonrpc-server python-lsp-server tornado "python-lsp-server[all]" "python-lsp-server[yapf]"

ENV ERLPORT_PYTHON=/usr/bin/python3



# RUN addgroup -S release && \
#     adduser -S -G release release && \
#     mkdir /release && \
#     chown -R release: /release

# WORKDIR /release

COPY --from=build /build/_build/prod/rel/amps ./amps
# --chown=release:release 
# USER release
# EXPOSE 4000

CMD ["./amps/bin/amps", "start"]