defmodule Amps.SSLEndpoint do
  use Plug.Builder

  def call(conn, opts) do
    IO.inspect(conn)
    SiteEncrypt.AcmeChallenge.call(conn, :svc_host)
  end
end
