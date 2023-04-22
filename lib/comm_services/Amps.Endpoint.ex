defmodule Amps.Endpoint do
  use Plug.Builder

  defmacro __using__([router, args, id]) do
    quote do
      use Plug.Builder
      plug(SiteEncrypt.AcmeChallenge, unquote(id))
      plug(unquote(router), opts: unquote(args))

      def init(opts) do
        IO.inspect("ENDPOINT")
        IO.inspect(opts)

        case Keyword.get(opts, :scheme, :http) do
          :https ->
            # Enable SSL/TLS for HTTPS
            keyfile = Keyword.get_values(opts, :keyfile) |> List.first()
            certfile = Keyword.get_values(opts, :certfile) |> List.first()
            ssl_opts = [keyfile: keyfile, certfile: certfile]

            opts = Plug.SSL.init(ssl_opts)
            IO.inspect(opts)
            opts |> super()

          _ ->
            super(opts)
        end
      end
    end
  end
end
